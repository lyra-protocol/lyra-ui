import { PaperPositionDirection } from "@/core/paper/types";

export type PaperTradeLevelKind = "stopLoss" | "takeProfit";

type TradeLevelValidationErrors = {
  stopLoss: string | null;
  takeProfit: string | null;
};

export function parseTradeLevelInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function hasTradeLevelInputError(value: string) {
  return value.trim().length > 0 && parseTradeLevelInput(value) === null;
}

export function getTradeLevelPercentFromValue({
  direction,
  referencePrice,
  level,
  kind,
}: {
  direction: PaperPositionDirection;
  referencePrice: number;
  level: number | null;
  kind: PaperTradeLevelKind;
}) {
  if (!level || referencePrice <= 0) {
    return null;
  }

  const percent =
    kind === "stopLoss"
      ? direction === "long"
        ? ((referencePrice - level) / referencePrice) * 100
        : ((level - referencePrice) / referencePrice) * 100
      : direction === "long"
        ? ((level - referencePrice) / referencePrice) * 100
        : ((referencePrice - level) / referencePrice) * 100;

  return Number.isFinite(percent) ? percent : null;
}

export function getTradeLevelValueFromPercent({
  direction,
  referencePrice,
  percent,
  kind,
}: {
  direction: PaperPositionDirection;
  referencePrice: number;
  percent: number | null;
  kind: PaperTradeLevelKind;
}) {
  if (referencePrice <= 0 || percent === null || !Number.isFinite(percent)) {
    return null;
  }

  const ratio = percent / 100;
  const value =
    kind === "stopLoss"
      ? direction === "long"
        ? referencePrice * (1 - ratio)
        : referencePrice * (1 + ratio)
      : direction === "long"
        ? referencePrice * (1 + ratio)
        : referencePrice * (1 - ratio);

  return value > 0 ? value : null;
}

export function getTradeLevelValidationErrors({
  direction,
  referencePrice,
  stopLoss,
  takeProfit,
  priceLabel = "entry price",
}: {
  direction: PaperPositionDirection;
  referencePrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  priceLabel?: string;
}): TradeLevelValidationErrors {
  if (referencePrice <= 0) {
    return {
      stopLoss: null,
      takeProfit: null,
    };
  }

  if (direction === "long") {
    if (stopLoss !== null && stopLoss >= referencePrice) {
      return {
        stopLoss: `Stop loss must be below the ${priceLabel} for a long setup.`,
        takeProfit: null,
      };
    }

    if (takeProfit !== null && takeProfit <= referencePrice) {
      return {
        stopLoss: null,
        takeProfit: `Take profit must be above the ${priceLabel} for a long setup.`,
      };
    }

    return {
      stopLoss: null,
      takeProfit: null,
    };
  }

  if (stopLoss !== null && stopLoss <= referencePrice) {
    return {
      stopLoss: `Stop loss must be above the ${priceLabel} for a short setup.`,
      takeProfit: null,
    };
  }

  if (takeProfit !== null && takeProfit >= referencePrice) {
    return {
      stopLoss: null,
      takeProfit: `Take profit must be below the ${priceLabel} for a short setup.`,
    };
  }

  return {
    stopLoss: null,
    takeProfit: null,
  };
}

export function getTradeLevelsValidationMessage(args: {
  direction: PaperPositionDirection;
  referencePrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  priceLabel?: string;
}) {
  const errors = getTradeLevelValidationErrors(args);
  return errors.stopLoss ?? errors.takeProfit;
}
