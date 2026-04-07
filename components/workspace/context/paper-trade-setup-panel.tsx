"use client";

import { useEffect, useMemo, useState } from "react";
import { PaperBalanceSlider } from "@/components/workspace/context/paper-balance-slider";
import { PaperDirectionTabs } from "@/components/workspace/context/paper-direction-tabs";
import { PaperLeverageSelector } from "@/components/workspace/context/paper-leverage-selector";
import { PaperLevelInput } from "@/components/workspace/context/paper-level-input";
import { PaperTradeLevelField } from "@/components/workspace/context/paper-trade-level-field";
import { PaperTradePreview } from "@/components/workspace/context/paper-trade-preview";
import {
  isSupportedPaperLeverage,
  PAPER_LEVERAGE_DEFAULT,
} from "@/core/paper/leverage";
import {
  getTradeLevelValidationErrors,
  hasTradeLevelInputError,
  parseTradeLevelInput,
} from "@/core/paper/trade-levels";
import { PaperPositionDirection } from "@/core/paper/types";
import { getTradeSetupPreview } from "@/core/paper/trade-setup";
import { formatPrice } from "@/core/market/format";
import { usePaperTradeDraftSync } from "@/hooks/use-paper-trade-draft-sync";
import { usePaperTradeActions } from "@/hooks/use-paper-trade-actions";

const PRIMARY_ACTION_CLASS =
  "flex h-8 w-full items-center justify-center whitespace-nowrap border border-black/10 bg-black px-3 text-[10px] font-medium text-white transition hover:bg-black/88 disabled:cursor-not-allowed disabled:border-black/8 disabled:bg-black/20 disabled:text-white/60";

function parseNotional(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatQuantity(value: number | null) {
  if (!value || value <= 0) {
    return "--";
  }
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function formatRatio(value: number | null) {
  if (!value || value <= 0) {
    return "--";
  }
  return `${value.toFixed(2)}R`;
}

export function PaperTradeSetupPanel({
  symbol,
  productId,
  price,
  availableBalance,
  sliderMaxLeverage,
  executionMaxLeverage,
}: {
  symbol: string;
  productId: string;
  price: number;
  availableBalance: number;
  sliderMaxLeverage: number;
  executionMaxLeverage: number;
}) {
  const [direction, setDirection] = useState<PaperPositionDirection>("long");
  const [leverage, setLeverage] = useState(PAPER_LEVERAGE_DEFAULT);
  const [notional, setNotional] = useState("500");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const tradeMutation = usePaperTradeActions();
  const tradeMutationError = tradeMutation.error;
  const resetTradeMutation = tradeMutation.reset;
  const parsedNotional = useMemo(() => parseNotional(notional), [notional]);
  const parsedStopLoss = useMemo(() => parseTradeLevelInput(stopLoss), [stopLoss]);
  const parsedTakeProfit = useMemo(() => parseTradeLevelInput(takeProfit), [takeProfit]);
  const hasLevelError = hasTradeLevelInputError(stopLoss) || hasTradeLevelInputError(takeProfit);
  const levelValidationErrors = useMemo(
    () =>
      getTradeLevelValidationErrors({
        direction,
        referencePrice: price,
        stopLoss: parsedStopLoss,
        takeProfit: parsedTakeProfit,
        priceLabel: "current price",
      }),
    [direction, parsedStopLoss, parsedTakeProfit, price]
  );
  const preview = useMemo(
    () =>
      getTradeSetupPreview({
        direction,
        notional: parsedNotional,
        leverage,
        price,
        stopLoss: parsedStopLoss,
        takeProfit: parsedTakeProfit,
      }),
    [direction, leverage, parsedNotional, price, parsedStopLoss, parsedTakeProfit]
  );

  useEffect(() => {
    if (tradeMutationError) {
      resetTradeMutation();
    }
  }, [direction, leverage, notional, stopLoss, takeProfit, tradeMutationError, resetTradeMutation]);

  const canOpen = Boolean(
    productId &&
      price > 0 &&
      parsedNotional > 0 &&
      !levelValidationErrors.stopLoss &&
      !levelValidationErrors.takeProfit &&
      !hasLevelError &&
      isSupportedPaperLeverage(leverage, executionMaxLeverage)
  );
  const leverageCapabilityMessage =
    leverage > executionMaxLeverage
      ? `Paper execution is currently available up to ${executionMaxLeverage}x. You can still preview up to ${sliderMaxLeverage}x here.`
      : null;
  const statusMessage =
    tradeMutation.isPending
      ? `Opening ${direction} paper position…`
      : tradeMutationError instanceof Error
        ? tradeMutationError.message
        : hasLevelError
          ? "Stop loss and take profit must be valid prices."
          : leverageCapabilityMessage ??
            levelValidationErrors.stopLoss ??
            levelValidationErrors.takeProfit ??
            preview.validationMessage;

  usePaperTradeDraftSync({
    productId,
    symbol,
    mode: "setup",
    direction,
    leverage,
    marginUsed: preview.marginUsed,
    entryPrice: preview.estimatedExecutionPrice,
    quantity: preview.estimatedQuantity,
    stopLoss: parsedStopLoss,
    takeProfit: parsedTakeProfit,
  });

  return (
    <section className="flex h-full min-h-0 flex-col border-b border-black/8">
      <div className="px-2 py-1.5 text-[10px] text-black/52">
        <div className="flex items-center justify-between gap-2">
          <span>{symbol}</span>
          <span className="tabular-nums">{formatPrice(price)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 pb-2">
        <PaperDirectionTabs value={direction} onChange={setDirection} />
        <PaperLeverageSelector value={leverage} onChange={setLeverage} max={sliderMaxLeverage} />
        {executionMaxLeverage < sliderMaxLeverage ? (
          <p className="px-2 text-[9px] leading-4 text-black/38">
            Paper execution currently supports up to {executionMaxLeverage}x.
          </p>
        ) : null}
        <div className="px-2">
          <PaperLevelInput label="Amount" value={notional} onChange={setNotional} suffix="USDT" />
          <PaperBalanceSlider
            availableBalance={availableBalance}
            notional={parsedNotional}
            onNotionalChange={setNotional}
          />
          <PaperTradeLevelField
            label="Stop loss"
            kind="stopLoss"
            value={stopLoss}
            onChange={setStopLoss}
            direction={direction}
            referencePrice={price}
            invalid={hasTradeLevelInputError(stopLoss) || Boolean(levelValidationErrors.stopLoss)}
            hint={levelValidationErrors.stopLoss}
          />
          <PaperTradeLevelField
            label="Take profit"
            kind="takeProfit"
            value={takeProfit}
            onChange={setTakeProfit}
            direction={direction}
            referencePrice={price}
            invalid={hasTradeLevelInputError(takeProfit) || Boolean(levelValidationErrors.takeProfit)}
            hint={levelValidationErrors.takeProfit}
          />
          <div className="pt-1.5">
            <PaperTradePreview
              variant="grid"
              items={[
                { label: "Margin", value: formatPrice(preview.marginUsed ?? undefined) },
                { label: "Exposure", value: formatPrice(preview.effectiveNotional ?? undefined) },
                { label: "Leverage", value: `${leverage}x` },
                { label: "Est. qty", value: `${formatQuantity(preview.estimatedQuantity)} ${symbol}` },
                { label: "Entry", value: formatPrice(preview.estimatedExecutionPrice ?? undefined) },
                { label: "Approx. liq", value: formatPrice(preview.estimatedLiquidationPrice ?? undefined) },
                { label: "Risk", value: preview.riskLevel ?? "--" },
                { label: "Loss at SL", value: formatPrice(preview.estimatedRisk ?? undefined) },
                { label: "Reward at TP", value: formatPrice(preview.estimatedReward ?? undefined) },
                { label: "R / R", value: formatRatio(preview.riskRewardRatio) },
              ]}
            />
          </div>
        </div>
      </div>
      <div className="border-t border-black/8 bg-background px-2 py-2">
        <div className="flex items-center justify-between gap-3 pb-1.5 text-[10px] leading-4">
          <p className="min-w-0 flex-1 text-black/48">{statusMessage}</p>
          <span className="shrink-0 text-black/34">
            {leverage > executionMaxLeverage ? "Preview only" : "Market · paper"}
          </span>
        </div>
        <button
          type="button"
          disabled={tradeMutation.isPending || !canOpen}
          onClick={() =>
            tradeMutation.mutate({
              action: "open",
              direction,
              leverage,
              productId,
              symbol,
              notional: parsedNotional,
              price,
              stopLoss: parsedStopLoss,
              takeProfit: parsedTakeProfit,
              note: "Opened from context panel",
            })
          }
          className={PRIMARY_ACTION_CLASS}
        >
          {direction === "short" ? "Open short" : "Open long"}
        </button>
      </div>
    </section>
  );
}
