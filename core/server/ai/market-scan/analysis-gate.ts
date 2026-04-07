import { MarketCandle } from "@/core/market/types";

export type MarketAnalysisGate = {
  ready: boolean;
  confidence: number;
  summary: string;
  stance: string;
  change90d: number;
  change14d: number;
  range90d: number;
  positionInRange90d: number;
  compressionRatio: number;
};

function percentChange(open: number, close: number) {
  return open > 0 ? ((close - open) / open) * 100 : 0;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function describeTrend(
  change90d: number,
  change14d: number,
  positionInRange: number,
  compressionRatio: number
) {
  const nearHigh = positionInRange >= 0.78;
  const nearLow = positionInRange <= 0.22;

  if (change90d >= 10 && change14d >= 2.5 && nearHigh) {
    return {
      stance: "bullish continuation",
      confidence: 58 + Math.min(change90d, 24) + Math.min(change14d * 2.4, 18),
    };
  }

  if (change90d <= -10 && change14d <= -2.5 && nearLow) {
    return {
      stance: "bearish continuation",
      confidence: 58 + Math.min(Math.abs(change90d), 24) + Math.min(Math.abs(change14d) * 2.4, 18),
    };
  }

  if (change90d >= 12 && change14d <= -3 && positionInRange <= 0.45) {
    return {
      stance: "possible bearish reversal",
      confidence: 56 + Math.min(change90d * 0.7, 18) + Math.min(Math.abs(change14d) * 2.5, 20),
    };
  }

  if (change90d <= -12 && change14d >= 3 && positionInRange >= 0.55) {
    return {
      stance: "possible bullish reversal",
      confidence: 56 + Math.min(Math.abs(change90d) * 0.7, 18) + Math.min(change14d * 2.5, 20),
    };
  }

  if (compressionRatio <= 0.72 && positionInRange >= 0.25 && positionInRange <= 0.75) {
    return {
      stance: "compression watch",
      confidence: 54 + (1 - compressionRatio) * 32,
    };
  }

  return {
    stance: "inactive",
    confidence: 30 + Math.min(Math.abs(change14d), 6) * 2,
  };
}

export function assessMarketForAnalysis(candles1d: MarketCandle[]): MarketAnalysisGate {
  const window = candles1d.slice(-90);
  if (window.length < 45) {
    return {
      ready: false,
      confidence: 0,
      summary: "Not enough daily history to judge whether this market is worth deeper analysis.",
      stance: "insufficient history",
      change90d: 0,
      change14d: 0,
      range90d: 0,
      positionInRange90d: 0.5,
      compressionRatio: 1,
    };
  }

  const close = window.at(-1)?.close ?? 0;
  const open90d = window[0]?.open ?? 0;
  const open14d = window.slice(-14)[0]?.open ?? open90d;
  const high90d = Math.max(...window.map((candle) => candle.high));
  const low90d = Math.min(...window.map((candle) => candle.low));
  const range90d = close > 0 ? ((high90d - low90d) / close) * 100 : 0;
  const positionInRange = high90d <= low90d ? 0.5 : (close - low90d) / (high90d - low90d);
  const meanRange90d = average(window.map((candle) => ((candle.high - candle.low) / candle.close) * 100));
  const meanRange10d = average(
    window.slice(-10).map((candle) => ((candle.high - candle.low) / candle.close) * 100)
  );
  const compressionRatio = meanRange90d > 0 ? meanRange10d / meanRange90d : 1;
  const change90d = percentChange(open90d, close);
  const change14d = percentChange(open14d, close);
  const trend = describeTrend(change90d, change14d, positionInRange, compressionRatio);
  const confidence = Math.round(clamp(trend.confidence + Math.min(range90d * 0.12, 10), 0, 95));
  const ready = confidence >= 68 && trend.stance !== "inactive";

  return {
    ready,
    stance: trend.stance,
    confidence,
    summary: ready
      ? `3m stance: ${trend.stance} (${confidence}% confidence, 90d ${change90d.toFixed(1)}%, 14d ${change14d.toFixed(1)}%, range ${range90d.toFixed(1)}%).`
      : `3m stance: not compelling enough yet (${trend.stance}, ${confidence}% confidence).`,
    change90d,
    change14d,
    range90d,
    positionInRange90d: positionInRange,
    compressionRatio,
  };
}
