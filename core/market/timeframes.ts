import { MarketTimeframe } from "@/core/market/types";

export const TIMEFRAMES: Array<{
  id: MarketTimeframe;
  label: string;
  seconds: number;
}> = [
  { id: "15m", label: "15m", seconds: 900 },
  { id: "1h", label: "1h", seconds: 3600 },
  { id: "4h", label: "4h", seconds: 14400 },
  { id: "1d", label: "1D", seconds: 86400 },
];

export const DEFAULT_TIMEFRAME: MarketTimeframe = "1h";

export function getTimeframeSeconds(timeframe: MarketTimeframe) {
  return TIMEFRAMES.find((item) => item.id === timeframe)?.seconds ?? 3600;
}

export function isMarketTimeframe(value: string): value is MarketTimeframe {
  return TIMEFRAMES.some((item) => item.id === value);
}
