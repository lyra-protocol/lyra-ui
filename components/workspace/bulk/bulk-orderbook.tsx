"use client";

import { useMemo } from "react";
import { formatPrice } from "@/core/market/format";
import { useWorkspaceStore } from "@/stores/workspace-store";

type Row = { price: number; size: number; total: number };

// Placeholder generator so the panel renders with plausible data until an
// orderbook feed is wired in. Matches the BULK-style 3-column layout.
function buildLevels(mid: number, side: "bids" | "asks") {
  if (!mid || mid <= 0) return [] as Row[];
  const rows: Row[] = [];
  let running = 0;
  for (let i = 0; i < 12; i++) {
    const price =
      side === "asks" ? mid + (i + 1) * Math.max(0.5, mid * 0.00002) : mid - (i + 1) * Math.max(0.5, mid * 0.00002);
    const size = Math.round(10_000 + Math.random() * 60_000);
    running += size;
    rows.push({ price, size, total: running });
  }
  return rows;
}

export function BulkOrderbook() {
  const { activeMarketSnapshot, activeProductId } = useWorkspaceStore();
  const mid = activeMarketSnapshot?.price ?? 0;
  const asks = useMemo(() => buildLevels(mid, "asks").reverse(), [mid]);
  const bids = useMemo(() => buildLevels(mid, "bids"), [mid]);
  const maxTotal = useMemo(
    () => Math.max(1, ...[...asks, ...bids].map((r) => r.total)),
    [asks, bids]
  );

  return (
    <section className="flex h-full min-h-0 flex-col border-x border-[var(--line)] bg-[var(--panel)]">
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
                className="absolute inset-y-0 right-0 bg-[var(--negative)]/10"
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
                className="absolute inset-y-0 right-0 bg-[var(--positive)]/10"
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
