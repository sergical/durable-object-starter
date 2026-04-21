import { USERS, type User } from "@shared/users";
import { cn } from "../lib/utils";

type Props = {
	selectedUserId: string;
	onSelect: (user: User) => void;
};

export function UserPicker({ selectedUserId, onSelect }: Props) {
	return (
		<div className="flex items-center gap-1.5">
			{USERS.map((u) => (
				<button
					key={u.id}
					onClick={() => onSelect(u)}
					className={cn(
						"flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
						selectedUserId === u.id
							? "border-violet-500 bg-violet-500/15 text-violet-200"
							: "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
					)}
				>
					<span className="text-base leading-none">{u.emoji}</span>
					<span className="font-medium">{u.name}</span>
				</button>
			))}
		</div>
	);
}
