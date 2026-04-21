"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/core/market/format";
import { useWorkspaceStore } from "@/stores/workspace-store";

type Row = { price: number; size: number; total: number };

// Placeholder depth generator: recomputes on each tick so the orderbook feels
// alive while a real L2 feed is not yet wired up.
function buildLevels(mid: number, side: "bids" | "asks", seed: number) {
  if (!mid || mid <= 0) return [] as Row[];
  const rows: Row[] = [];
  let running = 0;
  const step = Math.max(0.5, mid * 0.00002);
  for (let i = 0; i < 14; i++) {
    const price = side === "asks" ? mid + (i + 1) * step : mid - (i + 1) * step;
    const noise = Math.sin((i + 1) * (seed * 0.001 + 0.37)) * 0.5 + 1;
    const size = Math.round(8_000 + noise * 60_000);
    running += size;
    rows.push({ price, size, total: running });
  }
  return rows;
}

export function BulkOrderbook() {
  const { activeMarketSnapshot, activeProductId } = useWorkspaceStore();
  const mid = activeMarketSnapshot?.price ?? 0;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 1200);
    return () => clearInterval(interval);
  }, []);

  const asks = useMemo(() => buildLevels(mid, "asks", tick).reverse(), [mid, tick]);
  const bids = useMemo(() => buildLevels(mid, "bids", tick), [mid, tick]);
  const maxTotal = useMemo(
    () => Math.max(1, ...[...asks, ...bids].map((r) => r.total)),
    [asks, bids]
  );

  return (
    <section className="flex h-full min-h-0 w-full flex-col border-x border-[var(--line)] bg-[var(--panel)]">
      <div className="flex h-8 items-center gap-4 border-b border-[var(--line)] px-2 text-[11px]">
        <button className="font-medium text-foreground/90">Order Book</button>
        <button className="text-foreground/45 hover:text-foreground/80">Trades</button>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-foreground/55">
          <span>USD</span>
          <span>0.1</span>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-[var(--line)] px-2 py-1 text-[9px] uppercase tracking-wider text-foreground/40">
        <span>Price</span>
        <span className="text-right">Size (USD)</span>
        <span className="text-right">Sum (USD)</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-[10px]">
        <div className="flex flex-1 flex-col justify-end overflow-hidden">
          {asks.map((row, i) => (
            <div
              key={`a-${i}`}
              className="relative grid grid-cols-3 px-2 py-[2px] text-[var(--negative)]"
            >
              <div
                className="absolute inset-y-0 right-0 bg-[var(--negative)]/12"
                style={{ width: `${(row.total / maxTotal) * 100}%` }}
              />
              <span className="relative tabular-nums">{formatPrice(row.price)}</span>
              <span className="relative text-right tabular-nums text-foreground/70">
                {row.size.toLocaleString()}
              </span>
              <span className="relative text-right tabular-nums text-foreground/55">
                {row.total.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-y border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 text-[12px]">
          <span className="tabular-nums text-[var(--positive)]">
            {formatPrice(mid)} ↑
          </span>
          <span className="tabular-nums text-foreground/55">
            {activeProductId ? `Spread 0.00026%` : ""}
          </span>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          {bids.map((row, i) => (
            <div
              key={`b-${i}`}
              className="relative grid grid-cols-3 px-2 py-[2px] text-[var(--positive)]"
            >
              <div
                className="absolute inset-y-0 right-0 bg-[var(--positive)]/12"
                style={{ width: `${(row.total / maxTotal) * 100}%` }}
              />
              <span className="relative tabular-nums">{formatPrice(row.price)}</span>
              <span className="relative text-right tabular-nums text-foreground/70">
                {row.size.toLocaleString()}
              </span>
              <span className="relative text-right tabular-nums text-foreground/55">
                {row.total.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-5 border-t border-[var(--line)]">
        <div className="absolute inset-0 flex text-[10px]">
          <div className="flex h-full w-1/2 items-center justify-center bg-[var(--positive)]/15 text-[var(--positive)]">
            B 56.00%
          </div>
          <div className="flex h-full w-1/2 items-center justify-center bg-[var(--negative)]/15 text-[var(--negative)]">
            44.00% S
          </div>
        </div>
      </div>
    </section>
  );
}
