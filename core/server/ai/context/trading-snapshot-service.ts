import "server-only";

import { fetchMarketCandlesServer } from "@/core/market/market-server";
import { MarketCandle, MarketTimeframe } from "@/core/market/types";
import { assessMarketForAnalysis } from "@/core/server/ai/market-scan/analysis-gate";

type Structure = "Bullish" | "Bearish" | "Range";
type TradePlan = {
  entry: string;
  stopLoss: string;
  takeProfit: string;
  condition: string;
};

export type TradingSnapshot = {
  focusTimeframe: MarketTimeframe;
  currentPrice: number | null;
  market: Structure;
  support: number | null;
  resistance: number | null;
  noTradeZone: { low: number | null; high: number | null; active: boolean };
  threeMonthStance: string;
  timeframes: Array<{
    timeframe: MarketTimeframe;
    structure: Structure;
    changePercent: number;
    atrPercent: number;
    support: number | null;
    resistance: number | null;
  }>;
  longPlan: TradePlan;
  shortPlan: TradePlan;
  status: "TRADE" | "WAIT" | "NO TRADE ZONE";
};

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function formatLevel(value: number | null) {
  return value && Number.isFinite(value) ? value.toFixed(2) : "--";
}

function windowed(candles: MarketCandle[], size: number) {
  return candles.slice(-size);
}

function atr(candles: MarketCandle[], size: number) {
  return avg(windowed(candles, size).map((candle) => candle.high - candle.low));
}

function support(candles: MarketCandle[], size: number) {
  const slice = windowed(candles, size);
  return slice.length ? Math.min(...slice.map((candle) => candle.low)) : null;
}

function resistance(candles: MarketCandle[], size: number) {
  const slice = windowed(candles, size);
  return slice.length ? Math.max(...slice.map((candle) => candle.high)) : null;
}

function structure(candles: MarketCandle[]) {
  const slice = windowed(candles, 50);
  if (slice.length < 24) return "Range" as const;
  const close = slice.at(-1)?.close ?? 0;
  const fast = avg(slice.slice(-20).map((candle) => candle.close));
  const slow = avg(slice.map((candle) => candle.close));
  const recent = slice.slice(-12);
  const prior = slice.slice(-24, -12);
  const recentHigh = Math.max(...recent.map((candle) => candle.high));
  const recentLow = Math.min(...recent.map((candle) => candle.low));
  const priorHigh = Math.max(...prior.map((candle) => candle.high));
  const priorLow = Math.min(...prior.map((candle) => candle.low));

  if (close > fast && fast > slow && recentHigh > priorHigh && recentLow > priorLow) return "Bullish" as const;
  if (close < fast && fast < slow && recentHigh < priorHigh && recentLow < priorLow) return "Bearish" as const;
  return "Range" as const;
}

function plan(direction: "long" | "short", market: Structure, currentPrice: number, supportLevel: number | null, resistanceLevel: number | null, atrValue: number) {
  const safeAtr = atrValue > 0 ? atrValue : currentPrice * 0.006;
  if (direction === "long") {
    const entryLow = market === "Bearish" ? (resistanceLevel ?? currentPrice) + safeAtr * 0.12 : supportLevel ?? currentPrice;
    const entryHigh = market === "Bearish" ? entryLow : entryLow + safeAtr * 0.3;
    const stopLoss = market === "Bearish" ? entryLow - safeAtr * 0.55 : entryLow - safeAtr * 0.6;
    const takeProfit = market === "Bearish" ? entryLow + safeAtr * 1.4 : (resistanceLevel ?? currentPrice) + safeAtr * 0.8;
    return {
      entry: market === "Bearish" ? formatLevel(entryLow) : `${formatLevel(entryLow)} - ${formatLevel(entryHigh)}`,
      stopLoss: formatLevel(stopLoss),
      takeProfit: formatLevel(takeProfit),
      condition: market === "Bearish" ? `Only after a 15m reclaim above ${formatLevel(entryLow)}` : `Only if price holds support near ${formatLevel(entryLow)}`,
    };
  }

  const entryHigh = market === "Bullish" ? (supportLevel ?? currentPrice) - safeAtr * 0.12 : resistanceLevel ?? currentPrice;
  const entryLow = market === "Bullish" ? entryHigh : entryHigh - safeAtr * 0.3;
  const stopLoss = market === "Bullish" ? entryHigh + safeAtr * 0.55 : entryHigh + safeAtr * 0.6;
  const takeProfit = market === "Bullish" ? entryHigh - safeAtr * 1.4 : (supportLevel ?? currentPrice) - safeAtr * 0.8;
  return {
    entry: market === "Bullish" ? formatLevel(entryHigh) : `${formatLevel(entryLow)} - ${formatLevel(entryHigh)}`,
    stopLoss: formatLevel(stopLoss),
    takeProfit: formatLevel(takeProfit),
    condition: market === "Bullish" ? `Only after a 15m breakdown below ${formatLevel(entryHigh)}` : `Only if price rejects resistance near ${formatLevel(entryHigh)}`,
  };
}

export async function getTradingSnapshot(productId: string, focusTimeframe: MarketTimeframe = "15m") {
  const [candles15m, candles1h, candles4h, candles1d] = await Promise.all([
    fetchMarketCandlesServer(productId, "15m").catch(() => []),
    fetchMarketCandlesServer(productId, "1h").catch(() => []),
    fetchMarketCandlesServer(productId, "4h").catch(() => []),
    fetchMarketCandlesServer(productId, "1d").catch(() => []),
  ]);

  const currentPrice = candles15m.at(-1)?.close ?? candles1h.at(-1)?.close ?? candles4h.at(-1)?.close ?? candles1d.at(-1)?.close ?? null;
  if (!currentPrice) return null;

  const structure15m = structure(candles15m);
  const structure1h = structure(candles1h);
  const structure4h = structure(candles4h);
  const market =
    structure15m === structure1h && structure15m !== "Range"
      ? structure15m
      : structure1h === structure4h && structure1h !== "Range"
        ? structure1h
        : "Range";
  const support15m = support(candles15m, 48);
  const resistance15m = resistance(candles15m, 48);
  const range = Math.max((resistance15m ?? currentPrice) - (support15m ?? currentPrice), 0);
  const zoneLow = support15m === null ? null : support15m + range * 0.35;
  const zoneHigh = resistance15m === null ? null : resistance15m - range * 0.35;
  const noTradeZoneActive = zoneLow !== null && zoneHigh !== null && currentPrice >= zoneLow && currentPrice <= zoneHigh;
  const atr15m = atr(candles15m, 14);
  const gate = candles1d.length > 44 ? assessMarketForAnalysis(candles1d.slice(-90)) : null;
  const status = noTradeZoneActive ? "NO TRADE ZONE" : market === "Range" ? "WAIT" : "TRADE";

  return {
    focusTimeframe,
    currentPrice,
    market,
    support: support15m,
    resistance: resistance15m,
    noTradeZone: { low: zoneLow, high: zoneHigh, active: noTradeZoneActive },
    threeMonthStance: gate?.summary ?? "3m stance unavailable.",
    timeframes: [
      ["15m", candles15m],
      ["1h", candles1h],
      ["4h", candles4h],
      ["1d", candles1d],
    ].map(([timeframe, candles]) => {
      const slice = candles as MarketCandle[];
      const open = slice[0]?.open ?? currentPrice;
      return {
        timeframe: timeframe as MarketTimeframe,
        structure: structure(slice),
        changePercent: open > 0 ? (((slice.at(-1)?.close ?? currentPrice) - open) / open) * 100 : 0,
        atrPercent: currentPrice > 0 ? (atr(slice, 14) / currentPrice) * 100 : 0,
        support: support(slice, 24),
        resistance: resistance(slice, 24),
      };
    }),
    longPlan: plan("long", market, currentPrice, support15m, resistance15m, atr15m),
    shortPlan: plan("short", market, currentPrice, support15m, resistance15m, atr15m),
    status,
  } satisfies TradingSnapshot;
}
