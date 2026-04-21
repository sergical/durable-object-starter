import { Plus, Trash2, MessageSquare } from "lucide-react";
import type { Conversation } from "../lib/api";
import { cn } from "../lib/utils";

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
		<div className="flex h-full flex-col gap-1 p-2">
			<button
				onClick={onCreate}
				className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-violet-500 hover:bg-violet-500/10 hover:text-violet-200"
			>
				<Plus className="h-4 w-4" />
				New chat
			</button>

			<div className="mt-2 flex-1 overflow-y-auto">
				{loading && (
					<div className="px-3 py-2 text-xs text-zinc-500">Loading…</div>
				)}
				{!loading && conversations.length === 0 && (
					<div className="px-3 py-4 text-center text-xs text-zinc-500">
						No conversations yet
					</div>
				)}
				{conversations.map((c) => (
					<div
						key={c.id}
						className={cn(
							"group mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
							activeId === c.id
								? "bg-violet-500/15 text-violet-200"
								: "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
						)}
					>
						<button
							onClick={() => onSelect(c.id)}
							className="flex min-w-0 flex-1 items-center gap-2 text-left"
						>
							<MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
							<span className="truncate">{c.title}</span>
						</button>
						<button
							onClick={() => {
								if (confirm("Delete this conversation?")) onDelete(c.id);
							}}
							className="flex-shrink-0 rounded p-1 text-zinc-600 opacity-0 transition hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
							title="Delete"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
