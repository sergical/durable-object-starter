export type User = {
	id: string;
	name: string;
	emoji: string;
};

export const USERS: readonly User[] = [
	{ id: "alice", name: "Alice", emoji: "🦊" },
	{ id: "bob", name: "Bob", emoji: "🐻" },
	{ id: "charlie", name: "Charlie", emoji: "🐼" },
] as const;

export function isValidUserId(id: string): boolean {
	return USERS.some((u) => u.id === id);
}
