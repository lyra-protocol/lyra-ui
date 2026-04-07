import "server-only";

import { fetchMarketCandlesServer } from "@/core/market/market-server";
import { MarketCandle, MarketTimeframe } from "@/core/market/types";

const DEFAULT_TIMEFRAMES: MarketTimeframe[] = ["15m", "1h", "4h", "1d"];

type TimeframeSummary = {
  timeframe: MarketTimeframe;
  sampleCount: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  changePercent: number;
  recentCloses: number[];
};

function summarizeCandles(timeframe: MarketTimeframe, candles: MarketCandle[]): TimeframeSummary | null {
  if (candles.length === 0) {
    return null;
  }

  const open = candles[0]?.open ?? 0;
  const close = candles.at(-1)?.close ?? 0;
  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const volume = candles.reduce((total, candle) => total + candle.volume, 0);
  const changePercent = open > 0 ? ((close - open) / open) * 100 : 0;

  return {
    timeframe,
    sampleCount: candles.length,
    open,
    close,
    high: Math.max(...highs),
    low: Math.min(...lows),
    volume,
    changePercent,
    recentCloses: candles.slice(-5).map((candle) => candle.close),
  };
}

export async function getMultiTimeframeHistorySummary(
  productId: string,
  timeframes: MarketTimeframe[] = DEFAULT_TIMEFRAMES
) {
  const uniqueTimeframes = Array.from(new Set(timeframes));
  const results = await Promise.all(
    uniqueTimeframes.map(async (timeframe) => {
      try {
        const candles = await fetchMarketCandlesServer(productId, timeframe);
        return summarizeCandles(timeframe, candles);
      } catch (error) {
        return {
          timeframe,
          error: error instanceof Error ? error.message : "Unable to load candles.",
        };
      }
    })
  );

  return results;
}
