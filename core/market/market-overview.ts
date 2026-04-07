import { MarketCandle, MarketTicker } from "@/core/market/types";

const DAY_SECONDS = 24 * 60 * 60;

function getLast24hCandles(candles: MarketCandle[]) {
  const lastTime = candles.at(-1)?.time;
  if (!lastTime) {
    return [];
  }

  return candles.filter((candle) => candle.time >= lastTime - DAY_SECONDS);
}

export function buildMarketOverview(
  baseOverview: MarketTicker,
  candles: MarketCandle[]
) {
  const recentCandles = getLast24hCandles(candles);
  if (recentCandles.length === 0) {
    return baseOverview;
  }

  const highs = recentCandles.map((candle) => candle.high);
  const lows = recentCandles.map((candle) => candle.low);
  const volume24h = recentCandles.reduce((total, candle) => total + candle.volume, 0);

  return {
    ...baseOverview,
    open24h: recentCandles[0]?.open ?? baseOverview.open24h,
    high24h: Math.max(baseOverview.price, ...highs),
    low24h: Math.min(baseOverview.price, ...lows),
    volume24h: baseOverview.volume24h || volume24h,
  } satisfies MarketTicker;
}
