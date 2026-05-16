"use client";

import { cn } from "@/lib/utils";
import type { SignalFeedLane } from "@/stores/signal-filters-store";

const LANES: Array<{ id: SignalFeedLane; label: string; color: string; activeColor: string }> = [
  { id: "all",           label: "All",      color: "text-foreground/55",  activeColor: "bg-foreground text-background" },
  { id: "whales",        label: "Whales",   color: "text-amber-400/70",   activeColor: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
  { id: "launches",      label: "Launches", color: "text-blue-400/70",    activeColor: "bg-blue-400/15 text-blue-300 border-blue-400/30" },
  { id: "surge",         label: "Surge",    color: "text-fuchsia-400/70", activeColor: "bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30" },
  { id: "graduate",      label: "Graduated",color: "text-emerald-400/70", activeColor: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
  { id: "early_cluster", label: "Early",    color: "text-sky-400/70",     activeColor: "bg-sky-400/15 text-sky-300 border-sky-400/30" },
];

type Props = {
  active: SignalFeedLane;
  onChange: (lane: SignalFeedLane) => void;
};

export function SignalLaneTabs({ active, onChange }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {LANES.map((lane) => (
        <button
          key={lane.id}
          type="button"
          onClick={() => onChange(lane.id)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-0.5 text-[11px] font-medium transition",
            active === lane.id
              ? lane.activeColor
              : cn("border-transparent hover:bg-foreground/[0.05]", lane.color),
          )}
        >
          {lane.label}
        </button>
      ))}
    </div>
  );
}
