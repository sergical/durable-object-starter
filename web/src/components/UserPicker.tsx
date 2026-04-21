import { CheckIcon, UserIcon } from "lucide-react";
import { USERS, type User } from "@shared/users";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Props = {
	selectedUserId: string;
	onSelect: (user: User) => void;
};

export function UserPicker({ selectedUserId, onSelect }: Props) {
	const current = USERS.find((u) => u.id === selectedUserId) ?? USERS[0]!;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<span className="text-base leading-none">{current.emoji}</span>
					<span>{current.name}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
					<UserIcon className="size-3" />
					Switch user
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{USERS.map((u) => (
					<DropdownMenuItem
						key={u.id}
						onSelect={() => onSelect(u)}
						className="gap-2"
					>
						<span className="text-base leading-none">{u.emoji}</span>
						<span className="flex-1">{u.name}</span>
						{u.id === selectedUserId && <CheckIcon className="size-4" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
