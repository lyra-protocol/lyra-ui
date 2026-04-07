import { HistogramData, UTCTimestamp } from "lightweight-charts";
import { getTimeframeSeconds } from "@/core/market/timeframes";
import { MarketCandle, MarketTicker, MarketTimeframe } from "@/core/market/types";

export const UP_COLOR = "#1f7a4d";
export const DOWN_COLOR = "#a94442";

export function toVolumeData(candle: MarketCandle): HistogramData<UTCTimestamp> {
  return {
    time: candle.time as UTCTimestamp,
    value: candle.volume,
    color: candle.close >= candle.open ? "rgba(31,122,77,0.22)" : "rgba(169,68,66,0.18)",
  };
}

export function buildRealtimeCandle(
  candles: MarketCandle[],
  snapshot: MarketTicker,
  timeframe: MarketTimeframe
) {
  const timeframeSeconds = getTimeframeSeconds(timeframe);
  const candleTime = Math.floor(new Date(snapshot.time).getTime() / 1000 / timeframeSeconds) * timeframeSeconds;
  const previous = candles[candles.length - 1];

  if (!previous) {
    return null;
  }

  if (candleTime === previous.time) {
    return {
      ...previous,
      high: Math.max(previous.high, snapshot.price),
      low: Math.min(previous.low, snapshot.price),
      close: snapshot.price,
    };
  }

  return {
    time: candleTime,
    open: previous.close,
    high: snapshot.price,
    low: snapshot.price,
    close: snapshot.price,
    volume: snapshot.lastSize || 0,
  } satisfies MarketCandle;
}
