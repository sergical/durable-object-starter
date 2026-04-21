import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
import { MessageSquareIcon } from "lucide-react";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import {
	PromptInput,
	PromptInputBody,
	PromptInputTextarea,
	PromptInputSubmit,
	PromptInputFooter,
	type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
	type ToolPart,
} from "@/components/ai-elements/tool";
import { Spinner } from "@/components/ui/spinner";
import { getMessages } from "@/lib/api";

type Props = {
	userId: string;
	conversationId: string;
};

export function Chat({ userId, conversationId }: Props) {
	const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

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
			<div className="flex h-full items-center justify-center">
				<Spinner />
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

	const isStreaming = status === "streaming" || status === "submitted";

	const handleSubmit = (message: PromptInputMessage) => {
		const text = message.text?.trim();
		if (!text || isStreaming) return;
		sendMessage({ text });
	};

	return (
		<div className="flex h-full flex-col">
			<Conversation>
				<ConversationContent className="mx-auto w-full max-w-3xl">
					{messages.length === 0 ? (
						<ConversationEmptyState
							icon={<MessageSquareIcon className="size-10" />}
							title="Start the conversation"
							description='Try: "Roll 2d20 and tell me the weather in Tokyo"'
						/>
					) : (
						messages.map((m) => <MessageView key={m.id} message={m} />)
					)}

					{error && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
							{error.message}
						</div>
					)}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			<div className="mx-auto w-full max-w-3xl p-4">
				<PromptInput onSubmit={handleSubmit}>
					<PromptInputBody>
						<PromptInputTextarea placeholder="Message Claude…" />
					</PromptInputBody>
					<PromptInputFooter>
						<div />
						<PromptInputSubmit status={status} />
					</PromptInputFooter>
				</PromptInput>
			</div>
		</div>
	);
}

function MessageView({ message }: { message: UIMessage }) {
	return (
		<Message from={message.role}>
			<MessageContent>
				{message.parts?.map((part, i) => {
					if (part.type === "text") {
						return <MessageResponse key={i}>{part.text}</MessageResponse>;
					}

					if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
						const toolPart = part as unknown as ToolPart;
						return (
							<Tool key={i} defaultOpen={false}>
								{toolPart.type === "dynamic-tool" ? (
									<ToolHeader
										type="dynamic-tool"
										state={toolPart.state}
										toolName={(toolPart as { toolName: string }).toolName}
									/>
								) : (
									<ToolHeader
										type={toolPart.type as `tool-${string}`}
										state={toolPart.state}
									/>
								)}
								<ToolContent>
									<ToolInput input={toolPart.input} />
									<ToolOutput
										output={
											toolPart.output !== undefined ? (
												<pre className="overflow-x-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
													{JSON.stringify(toolPart.output, null, 2)}
												</pre>
											) : undefined
										}
										errorText={toolPart.errorText}
									/>
								</ToolContent>
							</Tool>
						);
					}

					return null;
				})}
			</MessageContent>
		</Message>
	);
}
