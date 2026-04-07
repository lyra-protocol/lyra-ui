import { WorkspaceTimelineItem } from "@/hooks/use-workspace-timeline";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ActivityFeed({
  activity,
}: {
  activity: WorkspaceTimelineItem[];
}) {
  const items = activity.slice(0, 4);

  return (
    <section className="shrink-0 border-t border-black/6">
      <div className="px-2 pb-1 pt-2">
        <p className="text-[9px] uppercase tracking-[0.14em] text-black/30">Activity</p>
      </div>
      <div>
        {items.length === 0 ? (
          <p className="px-2 py-2.5 text-[10px] leading-4 text-black/44">
            No activity yet. Trades, system actions, and AI insights will appear here.
          </p>
        ) : (
          items.map((entry) => (
            <div key={entry.id} className="border-b border-black/6 px-2 py-1.5 last:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="text-[8px] uppercase tracking-[0.14em] text-black/30">
                    {entry.source === "ai" ? "AI" : "Log"}
                  </span>
                  <p className="truncate text-[10px] font-medium text-black/84">{entry.title}</p>
                </div>
                <p className="text-[9px] text-black/34">{formatTimestamp(entry.createdAt)}</p>
              </div>
              {entry.detail ? <p className="mt-0.5 text-[10px] leading-4 text-black/48">{entry.detail}</p> : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
