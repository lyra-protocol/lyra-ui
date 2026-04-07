import { getApproxLiquidationPrice, getEffectivePositionNotional } from "@/core/paper/leverage";
import { getTradeLevelsValidationMessage } from "@/core/paper/trade-levels";
import { PaperPositionDirection } from "@/core/paper/types";

export type TradeSetupPreview = {
  marginUsed: number | null;
  effectiveNotional: number | null;
  estimatedQuantity: number | null;
  estimatedExecutionPrice: number | null;
  estimatedLiquidationPrice: number | null;
  estimatedRisk: number | null;
  estimatedReward: number | null;
  riskRewardRatio: number | null;
  riskLevel: "Low" | "Medium" | "High" | null;
  direction: PaperPositionDirection;
  validationMessage: string | null;
};

export type PositionIncreasePreview = {
  estimatedAdditionalMargin: number | null;
  estimatedAdditionalNotional: number | null;
  estimatedAdditionalQuantity: number | null;
  estimatedNewMarginUsed: number | null;
  estimatedNewNotional: number | null;
  estimatedNewQuantity: number | null;
  estimatedAverageEntry: number | null;
  estimatedLiquidationPrice: number | null;
};

function getRiskLevel({
  leverage,
  estimatedRisk,
  marginUsed,
  hasStopLoss,
}: {
  leverage: number;
  estimatedRisk: number | null;
  marginUsed: number;
  hasStopLoss: boolean;
}): "Low" | "Medium" | "High" | null {
  let score = 0;

  if (leverage >= 3) score += 2;
  else if (leverage >= 2) score += 1;

  if (!hasStopLoss) score += 2;

  if (estimatedRisk !== null && marginUsed > 0) {
    const riskFraction = estimatedRisk / marginUsed;
    if (riskFraction >= 0.2) score += 2;
    else if (riskFraction >= 0.08) score += 1;
  }

  if (score <= 1) return "Low";
  if (score <= 3) return "Medium";
  return "High";
}

export function getTradeSetupPreview({
  direction,
  notional,
  leverage,
  price,
  stopLoss,
  takeProfit,
}: {
  direction: PaperPositionDirection;
  notional: number;
  leverage: number;
  price: number;
  stopLoss: number | null;
  takeProfit: number | null;
}): TradeSetupPreview {
  if (notional <= 0 || price <= 0) {
    return {
      marginUsed: null,
      effectiveNotional: null,
      estimatedQuantity: null,
      estimatedExecutionPrice: null,
      estimatedLiquidationPrice: null,
      estimatedRisk: null,
      estimatedReward: null,
      riskRewardRatio: null,
      riskLevel: null,
      direction,
      validationMessage: null,
    };
  }

  const effectiveNotional = getEffectivePositionNotional(notional, leverage);
  const estimatedQuantity = effectiveNotional / price;
  const validationMessage = getTradeLevelsValidationMessage({
    direction,
    referencePrice: price,
    stopLoss,
    takeProfit,
    priceLabel: "current price",
  });

  const estimatedRisk =
    stopLoss !== null
      ? (direction === "long" ? price - stopLoss : stopLoss - price) * estimatedQuantity
      : null;
  const estimatedReward =
    takeProfit !== null
      ? (direction === "long" ? takeProfit - price : price - takeProfit) * estimatedQuantity
      : null;
  const riskRewardRatio =
    estimatedRisk && estimatedReward && estimatedRisk > 0 ? estimatedReward / estimatedRisk : null;

  return {
    marginUsed: notional,
    effectiveNotional,
    estimatedQuantity,
    estimatedExecutionPrice: price,
    estimatedLiquidationPrice: getApproxLiquidationPrice({
      direction,
      entryPrice: price,
      leverage,
    }),
    estimatedRisk,
    estimatedReward,
    riskRewardRatio,
    riskLevel: getRiskLevel({
      leverage,
      estimatedRisk,
      marginUsed: notional,
      hasStopLoss: stopLoss !== null,
    }),
    direction,
    validationMessage,
  };
}

export function getPositionIncreasePreview({
  direction,
  quantity,
  entryPrice,
  marginUsed,
  leverage,
  notional,
  executionPrice,
}: {
  direction: PaperPositionDirection;
  quantity: number;
  entryPrice: number;
  marginUsed: number;
  leverage: number;
  notional: number;
  executionPrice: number;
}): PositionIncreasePreview {
  if (quantity <= 0 || entryPrice <= 0 || marginUsed <= 0 || leverage <= 0 || notional <= 0 || executionPrice <= 0) {
    return {
      estimatedAdditionalMargin: null,
      estimatedAdditionalNotional: null,
      estimatedAdditionalQuantity: null,
      estimatedNewMarginUsed: null,
      estimatedNewNotional: null,
      estimatedNewQuantity: null,
      estimatedAverageEntry: null,
      estimatedLiquidationPrice: null,
    };
  }

  const estimatedAdditionalNotional = getEffectivePositionNotional(notional, leverage);
  const estimatedAdditionalQuantity = estimatedAdditionalNotional / executionPrice;
  const estimatedNewMarginUsed = marginUsed + notional;
  const estimatedNewNotional = getEffectivePositionNotional(estimatedNewMarginUsed, leverage);
  const estimatedNewQuantity = quantity + estimatedAdditionalQuantity;
  const estimatedAverageEntry =
    estimatedNewQuantity > 0
      ? ((quantity * entryPrice) + (estimatedAdditionalQuantity * executionPrice)) / estimatedNewQuantity
      : null;

  return {
    estimatedAdditionalMargin: notional,
    estimatedAdditionalNotional,
    estimatedAdditionalQuantity,
    estimatedNewMarginUsed,
    estimatedNewNotional,
    estimatedNewQuantity,
    estimatedAverageEntry,
    estimatedLiquidationPrice:
      estimatedAverageEntry === null
        ? null
        : getApproxLiquidationPrice({
            direction,
            entryPrice: estimatedAverageEntry,
            leverage,
          }),
  };
}
