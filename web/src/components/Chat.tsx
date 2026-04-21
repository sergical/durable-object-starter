import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Wrench, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { getMessages } from "../lib/api";

type Props = {
	userId: string;
	conversationId: string;
};

export function Chat({ userId, conversationId }: Props) {
	const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

	// Load history for this conversation
	useEffect(() => {
		let cancelled = false;
		setInitialMessages(null);
		getMessages(userId, conversationId).then((msgs) => {
			if (!cancelled) setInitialMessages(msgs as UIMessage[]);
		});
		return () => {
			cancelled = true;
		};
	}, [userId, conversationId]);

	if (!initialMessages) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-500">
				<Loader2 className="h-5 w-5 animate-spin" />
			</div>
		);
	}

	return (
		<ChatInner
			key={conversationId}
			userId={userId}
			conversationId={conversationId}
			initialMessages={initialMessages}
		/>
	);
}

function ChatInner({
	userId,
	conversationId,
	initialMessages,
}: {
	userId: string;
	conversationId: string;
	initialMessages: UIMessage[];
}) {
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: `/api/chat?userId=${encodeURIComponent(userId)}`,
				prepareSendMessagesRequest: ({ messages, body }) => ({
					body: { ...body, conversationId, messages },
				}),
			}),
		[userId, conversationId],
	);

	const { messages, sendMessage, status, error } = useChat({
		transport,
		messages: initialMessages,
	});

	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
	}, [messages]);

	const isStreaming = status === "streaming" || status === "submitted";

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const text = input.trim();
		if (!text || isStreaming) return;
		setInput("");
		sendMessage({ text });
	}

	return (
		<div className="flex h-full flex-col">
			<div ref={scrollRef} className="flex-1 overflow-y-auto">
				<div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-6">
					{messages.length === 0 && (
						<div className="mt-20 text-center text-sm text-zinc-500">
							<div className="mb-2 text-4xl">💬</div>
							Start the conversation. Try:{" "}
							<em className="text-zinc-400">
								"Roll 2d20 and tell me the weather in Tokyo"
							</em>
						</div>
					)}

					{messages.map((m) => (
						<MessageView key={m.id} message={m} />
					))}

					{error && (
						<div className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
							⚠️ {error.message}
						</div>
					)}
				</div>
			</div>

			<form
				onSubmit={handleSubmit}
				className="border-t border-zinc-900 bg-zinc-950 p-4"
			>
				<div className="mx-auto flex max-w-3xl items-end gap-2">
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSubmit(e);
							}
						}}
						placeholder="Message Claude…"
						rows={1}
						className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
					/>
					<button
						type="submit"
						disabled={!input.trim() || isStreaming}
						className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{isStreaming ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<ArrowUp className="h-4 w-4" />
						)}
					</button>
				</div>
			</form>
		</div>
	);
}

function MessageView({ message }: { message: UIMessage }) {
	const isUser = message.role === "user";
	return (
		<div
			className={cn(
				"flex flex-col gap-1.5",
				isUser ? "items-end" : "items-start",
			)}
		>
			<div className="px-1 text-[11px] uppercase tracking-wide text-zinc-500">
				{isUser ? "You" : "Claude"}
			</div>

			<div className={cn("flex max-w-[85%] flex-col gap-2", isUser && "items-end")}>
				{message.parts?.map((part, i) => {
					if (part.type === "text") {
						return (
							<div
								key={i}
								className={cn(
									"whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
									isUser
										? "bg-violet-500/20 text-violet-50 ring-1 ring-inset ring-violet-500/40"
										: "bg-zinc-900 text-zinc-100 ring-1 ring-inset ring-zinc-800",
								)}
							>
								{part.text}
							</div>
						);
					}

					// Tool calls: the UI message type names are `tool-${name}`
					if (part.type.startsWith("tool-")) {
						return <ToolCallView key={i} part={part as unknown as ToolPart} />;
					}

					return null;
				})}
			</div>
		</div>
	);
}

type ToolPart = {
	type: string;
	state?: "input-streaming" | "input-available" | "output-available" | "output-error";
	input?: unknown;
	output?: unknown;
	errorText?: string;
};

function ToolCallView({ part }: { part: ToolPart }) {
	const name = part.type.replace(/^tool-/, "");
	const done = part.state === "output-available";
	const failed = part.state === "output-error";

	return (
		<div className="rounded-lg border border-emerald-900/70 bg-emerald-950/30 px-3 py-2 text-xs">
			<div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-400">
				<Wrench className="h-3 w-3" />
				<span>{name}</span>
				{!done && !failed && (
					<Loader2 className="ml-1 h-3 w-3 animate-spin text-emerald-500" />
				)}
				{failed && <span className="text-red-400">· error</span>}
			</div>
			{part.input !== undefined && (
				<pre className="overflow-x-auto font-mono text-[11px] text-zinc-400">
					{JSON.stringify(part.input, null, 2)}
				</pre>
			)}
			{done && part.output !== undefined && (
				<pre className="mt-1 overflow-x-auto font-mono text-[11px] text-emerald-200">
					→ {JSON.stringify(part.output, null, 2)}
				</pre>
			)}
			{failed && part.errorText && (
				<div className="mt-1 text-red-300">{part.errorText}</div>
			)}
		</div>
	);
}
