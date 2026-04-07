import { formatCompactNumber, formatPercent, formatPrice, getPercentChange } from "@/core/market/format";
import { MarketDirectoryItem, MarketTicker } from "@/core/market/types";
import { getApproxLiquidationPrice } from "@/core/paper/leverage";
import { getPositionUnrealizedPnlAtPrice } from "@/core/paper/metrics";
import { PaperPosition } from "@/core/paper/types";

export function SelectedMarketCard({
  market,
  snapshot,
  position,
}: {
  market: MarketDirectoryItem | null;
  snapshot: MarketTicker | null;
  position: PaperPosition | null;
}) {
  const change = getPercentChange(snapshot);
  const currentPrice = snapshot?.price ?? market?.current_price ?? null;
  const unrealizedPnl =
    position && currentPrice ? getPositionUnrealizedPnlAtPrice(position, currentPrice) : null;
  const liquidationPrice =
    position
      ? getApproxLiquidationPrice({
          direction: position.direction,
          entryPrice: position.entryPrice,
          leverage: position.leverage,
        })
      : null;

  return (
    <section className="border-b border-black/8">
      <div className="px-2 pb-1 pt-1.5">
        <p className="text-[9px] uppercase tracking-[0.14em] text-black/30">Market context</p>
      </div>
      <div className="px-2 pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] font-semibold tracking-tight text-black/92">{market?.symbol ?? "--"}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-black/36">
            {position ? (position.direction === "short" ? "Short" : "Long") : "Flat"}
          </p>
        </div>
        <p className="mt-0.5 text-[10px] text-black/50">{market?.name ?? "Loading market context"}</p>
      </div>
      <div className="grid grid-cols-3 gap-px border-y border-black/6 bg-black/6">
        <div className="bg-background px-2 py-1.5">
          <p className="text-[8px] uppercase tracking-[0.12em] text-black/30">Price</p>
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-black/84">
            {formatPrice(snapshot?.price ?? market?.current_price)}
          </p>
        </div>
        <div className="bg-background px-2 py-1.5">
          <p className="text-[8px] uppercase tracking-[0.12em] text-black/30">24h</p>
          <p
            className={[
              "mt-0.5 text-[11px] font-medium tabular-nums",
              typeof change === "number"
                ? change >= 0
                  ? "text-[var(--positive)]"
                  : "text-[var(--negative)]"
                : "text-black/84",
            ].join(" ")}
          >
            {formatPercent(change)}
          </p>
        </div>
        <div className="bg-background px-2 py-1.5">
          <p className="text-[8px] uppercase tracking-[0.12em] text-black/30">Volume</p>
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-black/84">
            {formatCompactNumber(market?.exchange_volume_24h ?? market?.total_volume ?? undefined)}
          </p>
        </div>
      </div>
      {position && currentPrice ? (
        <div className="border-t border-black/8 px-2 py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-black/30">Active position</p>
              <p className="mt-1 text-[13px] font-medium text-black/88">
                {position.direction === "short" ? "Short" : "Long"} {position.symbol} · {position.leverage}x
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.14em] text-black/30">Unrealized</p>
              <p
                className={[
                  "mt-1 text-[15px] font-semibold tabular-nums",
                  (unrealizedPnl ?? 0) >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]",
                ].join(" ")}
              >
                {(unrealizedPnl ?? 0) >= 0 ? "+" : ""}
                {formatPrice(unrealizedPnl ?? undefined)}
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-px border border-black/6 bg-black/6">
            <div className="bg-background px-2 py-1.5">
              <p className="text-[8px] uppercase tracking-[0.12em] text-black/30">Entry</p>
              <p className="mt-0.5 text-[11px] font-medium tabular-nums text-black/84">{formatPrice(position.entryPrice)}</p>
            </div>
            <div className="bg-background px-2 py-1.5">
              <p className="text-[8px] uppercase tracking-[0.12em] text-black/30">Mark</p>
              <p className="mt-0.5 text-[11px] font-medium tabular-nums text-black/84">{formatPrice(currentPrice)}</p>
            </div>
            <div className="bg-background px-2 py-1.5">
              <p className="text-[8px] uppercase tracking-[0.12em] text-black/30">Size</p>
              <p className="mt-0.5 text-[11px] font-medium tabular-nums text-black/84">
                {position.quantity.toFixed(4).replace(/\.?0+$/, "")}
              </p>
            </div>
            <div className="bg-background px-2 py-1.5">
              <p className="text-[8px] uppercase tracking-[0.12em] text-black/30">Liq</p>
              <p className="mt-0.5 text-[11px] font-medium tabular-nums text-black/84">
                {formatPrice(liquidationPrice ?? undefined)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
