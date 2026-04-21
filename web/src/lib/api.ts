export type Conversation = {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
};

function url(path: string, userId: string): string {
	const u = new URL(path, window.location.origin);
	u.searchParams.set("userId", userId);
	return u.pathname + u.search;
}

export async function listConversations(userId: string): Promise<Conversation[]> {
	const res = await fetch(url("/api/conversations", userId));
	if (!res.ok) throw new Error("Failed to load conversations");
	return res.json();
}

export async function createConversation(userId: string): Promise<Conversation> {
	const res = await fetch(url("/api/conversations", userId), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({}),
	});
	if (!res.ok) throw new Error("Failed to create conversation");
	return res.json();
}

export async function deleteConversation(
	userId: string,
	conversationId: string,
): Promise<void> {
	const res = await fetch(url(`/api/conversations/${conversationId}`, userId), {
		method: "DELETE",
	});
	if (!res.ok) throw new Error("Failed to delete conversation");
}

export async function getMessages(
	userId: string,
	conversationId: string,
): Promise<unknown[]> {
	const res = await fetch(url(`/api/conversations/${conversationId}/messages`, userId));
	if (!res.ok) throw new Error("Failed to load messages");
	return res.json();
}
