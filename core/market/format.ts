import { MarketTicker } from "@/core/market/types";

const COMPACT_FORMATTER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function formatPrice(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (value >= 1) {
    return value.toFixed(2);
  }

  if (value >= 0.1) {
    return value.toFixed(4);
  }

  if (value >= 0.01) {
    return value.toFixed(5);
  }

  if (value >= 0.0001) {
    return value.toFixed(6);
  }

  return value.toFixed(8);
}

export function formatCompactNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return COMPACT_FORMATTER.format(value);
}

export function getPercentChange(snapshot?: Pick<MarketTicker, "price" | "open24h"> | null) {
  if (!snapshot?.open24h) {
    return null;
  }

  return ((snapshot.price - snapshot.open24h) / snapshot.open24h) * 100;
}

export function formatPercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

export function getRangePosition(snapshot?: MarketTicker | null) {
  if (!snapshot) {
    return null;
  }

  const range = snapshot.high24h - snapshot.low24h;
  if (!range) {
    return null;
  }

  return (snapshot.price - snapshot.low24h) / range;
}
