"use client";

import { PaperBalanceSlider } from "@/components/workspace/context/paper-balance-slider";
import { PaperLevelInput } from "@/components/workspace/context/paper-level-input";
import { PaperTradePreview } from "@/components/workspace/context/paper-trade-preview";
import { formatPrice } from "@/core/market/format";

function formatQuantity(value: number | null) {
  if (!value || value <= 0) {
    return "--";
  }
  return value.toFixed(6).replace(/\.?0+$/, "");
}

export function PaperPositionAddPanel({
  symbol,
  leverage,
  availableBalance,
  notional,
  onNotionalChange,
  preview,
  disabled,
  onSubmit,
}: {
  symbol: string;
  leverage: number;
  availableBalance: number;
  notional: string;
  onNotionalChange: (value: string) => void;
  preview: {
    estimatedAdditionalMargin: number | null;
    estimatedAdditionalNotional: number | null;
    estimatedAdditionalQuantity: number | null;
    estimatedNewMarginUsed: number | null;
    estimatedNewNotional: number | null;
    estimatedNewQuantity: number | null;
    estimatedAverageEntry: number | null;
    estimatedLiquidationPrice: number | null;
  };
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="pt-2">
      <PaperLevelInput label="Add margin" value={notional} onChange={onNotionalChange} suffix="USDT" />
      <PaperBalanceSlider
        availableBalance={availableBalance}
        notional={Number(notional.replace(/,/g, "")) || 0}
        onNotionalChange={onNotionalChange}
      />
      <PaperTradePreview
        variant="grid"
        items={[
          { label: "Added margin", value: formatPrice(preview.estimatedAdditionalMargin ?? undefined) },
          { label: "Leverage", value: `${leverage}x` },
          { label: "Estimated add", value: `${formatQuantity(preview.estimatedAdditionalQuantity)} ${symbol}` },
          { label: "Added exposure", value: formatPrice(preview.estimatedAdditionalNotional ?? undefined) },
          { label: "New margin", value: formatPrice(preview.estimatedNewMarginUsed ?? undefined) },
          { label: "New qty", value: `${formatQuantity(preview.estimatedNewQuantity)} ${symbol}` },
          { label: "New exposure", value: formatPrice(preview.estimatedNewNotional ?? undefined) },
          { label: "New avg entry", value: formatPrice(preview.estimatedAverageEntry ?? undefined) },
          { label: "Approx. liq", value: formatPrice(preview.estimatedLiquidationPrice ?? undefined) },
        ]}
      />
      <div className="mt-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={onSubmit}
          className="flex h-8 w-full items-center justify-center whitespace-nowrap border border-black/10 bg-black px-3 text-[10px] font-medium text-white transition hover:bg-black/88 disabled:cursor-not-allowed disabled:border-black/8 disabled:bg-black/20 disabled:text-white/60"
        >
          Add to position
        </button>
      </div>
    </div>
  );
}
