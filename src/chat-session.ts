import { DurableObject } from "cloudflare:workers";
import * as Sentry from "@sentry/cloudflare";
import {
	streamText,
	stepCountIs,
	convertToModelMessages,
	type UIMessage,
} from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { chatTools } from "./tools";

// Anthropic model — bump to `claude-sonnet-4-6` for stronger reasoning.
const MODEL_ID = "claude-haiku-4-5";

/**
 * One Durable Object per user. Owns that user's conversations + messages
 * in the DO's embedded SQLite storage. All AI SDK calls happen here.
 *
 * Exposes a standard `fetch(request)` handler (not RPC methods) so that
 * Sentry trace headers propagate naturally from the Worker.
 */
class ChatSessionClass extends DurableObject<Env> {
	private sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS conversations (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);
		`);
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS messages (
				id TEXT PRIMARY KEY,
				conversation_id TEXT NOT NULL,
				role TEXT NOT NULL,
				parts_json TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
			);
		`);
		this.sql.exec(
			`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);`,
		);
	}

	// -----------------------------------------------------------------------
	// Fetch handler — routes to the right internal method
	// URL convention: /conversations, /conversations/:id, /conversations/:id/messages, /chat
	// -----------------------------------------------------------------------
	override async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;
		const method = request.method;

		try {
			if (pathname === "/conversations" && method === "GET") {
				return json(this.listConversations());
			}
			if (pathname === "/conversations" && method === "POST") {
				const body = await safeJson<{ title?: string }>(request);
				return json(this.createConversation(body?.title));
			}

			const msgMatch = pathname.match(/^\/conversations\/([^/]+)\/messages$/);
			if (msgMatch && method === "GET") {
				return json(this.getMessages(msgMatch[1]!));
			}

			const delMatch = pathname.match(/^\/conversations\/([^/]+)$/);
			if (delMatch && method === "DELETE") {
				this.deleteConversation(delMatch[1]!);
				return json({ ok: true });
			}

			if (pathname === "/chat" && method === "POST") {
				const body = await safeJson<{
					conversationId?: string;
					messages?: UIMessage[];
				}>(request);
				if (!body?.conversationId || !Array.isArray(body.messages)) {
					return json(
						{ error: "conversationId and messages[] are required" },
						400,
					);
				}
				return this.chat(body.conversationId, body.messages);
			}

			return json({ error: "Not found" }, 404);
		} catch (err) {
			console.error("[ChatSession.fetch] error:", err);
			return json({ error: (err as Error).message }, 500);
		}
	}

	// -----------------------------------------------------------------------
	// Internal handlers
	// -----------------------------------------------------------------------

	private listConversations(): Array<{
		id: string;
		title: string;
		createdAt: number;
		updatedAt: number;
	}> {
		const rows = this.sql
			.exec(
				`SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC`,
			)
			.toArray();
		return rows.map((r) => ({
			id: r.id as string,
			title: r.title as string,
			createdAt: r.created_at as number,
			updatedAt: r.updated_at as number,
		}));
	}

	private createConversation(title?: string): {
		id: string;
		title: string;
		createdAt: number;
		updatedAt: number;
	} {
		const id = crypto.randomUUID();
		const now = Date.now();
		const finalTitle = title?.trim() || "New chat";
		this.sql.exec(
			`INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`,
			id,
			finalTitle,
			now,
			now,
		);
		return { id, title: finalTitle, createdAt: now, updatedAt: now };
	}

	private deleteConversation(id: string): void {
		this.sql.exec(`DELETE FROM messages WHERE conversation_id = ?`, id);
		this.sql.exec(`DELETE FROM conversations WHERE id = ?`, id);
	}

	private getMessages(conversationId: string): UIMessage[] {
		const rows = this.sql
			.exec(
				`SELECT id, role, parts_json FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
				conversationId,
			)
			.toArray();
		return rows.map((r) => ({
			id: r.id as string,
			role: r.role as UIMessage["role"],
			parts: JSON.parse(r.parts_json as string),
		}));
	}

	private conversationExists(id: string): boolean {
		const rows = this.sql
			.exec(`SELECT 1 FROM conversations WHERE id = ? LIMIT 1`, id)
			.toArray();
		return rows.length > 0;
	}

	private saveMessages(conversationId: string, messages: UIMessage[]): void {
		this.sql.exec(`DELETE FROM messages WHERE conversation_id = ?`, conversationId);
		const now = Date.now();
		for (let i = 0; i < messages.length; i++) {
			const m = messages[i]!;
			this.sql.exec(
				`INSERT INTO messages (id, conversation_id, role, parts_json, created_at) VALUES (?, ?, ?, ?, ?)`,
				m.id,
				conversationId,
				m.role,
				JSON.stringify(m.parts ?? []),
				now + i,
			);
		}
		this.sql.exec(
			`UPDATE conversations SET updated_at = ? WHERE id = ?`,
			now,
			conversationId,
		);

		const firstUser = messages.find((m) => m.role === "user");
		if (firstUser) {
			const text = extractText(firstUser).slice(0, 60).trim();
			if (text) {
				this.sql.exec(
					`UPDATE conversations SET title = ? WHERE id = ? AND title = 'New chat'`,
					text,
					conversationId,
				);
			}
		}
	}

	private async chat(
		conversationId: string,
		messages: UIMessage[],
	): Promise<Response> {
		if (!this.conversationExists(conversationId)) {
			return json({ error: "Conversation not found" }, 404);
		}

		Sentry.setConversationId(conversationId);

		const anthropic = createAnthropic({ apiKey: this.env.ANTHROPIC_API_KEY });

		const result = streamText({
			model: anthropic(MODEL_ID),
			system: `You are a helpful, witty assistant. You have access to several tools:
- get_weather: fetch mock weather data for any city
- get_current_time: get the current UTC time
- flip_coin: flip one or more coins
- roll_dice: roll dice with custom sides and count

Use tools proactively when the user's question can benefit from them. Be concise and friendly.`,
			messages: await convertToModelMessages(messages),
			tools: chatTools,
			stopWhen: stepCountIs(5),
			// Sentry Vercel AI integration — emits agent/tool/token spans.
			experimental_telemetry: {
				isEnabled: true,
				recordInputs: true,
				recordOutputs: true,
				functionId: "chat-session.chat",
				metadata: { conversationId },
			},
		});

		return result.toUIMessageStreamResponse({
			originalMessages: messages,
			onFinish: ({ messages: finalMessages }) => {
				try {
					this.saveMessages(conversationId, finalMessages as UIMessage[]);
				} catch (err) {
					console.error("Failed to persist messages:", err);
				}
			},
		});
	}
}

export const ChatSession = Sentry.instrumentDurableObjectWithSentry(
	(env: Env) => ({
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 1.0,
		sendDefaultPii: true,
		enabled: !!env.SENTRY_DSN,
		debug: true,
		integrations: [Sentry.vercelAIIntegration()],
	}),
	ChatSessionClass,
);

// ---------- helpers ----------

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

async function safeJson<T>(request: Request): Promise<T | null> {
	try {
		return (await request.json()) as T;
	} catch {
		return null;
	}
}

function extractText(message: UIMessage): string {
	if (!message.parts) return "";
	return message.parts
		.filter((p): p is { type: "text"; text: string } => p.type === "text")
		.map((p) => p.text)
		.join(" ");
}
