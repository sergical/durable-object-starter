import { ChatSession } from "./chat-session";
import { USERS, isValidUserId } from "./shared/users";
import type { UIMessage } from "ai";

export { ChatSession };

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: cors() });
		}

		// API routes
		if (url.pathname.startsWith("/api/")) {
			const res = await handleApi(request, env, url);
			// Add CORS (harmless in same-origin prod via assets, useful in vite dev)
			for (const [k, v] of Object.entries(cors())) {
				res.headers.set(k, v);
			}
			return res;
		}

		// Everything else → static assets (the built React app)
		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
	// GET /api/users → hardcoded user list
	if (url.pathname === "/api/users" && request.method === "GET") {
		return json(USERS);
	}

	// All other endpoints require a valid userId
	const userId = getUserId(request, url);
	if (!userId) {
		return json({ error: "Missing or invalid userId" }, 400);
	}
	const stub = env.CHAT_SESSION.getByName(userId);

	// GET /api/conversations
	if (url.pathname === "/api/conversations" && request.method === "GET") {
		return json(await stub.listConversations());
	}

	// POST /api/conversations
	if (url.pathname === "/api/conversations" && request.method === "POST") {
		const body = await safeJson<{ title?: string }>(request);
		return json(await stub.createConversation(body?.title));
	}

	// GET /api/conversations/:id/messages
	const msgMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
	if (msgMatch && request.method === "GET") {
		const conversationId = msgMatch[1]!;
		return json(await stub.getMessages(conversationId));
	}

	// DELETE /api/conversations/:id
	const delMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)$/);
	if (delMatch && request.method === "DELETE") {
		await stub.deleteConversation(delMatch[1]!);
		return json({ ok: true });
	}

	// POST /api/chat  { conversationId, messages }
	if (url.pathname === "/api/chat" && request.method === "POST") {
		const body = await safeJson<{ conversationId?: string; messages?: UIMessage[] }>(
			request,
		);
		if (!body?.conversationId || !Array.isArray(body.messages)) {
			return json(
				{ error: "conversationId and messages[] are required" },
				400,
			);
		}
		return stub.chat(body.conversationId, body.messages);
	}

	return json({ error: "Not found" }, 404);
}

// ---------- helpers ----------

function getUserId(request: Request, url: URL): string | null {
	const id =
		url.searchParams.get("userId") ??
		request.headers.get("x-user-id") ??
		"";
	return isValidUserId(id) ? id : null;
}

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

function cors(): Record<string, string> {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, x-user-id",
	};
}
