"use client";

import { useMemo } from "react";
import { formatPrice } from "@/core/market/format";
import { usePaperTrades } from "@/hooks/use-paper-trades";
import { useWorkspaceStore } from "@/stores/workspace-store";

const PNL_EPSILON = 0.00005;

function formatQuantity(value: number) {
  return value.toFixed(4).replace(/\.?0+$/, "");
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRealizedPnl(value: number, action: "open" | "increase" | "close") {
  if (action === "open") {
    return { label: "Opened", tone: "text-black/46" };
  }

  if (action === "increase") {
    return { label: "Added", tone: "text-black/46" };
  }

  if (Math.abs(value) < PNL_EPSILON) {
    return { label: "Flat", tone: "text-black/48" };
  }

  return {
    label: `${value > 0 ? "+" : ""}${formatPrice(value)}`,
    tone: value > 0 ? "text-emerald-700" : "text-red-700",
  };
}

export function WorkspaceTradesPanel() {
  const trades = usePaperTrades();
  const setActiveProductId = useWorkspaceStore((state) => state.setActiveProductId);
  const recentTrades = useMemo(() => trades.slice(0, 24), [trades]);
  const realizedTotal = useMemo(
    () => recentTrades.reduce((sum, trade) => sum + trade.realizedPnl, 0),
    [recentTrades]
  );
  const tradedMarkets = useMemo(
    () => new Set(recentTrades.map((trade) => trade.productId)).size,
    [recentTrades]
  );
  const realizedSummary =
    Math.abs(realizedTotal) < PNL_EPSILON
      ? { label: "Flat", tone: "text-black/48" }
      : {
          label: `${realizedTotal >= 0 ? "+" : ""}${formatPrice(realizedTotal)}`,
          tone: realizedTotal >= 0 ? "text-emerald-700" : "text-red-700",
        };

  if (trades.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-black/38">
        No trades yet.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-3 border-b border-black/8">
        <div className="px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.12em] text-black/32">Trades</p>
          <p className="mt-1 text-[13px] font-medium text-black/84">{recentTrades.length}</p>
        </div>
        <div className="border-l border-black/6 px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.12em] text-black/32">Markets</p>
          <p className="mt-1 text-[13px] font-medium text-black/84">{tradedMarkets}</p>
        </div>
        <div className="border-l border-black/6 px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.12em] text-black/32">Realized</p>
          <p
            className={[
              "mt-1 text-[13px] font-medium",
              realizedSummary.tone,
            ].join(" ")}
          >
            {realizedSummary.label}
          </p>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-[1fr_0.8fr_0.9fr_0.9fr_0.9fr_0.7fr] border-b border-black/8 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-black/32">
        <span>Market</span>
        <span>Action</span>
        <span>Qty</span>
        <span>Price</span>
        <span className="text-right">Result</span>
        <span className="text-right">Time</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {recentTrades.map((trade) => {
          const pnl = formatRealizedPnl(trade.realizedPnl, trade.action);
          return (
            <button
              key={trade.id}
              type="button"
              onClick={() => setActiveProductId(trade.productId)}
              className="grid w-full grid-cols-[1fr_0.8fr_0.9fr_0.9fr_0.9fr_0.7fr] items-center border-b border-black/6 px-3 py-2 text-left transition hover:bg-black/[0.02]"
            >
              <span className="truncate text-[12px] font-medium text-black/84">{trade.symbol}</span>
              <span className="text-[11px] uppercase text-black/60">{trade.action}</span>
              <span className="text-[11px] text-black/72">{formatQuantity(trade.quantity)}</span>
              <span className="text-[11px] text-black/72">{formatPrice(trade.price)}</span>
              <span className={["text-right text-[11px] font-medium", pnl.tone].join(" ")}>{pnl.label}</span>
              <span className="text-right text-[10px] text-black/40">{formatTimestamp(trade.executedAt)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
