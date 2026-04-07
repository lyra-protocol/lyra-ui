"use client";

import { useEffect, useMemo, useState } from "react";
import { PaperCloseActions } from "@/components/workspace/context/paper-close-actions";
import { PaperPositionAddPanel } from "@/components/workspace/context/paper-position-add-panel";
import { PaperPositionModeTabs } from "@/components/workspace/context/paper-position-mode-tabs";
import { PaperPositionSummary } from "@/components/workspace/context/paper-position-summary";
import { PaperTradeLevelField } from "@/components/workspace/context/paper-trade-level-field";
import { formatPrice } from "@/core/market/format";
import { getPositionUnrealizedPnlAtPrice } from "@/core/paper/metrics";
import {
  getTradeLevelValidationErrors,
  getTradeLevelsValidationMessage,
  hasTradeLevelInputError,
  parseTradeLevelInput,
} from "@/core/paper/trade-levels";
import {
  getPositionIncreasePreview,
} from "@/core/paper/trade-setup";
import { PaperPosition } from "@/core/paper/types";
import { usePaperPositionLevels } from "@/hooks/use-paper-position-levels";
import { usePaperTradeDraftSync } from "@/hooks/use-paper-trade-draft-sync";
import { usePaperTradeActions } from "@/hooks/use-paper-trade-actions";

const SECONDARY_ACTION_CLASS =
  "inline-flex h-8 min-w-[104px] items-center justify-center whitespace-nowrap border border-black/10 px-3 text-[10px] font-medium text-black/82 transition hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:text-black/28";

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

export function PaperPositionManagementPanel({
  symbol,
  productId,
  price,
  availableBalance,
  activePosition,
}: {
  symbol: string;
  productId: string;
  price: number;
  availableBalance: number;
  activePosition: PaperPosition;
}) {
  const [activeMode, setActiveMode] = useState<"manage" | "add" | "exit">("manage");
  const [notional, setNotional] = useState("500");
  const [stopLoss, setStopLoss] = useState(activePosition.stopLoss ? String(activePosition.stopLoss) : "");
  const [takeProfit, setTakeProfit] = useState(activePosition.takeProfit ? String(activePosition.takeProfit) : "");
  const tradeMutation = usePaperTradeActions();
  const levelsMutation = usePaperPositionLevels();
  const tradeMutationError = tradeMutation.error;
  const levelsMutationError = levelsMutation.error;
  const resetTradeMutation = tradeMutation.reset;
  const resetLevelsMutation = levelsMutation.reset;
  const parsedNotional = useMemo(() => parseNotional(notional), [notional]);
  const parsedStopLoss = useMemo(() => parseTradeLevelInput(stopLoss), [stopLoss]);
  const parsedTakeProfit = useMemo(() => parseTradeLevelInput(takeProfit), [takeProfit]);
  const hasLevelError = hasTradeLevelInputError(stopLoss) || hasTradeLevelInputError(takeProfit);
  const levelValidationErrors = useMemo(
    () =>
      getTradeLevelValidationErrors({
        direction: activePosition.direction,
        referencePrice: activePosition.entryPrice,
        stopLoss: parsedStopLoss,
        takeProfit: parsedTakeProfit,
      }),
    [activePosition.direction, activePosition.entryPrice, parsedStopLoss, parsedTakeProfit]
  );
  const levelsValidationMessage = getTradeLevelsValidationMessage({
    direction: activePosition.direction,
    referencePrice: activePosition.entryPrice,
    stopLoss: parsedStopLoss,
    takeProfit: parsedTakeProfit,
  });
  const addPreview = useMemo(
    () =>
      getPositionIncreasePreview({
        direction: activePosition.direction,
        quantity: activePosition.quantity,
        entryPrice: activePosition.entryPrice,
        marginUsed: activePosition.marginUsed,
        leverage: activePosition.leverage,
        notional: parsedNotional,
        executionPrice: price,
      }),
    [activePosition.direction, activePosition.entryPrice, activePosition.leverage, activePosition.marginUsed, activePosition.quantity, parsedNotional, price]
  );
  const unrealizedPnl = getPositionUnrealizedPnlAtPrice(activePosition, price);
  const addValidationMessage = getTradeLevelsValidationMessage({
    direction: activePosition.direction,
    referencePrice: addPreview.estimatedAverageEntry ?? activePosition.entryPrice,
    stopLoss: parsedStopLoss,
    takeProfit: parsedTakeProfit,
  });
  const levelsDirty =
    (parsedStopLoss ?? null) !== (activePosition.stopLoss ?? null) ||
    (parsedTakeProfit ?? null) !== (activePosition.takeProfit ?? null);

  useEffect(() => {
    if (tradeMutationError) {
      resetTradeMutation();
    }
    if (levelsMutationError) {
      resetLevelsMutation();
    }
  }, [
    levelsMutationError,
    notional,
    resetLevelsMutation,
    resetTradeMutation,
    stopLoss,
    takeProfit,
    tradeMutationError,
  ]);

  const statusMessage =
    tradeMutation.isPending
      ? "Updating paper position…"
      : levelsMutation.isPending
        ? "Saving trade setup…"
        : tradeMutationError instanceof Error
          ? tradeMutationError.message
          : levelsMutationError instanceof Error
            ? levelsMutationError.message
            : hasLevelError
              ? "Stop loss and take profit must be valid prices."
              : levelsValidationMessage;

  usePaperTradeDraftSync({
    productId,
    symbol,
    mode: "manage",
    direction: activePosition.direction,
    leverage: activePosition.leverage,
    marginUsed: activePosition.marginUsed,
    entryPrice: activePosition.entryPrice,
    quantity: activePosition.quantity,
    stopLoss: parsedStopLoss,
    takeProfit: parsedTakeProfit,
  });

  return (
    <section className="flex h-full min-h-0 flex-col border-b border-black/8">
      <div className="px-2 py-1.5 text-[10px] text-black/52">
        <div className="flex items-center justify-between gap-2">
          <span>{activePosition.direction === "short" ? "Short" : "Long"} {symbol}</span>
          <span className="tabular-nums">{formatQuantity(activePosition.quantity)} · {formatPrice(price)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2">
        <PaperPositionSummary
          direction={activePosition.direction}
          leverage={activePosition.leverage}
          marginUsed={activePosition.marginUsed}
          effectiveNotional={activePosition.marginUsed * activePosition.leverage}
          quantity={activePosition.quantity}
          entryPrice={activePosition.entryPrice}
          currentPrice={price}
          unrealizedPnl={unrealizedPnl}
          stopLoss={activePosition.stopLoss}
          takeProfit={activePosition.takeProfit}
        />
        <div className="pt-1.5">
          <PaperPositionModeTabs value={activeMode} onChange={setActiveMode} />
        </div>
        {activeMode === "manage" ? (
          <div className="pt-1.5">
            <PaperTradeLevelField
              label="Stop loss"
              kind="stopLoss"
              value={stopLoss}
              onChange={setStopLoss}
              direction={activePosition.direction}
              referencePrice={activePosition.entryPrice}
              invalid={hasTradeLevelInputError(stopLoss) || Boolean(levelValidationErrors.stopLoss)}
              hint={levelValidationErrors.stopLoss}
            />
            <PaperTradeLevelField
              label="Take profit"
              kind="takeProfit"
              value={takeProfit}
              onChange={setTakeProfit}
              direction={activePosition.direction}
              referencePrice={activePosition.entryPrice}
              invalid={hasTradeLevelInputError(takeProfit) || Boolean(levelValidationErrors.takeProfit)}
              hint={levelValidationErrors.takeProfit}
            />
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                disabled={levelsMutation.isPending || !levelsDirty || hasLevelError || Boolean(levelsValidationMessage)}
                onClick={() =>
                  levelsMutation.mutate({
                    productId,
                    stopLoss: parsedStopLoss,
                    takeProfit: parsedTakeProfit,
                    note: "Trade setup updated from context panel",
                  })
                }
                className={SECONDARY_ACTION_CLASS}
              >
                Save setup
              </button>
            </div>
          </div>
        ) : null}
        {activeMode === "add" ? (
          <PaperPositionAddPanel
            symbol={symbol}
            leverage={activePosition.leverage}
            availableBalance={availableBalance}
            notional={notional}
            onNotionalChange={setNotional}
            preview={addPreview}
            disabled={
              tradeMutation.isPending ||
              parsedNotional <= 0 ||
              price <= 0 ||
              hasLevelError ||
              Boolean(addValidationMessage)
            }
            onSubmit={() =>
              tradeMutation.mutate({
                action: "increase",
                direction: activePosition.direction,
                leverage: activePosition.leverage,
                productId,
                symbol,
                notional: parsedNotional,
                price,
                stopLoss: parsedStopLoss,
                takeProfit: parsedTakeProfit,
                note: "Increased from context panel",
              })
            }
          />
        ) : null}
      </div>
      <div className="border-t border-black/8 bg-background px-2 py-2">
        {statusMessage || addValidationMessage ? (
          <p className="pb-1.5 text-[10px] leading-4 text-black/48">{statusMessage ?? addValidationMessage}</p>
        ) : null}
        {activeMode === "exit" ? (
          <PaperCloseActions
            className="pt-0"
            direction={activePosition.direction}
            entryPrice={activePosition.entryPrice}
            marginUsed={activePosition.marginUsed}
            quantity={activePosition.quantity}
            symbol={symbol}
            price={price}
            isPending={tradeMutation.isPending}
            onConfirm={(quantity, fraction) =>
              tradeMutation.mutate({
                action: "close",
                productId,
                symbol,
                quantity,
                price,
                note: fraction === 1 ? "Closed from context panel" : `Reduced ${(fraction * 100).toFixed(0)}% from context panel`,
              })
            }
          />
        ) : (
          <div className="flex h-8 items-center justify-between text-[10px] text-black/42">
            <span>{activeMode === "manage" ? "Update levels, then save." : "Preview the added exposure before confirming."}</span>
            <span>{activeMode === "manage" ? "Manage" : "Add"}</span>
          </div>
        )}
      </div>
    </section>
  );
}
