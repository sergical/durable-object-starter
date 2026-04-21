import { useCallback, useEffect, useState } from "react";
import { USERS, type User } from "@shared/users";
import { UserPicker } from "@/components/UserPicker";
import { ConversationList } from "@/components/ConversationList";
import { Chat } from "@/components/Chat";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	createConversation,
	deleteConversation,
	listConversations,
	type Conversation,
} from "@/lib/api";

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

	useEffect(() => {
		localStorage.setItem(USER_KEY, user.id);
		(async () => {
			const list = await refresh();
			const savedId = localStorage.getItem(CONV_KEY(user.id));
			const next = list.find((c) => c.id === savedId)?.id ?? list[0]?.id ?? null;
			setActiveId(next);
		})();
	}, [user.id, refresh]);

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
			setConversations((prev) => {
				const remaining = prev.filter((c) => c.id !== id);
				if (activeId === id) setActiveId(remaining[0]?.id ?? null);
				return remaining;
			});
		},
		[user.id, activeId],
	);

	return (
		<TooltipProvider>
			<div className="flex h-dvh flex-col">
				<header className="flex h-14 items-center justify-between border-b px-4">
					<div className="font-medium">Claude Chat</div>
					<UserPicker selectedUserId={user.id} onSelect={setUser} />
				</header>

				<div className="flex flex-1 overflow-hidden">
					<aside className="flex w-64 flex-col border-r">
						<div className="px-3 py-2 text-xs text-muted-foreground">
							{user.emoji} {user.name}
						</div>
						<Separator />
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
							<div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
								<div className="text-sm">No conversation selected</div>
								<Button onClick={handleCreate} variant="outline">
									Start a new chat
								</Button>
							</div>
						)}
					</main>
				</div>
			</div>
		</TooltipProvider>
	);
}
