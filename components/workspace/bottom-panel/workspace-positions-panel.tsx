"use client";

import { formatPrice } from "@/core/market/format";
import { getApproxLiquidationPrice } from "@/core/paper/leverage";
import { getPositionCurrentPrice, getPositionUnrealizedPnl } from "@/core/paper/metrics";
import { usePaperAccountSummary } from "@/hooks/use-paper-account-summary";
import { useWorkspaceStore } from "@/stores/workspace-store";

function formatQuantity(value: number) {
  return value.toFixed(4).replace(/\.?0+$/, "");
}

export function WorkspacePositionsPanel() {
  const { positions, markets } = usePaperAccountSummary();
  const setActiveProductId = useWorkspaceStore((state) => state.setActiveProductId);

  if (positions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-black/38">
        No open positions.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-[1.2fr_0.7fr_1fr_1fr_0.9fr] border-b border-black/8 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-black/32">
        <span>Market</span>
        <span>Side</span>
        <span>Risk</span>
        <span>Position</span>
        <span className="text-right">PnL</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {positions.map((position) => {
          const currentPrice = getPositionCurrentPrice(position, markets);
          const unrealizedPnl = getPositionUnrealizedPnl(position, markets);
          const liquidationPrice = getApproxLiquidationPrice({
            direction: position.direction,
            entryPrice: position.entryPrice,
            leverage: position.leverage,
          });

          return (
            <button
              key={position.id}
              type="button"
              onClick={() => setActiveProductId(position.productId)}
              className="grid w-full grid-cols-[1.2fr_0.7fr_1fr_1fr_0.9fr] items-center border-b border-black/6 px-3 py-2 text-left transition hover:bg-black/[0.02]"
            >
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-black/84">{position.symbol}</p>
                <p className="text-[10px] text-black/40">
                  Entry {formatPrice(position.entryPrice)} · Mark {formatPrice(currentPrice)}
                </p>
              </div>
              <span className="text-[11px] uppercase text-black/60">{position.direction} · {position.leverage}x</span>
              <div>
                <p className="text-[11px] text-black/72">Liq {formatPrice(liquidationPrice ?? undefined)}</p>
                <p className="text-[10px] text-black/40">Margin {formatPrice(position.marginUsed)}</p>
              </div>
              <div>
                <p className="text-[11px] text-black/72">{formatQuantity(position.quantity)} {position.symbol}</p>
                <p className="text-[10px] text-black/40">Exposure {formatPrice(position.marginUsed * position.leverage)}</p>
              </div>
              <div className="text-right">
                <span
                  className={[
                    "text-[13px] font-semibold tabular-nums",
                    unrealizedPnl >= 0 ? "text-emerald-700" : "text-red-700",
                  ].join(" ")}
                >
                  {unrealizedPnl >= 0 ? "+" : ""}
                  {formatPrice(unrealizedPnl)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
