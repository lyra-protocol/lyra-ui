"use client";

import { useWorkspaceTimeline } from "@/hooks/use-workspace-timeline";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function WorkspaceActivityPanel() {
  const { timeline } = useWorkspaceTimeline();

  if (timeline.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-black/38">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-black/8 px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-black/32">Workspace timeline</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {timeline.slice(0, 20).map((entry) => (
          <article key={entry.id} className="border-b border-black/6 px-3 py-2 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[9px] uppercase tracking-[0.12em] text-black/32">
                  {entry.source === "ai" ? "AI" : "Log"}
                </span>
                <p className="truncate text-[12px] font-medium text-black/84">{entry.title}</p>
              </div>
              <span className="text-[10px] text-black/40">{formatTimestamp(entry.createdAt)}</span>
            </div>
            {entry.detail ? <p className="mt-1 text-[11px] leading-4 text-black/50">{entry.detail}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
