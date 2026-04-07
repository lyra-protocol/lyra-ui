import { getApproxLiquidationPrice } from "@/core/paper/leverage";
import { formatPrice } from "@/core/market/format";

function Metric({
  label,
  value,
  tone = "text-black/84",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="bg-background px-2 py-1">
      <p className={["text-[10px] font-medium tabular-nums", tone].join(" ")}>{value}</p>
      <p className="mt-0.5 text-[7px] uppercase tracking-[0.12em] text-black/28">{label}</p>
    </div>
  );
}

export function PaperPositionSummary({
  direction,
  leverage,
  marginUsed,
  effectiveNotional,
  quantity,
  entryPrice,
  currentPrice,
  unrealizedPnl,
  stopLoss,
  takeProfit,
}: {
  direction: "long" | "short";
  leverage: number;
  marginUsed: number;
  effectiveNotional: number;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  stopLoss: number | null;
  takeProfit: number | null;
}) {
  const liquidationPrice = getApproxLiquidationPrice({
    direction,
    entryPrice,
    leverage,
  });

  return (
    <div className="border-y border-black/6">
      <div className="grid grid-cols-2 gap-px bg-black/6">
        <div className="bg-background px-2 py-2">
          <p className="text-[8px] uppercase tracking-[0.12em] text-black/30">Live PnL</p>
          <p
            className={[
              "mt-1 text-[18px] font-semibold tabular-nums",
              unrealizedPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]",
            ].join(" ")}
          >
            {unrealizedPnl >= 0 ? "+" : ""}
            {formatPrice(unrealizedPnl)}
          </p>
        </div>
        <div className="bg-background px-2 py-2">
          <p className="text-[8px] uppercase tracking-[0.12em] text-black/30">Mark / Entry</p>
          <p className="mt-1 text-[14px] font-semibold tabular-nums text-black/84">{formatPrice(currentPrice)}</p>
          <p className="mt-0.5 text-[10px] text-black/42">Entry {formatPrice(entryPrice)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-px bg-black/6">
        <Metric label="Leverage" value={`${leverage}x`} />
        <Metric label="Margin used" value={formatPrice(marginUsed)} />
        <Metric label="Exposure" value={formatPrice(effectiveNotional)} />
        <Metric label="Size" value={quantity.toFixed(6).replace(/\.?0+$/, "")} />
        <Metric label="Approx. liq" value={formatPrice(liquidationPrice ?? undefined)} />
        <Metric label="Current" value={formatPrice(currentPrice)} />
        <Metric label="Stop" value={formatPrice(stopLoss ?? undefined)} />
        <Metric label="Take" value={formatPrice(takeProfit ?? undefined)} />
      </div>
    </div>
  );
}
