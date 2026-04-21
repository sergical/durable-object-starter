import { useCallback, useEffect, useState } from "react";
import { USERS, type User } from "@shared/users";
import { UserPicker } from "./components/UserPicker";
import { ConversationList } from "./components/ConversationList";
import { Chat } from "./components/Chat";
import {
	createConversation,
	deleteConversation,
	listConversations,
	type Conversation,
} from "./lib/api";

const USER_KEY = "chat.selectedUserId";
const CONV_KEY = (userId: string) => `chat.selectedConversationId:${userId}`;

export function App() {
	const [user, setUser] = useState<User>(() => {
		const saved = localStorage.getItem(USER_KEY);
		return USERS.find((u) => u.id === saved) ?? USERS[0]!;
	});

	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [loadingList, setLoadingList] = useState(false);

	const refresh = useCallback(async () => {
		setLoadingList(true);
		try {
			const list = await listConversations(user.id);
			setConversations(list);
			return list;
		} finally {
			setLoadingList(false);
		}
	}, [user.id]);

	// Load conversations when user changes; restore last-selected conversation for that user.
	useEffect(() => {
		localStorage.setItem(USER_KEY, user.id);
		(async () => {
			const list = await refresh();
			const savedId = localStorage.getItem(CONV_KEY(user.id));
			const next = list.find((c) => c.id === savedId)?.id ?? list[0]?.id ?? null;
			setActiveId(next);
		})();
	}, [user.id, refresh]);

	// Persist active conversation id per user
	useEffect(() => {
		if (activeId) localStorage.setItem(CONV_KEY(user.id), activeId);
	}, [activeId, user.id]);

	const handleCreate = useCallback(async () => {
		const c = await createConversation(user.id);
		setConversations((prev) => [c, ...prev]);
		setActiveId(c.id);
	}, [user.id]);

	const handleDelete = useCallback(
		async (id: string) => {
			await deleteConversation(user.id, id);
			setConversations((prev) => prev.filter((c) => c.id !== id));
			if (activeId === id) {
				setActiveId((prev) => {
					const remaining = conversations.filter((c) => c.id !== id);
					return remaining[0]?.id ?? null;
				});
			}
		},
		[user.id, activeId, conversations],
	);

	return (
		<div className="flex h-dvh flex-col bg-zinc-950">
			{/* Top bar */}
			<header className="flex items-center justify-between border-b border-zinc-900 px-5 py-3">
				<div className="flex items-center gap-3">
					<div className="text-lg font-semibold">Claude Chat</div>
					<span className="rounded-full border border-violet-500/60 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300">
						claude-3-5-haiku
					</span>
				</div>
				<UserPicker selectedUserId={user.id} onSelect={setUser} />
			</header>

			{/* Main */}
			<div className="flex flex-1 overflow-hidden">
				<aside className="w-64 flex-shrink-0 border-r border-zinc-900 bg-zinc-950">
					<div className="border-b border-zinc-900 px-3 py-2 text-xs uppercase tracking-wide text-zinc-500">
						{user.emoji} {user.name}'s chats
					</div>
					<ConversationList
						conversations={conversations}
						activeId={activeId}
						onSelect={setActiveId}
						onCreate={handleCreate}
						onDelete={handleDelete}
						loading={loadingList}
					/>
				</aside>

				<main className="flex-1 overflow-hidden">
					{activeId ? (
						<Chat userId={user.id} conversationId={activeId} />
					) : (
						<div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
							<div className="text-4xl">💭</div>
							<div className="text-sm">No conversation selected</div>
							<button
								onClick={handleCreate}
								className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-violet-500 hover:text-violet-200"
							>
								Start a new chat
							</button>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
