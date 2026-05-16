"use client";

import { useMemo } from "react";
import type { SignalAlert } from "@/core/signal/signal-types";
import {
  formatUsd,
  severityBucket,
  severityDot,
  signalSymbol,
  timeAgo,
} from "@/components/signal/signal-format";
import { cn } from "@/lib/utils";

type Props = {
  alerts: SignalAlert[];
};

/**
 * Two parallel ribbons — fresh token prints vs. size/surge — so the desk can
 * scan categories side-by-side without one horizontal scrollbar dump.
 */
export function SignalLivePreview({ alerts }: Props) {
  const { launches, heavyFlow } = useMemo(() => {
    const launches = alerts
      .filter((a) => a.event.action === "create" || a.primaryRule === "new_launch")
      .slice(0, 12);
    const heavyFlow = alerts
      .filter(
        (a) =>
          a.primaryRule === "large_wallet_usd" ||
          a.primaryRule === "whale_move" ||
          a.primaryRule === "volume_acceleration" ||
          a.primaryRule === "trending_breakout" ||
          a.primaryRule === "momentum_spike" ||
          a.primaryRule === "top_gainer" ||
          a.primaryRule === "bonding_migration" ||
          a.event.action === "migrate",
      )
      .slice(0, 12);
    return { launches, heavyFlow };
  }, [alerts]);

  return (
    <div className="grid grid-cols-1 border-b border-[var(--line)] bg-[var(--panel)] md:grid-cols-2">
      <PreviewColumn
        eyebrow="Launches"
        hint="New pool on pump.fun"
        items={launches}
        empty="Waiting for a create…"
      />
      <PreviewColumn
        eyebrow="Size & flow"
        hint="Whales, surges, migrations"
        items={heavyFlow}
        empty="Waiting for size / surge…"
        className="md:border-l md:border-[var(--line)]"
      />
    </div>
  );
}

function PreviewColumn({
  eyebrow,
  hint,
  items,
  empty,
  className,
}: {
  eyebrow: string;
  hint: string;
  items: SignalAlert[];
  empty: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[52px] flex-col px-3 py-2", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-foreground/40">
            {eyebrow}
          </p>
          <p className="text-[10px] text-foreground/35">{hint}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-foreground/30">{empty}</p>
      ) : (
        <div className="flex max-h-[68px] flex-wrap gap-x-3 gap-y-1 overflow-y-auto text-[10px] leading-tight">
          {items.map((alert) => {
            const sym =
              signalSymbol(alert)?.toUpperCase() ??
              alert.event.token.slice(0, 5);
            const usd =
              alert.event.sizeUsd >= 400 ? formatUsd(alert.event.sizeUsd) : null;
            const sev = severityBucket(alert);
            return (
              <span
                key={alert.id}
                className="inline-flex max-w-[200px] items-center gap-1 truncate font-mono tabular-nums text-foreground/75"
                title={alert.sentence}
              >
                <span
                  className={cn(
                    "h-1 w-1 shrink-0 rounded-full",
                    severityDot(sev),
                  )}
                />
                <span className="text-foreground/45">{timeAgo(alert.createdAt)}</span>
                <span className="font-sans font-medium text-foreground/90">{sym}</span>
                <span className="uppercase text-foreground/40">{alert.event.action}</span>
                {usd ? <span className="text-foreground/55">{usd}</span> : null}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
