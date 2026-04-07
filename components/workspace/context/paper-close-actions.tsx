"use client";

import { PaperTradePreview } from "@/components/workspace/context/paper-trade-preview";
import { formatPrice } from "@/core/market/format";
import { PaperPositionDirection } from "@/core/paper/types";

type CloseFraction = 0.25 | 0.5 | 1;

const REDUCE_OPTIONS: Array<{ label: string; value: Exclude<CloseFraction, 1> }> = [
  { label: "Close 25%", value: 0.25 },
  { label: "Close 50%", value: 0.5 },
];

function getCloseQuantity(quantity: number, fraction: CloseFraction) {
  return Number((quantity * fraction).toFixed(8));
}

function formatQuantity(value: number) {
  if (value <= 0) {
    return "--";
  }
  return value.toFixed(6).replace(/\.?0+$/, "");
}

export function PaperCloseActions({
  direction,
  entryPrice,
  marginUsed,
  quantity,
  symbol,
  price,
  isPending,
  onConfirm,
  className,
}: {
  direction: PaperPositionDirection;
  entryPrice: number;
  marginUsed: number;
  quantity: number;
  symbol: string;
  price: number;
  isPending: boolean;
  onConfirm: (quantity: number, fraction: CloseFraction) => void;
  className?: string;
}) {
  const exitQuantity = getCloseQuantity(quantity, 1);
  const releasedMargin = quantity > 0 ? marginUsed * (exitQuantity / quantity) : 0;
  const realizedPnl =
    direction === "short" ? (entryPrice - price) * exitQuantity : (price - entryPrice) * exitQuantity;
  const estimatedCashRelease = releasedMargin + realizedPnl;

  return (
    <div className={className ?? "mt-2 border-t border-black/6 pt-1.5"}>
      <div className="flex items-center justify-between gap-2 pb-1">
        <p className="text-[9px] uppercase tracking-[0.14em] text-black/28">Reduce or exit</p>
        <span className="text-[10px] text-black/40">Close directly from here</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {REDUCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={isPending || getCloseQuantity(quantity, option.value) <= 0}
            onClick={() => onConfirm(getCloseQuantity(quantity, option.value), option.value)}
            className="flex h-8 w-full items-center justify-center whitespace-nowrap border border-black/10 px-3 text-[10px] font-medium text-black/82 transition hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:border-black/8 disabled:bg-transparent disabled:text-black/28"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="pt-1.5">
        <PaperTradePreview
          items={[
            { label: "Exit size", value: `${formatQuantity(exitQuantity)} ${symbol}` },
            { label: "Est. cash release", value: formatPrice(estimatedCashRelease) },
            { label: "Execution", value: "Market · paper" },
          ]}
        />
        <button
          type="button"
          disabled={isPending || quantity <= 0}
          onClick={() => onConfirm(exitQuantity, 1)}
          className="mt-1.5 flex h-8 w-full items-center justify-center whitespace-nowrap border border-black/10 bg-black px-3 text-[10px] font-medium text-white transition hover:bg-black/88 disabled:cursor-not-allowed disabled:border-black/8 disabled:bg-black/20 disabled:text-white/60"
        >
          Close all
        </button>
      </div>
    </div>
  );
}
