"use client";

import { PenSquare } from "lucide-react";
import { AiThread } from "@/core/ai/types";
import { useAiStore } from "@/stores/ai-store";

type Props = {
  open: boolean;
  threads: AiThread[];
  currentThreadId: string | null;
  onSelect: (threadId: string) => void;
  onCreate: () => void;
};

export function WorkspaceAiThreadHistory({
  open,
  threads,
  currentThreadId,
  onSelect,
  onCreate,
}: Props) {
  const insights = useAiStore((state) => state.insights);

  if (!open) {
    return null;
  }

  const threadRows = threads.map((thread) => {
    const latestInsight = insights
      .filter((item) => item.threadId === thread.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

    return {
      thread,
      userPreview: latestInsight?.prompt ?? null,
      assistantPreview: latestInsight?.content?.trim() || thread.lastMessagePreview || null,
    };
  });

  return (
    <div className="absolute right-3 top-11 z-20 flex max-h-[min(420px,calc(100vh-120px))] w-[320px] flex-col overflow-hidden border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="flex shrink-0 items-center justify-between border-b border-black/8 px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-black/34">Threads</p>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-6 items-center gap-1 text-[10px] font-medium text-black/66 transition hover:text-black/86"
        >
          <PenSquare className="h-3.5 w-3.5" />
          New
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {threadRows.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-black/40">No threads yet.</p>
        ) : (
          threadRows.map(({ thread, userPreview, assistantPreview }) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelect(thread.id)}
              className={[
                "block w-full border-b border-black/6 px-3 py-2 text-left transition last:border-b-0 hover:bg-black/[0.02]",
                currentThreadId === thread.id ? "bg-black/[0.03]" : "",
              ].join(" ")}
            >
              <p className="truncate text-[11px] font-medium text-black/82">{thread.title}</p>
              {userPreview ? (
                <p className="mt-1 truncate text-[10px] leading-4 text-black/54">
                  <span className="text-black/34">You:</span> {userPreview}
                </p>
              ) : null}
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-black/42">
                <span className="text-black/34">Lyra:</span> {assistantPreview ?? "No messages yet."}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
