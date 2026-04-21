"use client";

import {
  formatPercent,
  formatPrice,
  getPercentChange,
} from "@/core/market/format";
import { getDisplaySymbol } from "@/core/market/display";
import { WalletSessionButton } from "@/components/wallet/wallet-session-button";
import { TIMEFRAMES } from "@/core/market/timeframes";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function CenterContextBar() {
  const {
    activeProductId,
    activeTimeframe,
    activeMarketSnapshot,
    setActiveTimeframe,
    setFocusedRegion,
  } = useWorkspaceStore();

  const percentChange = getPercentChange(activeMarketSnapshot);
  const percentClass =
    typeof percentChange === "number"
      ? percentChange >= 0
        ? "text-[var(--positive)]"
        : "text-[var(--negative)]"
      : "text-foreground/45";

  return (
    <div className="flex min-h-10 items-stretch border-b border-[var(--line)] bg-[var(--panel)]">
      <div className="flex min-w-0 flex-1 items-center gap-2 border-r border-[var(--line)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-[12px] font-semibold tracking-tight text-foreground/92">
            {activeProductId ? getDisplaySymbol(activeProductId) : "Loading…"}
          </p>
          <p className="text-[11px] text-foreground/70">{formatPrice(activeMarketSnapshot?.price)}</p>
          <p className={["text-[10px]", percentClass].join(" ")}>{formatPercent(percentChange)}</p>
        </div>

        <div className="hidden h-4 w-px bg-[var(--line)] lg:block" />

        <div className="hidden h-full items-end gap-2 lg:flex">
          {TIMEFRAMES.map((timeframe) => {
            const active = activeTimeframe === timeframe.id;
            return (
              <button
                key={timeframe.id}
                type="button"
                onClick={() => {
                  setActiveTimeframe(timeframe.id);
                  setFocusedRegion("canvas");
                }}
                className={[
                  "h-7 border-b px-0 pb-1 text-[10px] font-medium transition",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-foreground/40 hover:text-foreground/82",
                ].join(" ")}
              >
                {timeframe.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-0">
        <WalletSessionButton />
      </div>
    </div>
  );
}
