import { formatPrice } from "@/core/market/format";
import { getApproxLiquidationPrice } from "@/core/paper/leverage";
import { getPositionUnrealizedPnlAtPrice } from "@/core/paper/metrics";
import { PaperPosition } from "@/core/paper/types";

export function PositionChartOverlay({
  symbol,
  position,
  currentPrice,
}: {
  symbol: string;
  position: PaperPosition | null;
  currentPrice: number;
}) {
  if (!position || currentPrice <= 0) {
    return null;
  }

  const unrealizedPnl = getPositionUnrealizedPnlAtPrice(position, currentPrice);
  const liquidationPrice = getApproxLiquidationPrice({
    direction: position.direction,
    entryPrice: position.entryPrice,
    leverage: position.leverage,
  });
  const pnlTone = unrealizedPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]";
  const isDraft = position.id.startsWith("draft:");

  return (
    <div className="pointer-events-none absolute left-3 top-3 border border-black/8 bg-background px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-black/74">
        {isDraft ? "Preview · " : ""}
        {position.direction === "short" ? "Short" : "Long"} {symbol}
      </p>
      <div className="mt-1 space-y-0.5 text-[10px] leading-4 text-black/54">
        <div className="flex items-center gap-2">
          <span>Lev</span>
          <span className="tabular-nums text-black/74">{position.leverage}x</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Entry</span>
          <span className="tabular-nums text-black/74">{formatPrice(position.entryPrice)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Current</span>
          <span className="tabular-nums text-black/74">{formatPrice(currentPrice)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>PnL</span>
          <span className={["tabular-nums", pnlTone].join(" ")}>
            {unrealizedPnl >= 0 ? "+" : ""}
            {formatPrice(unrealizedPnl)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>SL</span>
          <span className="tabular-nums text-black/74">{formatPrice(position.stopLoss ?? undefined)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>TP</span>
          <span className="tabular-nums text-black/74">{formatPrice(position.takeProfit ?? undefined)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Liq</span>
          <span className="tabular-nums text-black/74">{formatPrice(liquidationPrice ?? undefined)}</span>
        </div>
      </div>
    </div>
  );
}
