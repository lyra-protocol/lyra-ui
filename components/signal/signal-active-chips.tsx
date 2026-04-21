"use client";

import { X } from "lucide-react";
import { useSignalFiltersStore } from "@/stores/signal-filters-store";
import { cn } from "@/lib/utils";

const RULE_LABEL: Record<string, string> = {
  large_wallet_usd: "Whale",
  early_buy_index: "Early buy",
  volume_acceleration: "Volume",
};

const SOURCE_LABEL: Record<string, string> = {
  pump: "pump.fun",
  dexscreener: "dexscreener",
  gmgn: "gmgn",
};

export function SignalActiveChips() {
  const filters = useSignalFiltersStore();
  const hasAny =
    filters.rules.length ||
    filters.actions.length ||
    filters.sources.length ||
    filters.minUsd > 0 ||
    filters.query.trim();

  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-[11px]">
      <span className="text-foreground/45">Active:</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {filters.rules.map((rule) => (
          <Chip
            key={rule}
            label={RULE_LABEL[rule] ?? rule}
            onRemove={() => filters.toggleRule(rule)}
          />
        ))}
        {filters.actions.map((action) => (
          <Chip
            key={action}
            label={action.charAt(0).toUpperCase() + action.slice(1)}
            onRemove={() => filters.toggleAction(action)}
          />
        ))}
        {filters.sources.map((source) => (
          <Chip
            key={source}
            label={SOURCE_LABEL[source] ?? source}
            onRemove={() => filters.toggleSource(source)}
          />
        ))}
        {filters.minUsd > 0 ? (
          <Chip
            label={`≥ $${filters.minUsd.toLocaleString()}`}
            onRemove={() => filters.setMinUsd(0)}
          />
        ) : null}
        {filters.query.trim() ? (
          <Chip
            label={`“${filters.query.trim()}”`}
            onRemove={() => filters.setQuery("")}
          />
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => filters.reset()}
        className="ml-auto text-[10px] text-foreground/45 transition hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[4px] border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-yellow-300"
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-yellow-300/70 transition hover:text-yellow-200"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
