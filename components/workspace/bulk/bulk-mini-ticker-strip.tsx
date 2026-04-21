"use client";

import { useMarketUniverse } from "@/hooks/use-market-universe";
import { formatPrice, formatPercent, getPercentChange } from "@/core/market/format";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useLiveMarketTickers } from "@/hooks/use-live-market-tickers";
import { cn } from "@/lib/utils";

const WATCH: string[] = ["SOL-USD", "ETH-USD", "BTC-USD"];

export function BulkMiniTickerStrip() {
  const { data } = useMarketUniverse();
  const activeProductId = useWorkspaceStore((state) => state.activeProductId);
  const setActiveProductId = useWorkspaceStore((state) => state.setActiveProductId);
  const liveTickers = useLiveMarketTickers(WATCH);

  if (!data) return <div className="h-7 border-b border-[var(--line)] bg-[var(--panel)]" />;

  return (
    <div className="flex h-7 items-center gap-4 overflow-x-auto border-b border-[var(--line)] bg-[var(--panel)] px-3 text-[10px]">
      {WATCH.map((id) => {
        const market = data.find((m) => m.id === id);
        if (!market) return null;
        const live = liveTickers[id];
        const price = live?.price ?? market.current_price ?? 0;
        const change = getPercentChange({
          price,
          open24h:
            typeof market.price_change_percentage_24h === "number" && price
              ? price / (1 + market.price_change_percentage_24h / 100)
              : price,
        });
        const changeClass =
          typeof change === "number"
            ? change >= 0
              ? "text-[var(--positive)]"
              : "text-[var(--negative)]"
            : "text-foreground/40";
        const isActive = activeProductId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveProductId(id)}
            className={cn(
              "inline-flex items-center gap-1 transition",
              isActive
                ? "text-foreground"
                : "text-foreground/70 hover:text-foreground/90"
            )}
          >
            <span className="font-medium">{market.symbol}-USD</span>
            <span className="tabular-nums text-foreground/55">{formatPrice(price)}</span>
            <span className={cn("tabular-nums", changeClass)}>{formatPercent(change)}</span>
          </button>
        );
      })}
    </div>
  );
}
