"use client";

import { Camera } from "lucide-react";
import { TIMEFRAMES } from "@/core/market/timeframes";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function BulkTimeframeBar() {
  const { activeTimeframe, setActiveTimeframe } = useWorkspaceStore();

  return (
    <div className="flex h-8 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-3 text-[10px]">
      <div className="flex items-center gap-3">
        <span className="text-foreground/40">1m</span>
        {TIMEFRAMES.map((timeframe) => {
          const active = activeTimeframe === timeframe.id;
          return (
            <button
              key={timeframe.id}
              type="button"
              onClick={() => setActiveTimeframe(timeframe.id)}
              className={`inline-flex h-6 items-center rounded-[4px] px-1.5 transition ${
                active
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "text-foreground/50 hover:bg-foreground/[0.05] hover:text-foreground/85"
              }`}
            >
              {timeframe.label}
            </button>
          );
        })}
        <span className="ml-3 text-foreground/40">Indicators</span>
        <span className="text-foreground/40">fx</span>
        <span className="text-foreground/40">Mark</span>
        <span className="rounded-[4px] bg-yellow-500/20 px-1.5 py-0.5 text-yellow-400">Oracle</span>
      </div>
      <div className="flex items-center gap-3 text-foreground/45">
        <span>Chart</span>
        <span>Depth</span>
        <span>Market Info</span>
        <Camera className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}
