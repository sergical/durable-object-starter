import { PlusIcon, Trash2Icon } from "lucide-react";
import type { Conversation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
	conversations: Conversation[];
	activeId: string | null;
	onSelect: (id: string) => void;
	onCreate: () => void;
	onDelete: (id: string) => void;
	loading?: boolean;
};

export function ConversationList({
	conversations,
	activeId,
	onSelect,
	onCreate,
	onDelete,
	loading,
}: Props) {
	return (
		<div className="flex h-full flex-col">
			<div className="p-2">
				<Button
					onClick={onCreate}
					variant="outline"
					size="sm"
					className="w-full justify-start gap-2"
				>
					<PlusIcon className="size-4" />
					New chat
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto px-2 pb-2">
				{loading && (
					<div className="px-2 py-1 text-xs text-muted-foreground">Loading…</div>
				)}

				{!loading && conversations.length === 0 && (
					<div className="px-2 py-6 text-center text-xs text-muted-foreground">
						No conversations yet
					</div>
				)}

				<ul className="flex flex-col gap-0.5">
					{conversations.map((c) => {
						const active = activeId === c.id;
						return (
							<li key={c.id}>
								<div
									className={cn(
										"group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
										active
											? "bg-accent text-accent-foreground"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
									)}
								>
									<button
										onClick={() => onSelect(c.id)}
										className="flex-1 truncate text-left"
										title={c.title}
									>
										{c.title}
									</button>
									<button
										onClick={() => {
											if (confirm("Delete this conversation?")) onDelete(c.id);
										}}
										className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-background hover:text-destructive group-hover:opacity-100"
										title="Delete"
										aria-label="Delete conversation"
									>
										<Trash2Icon className="size-3.5" />
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
