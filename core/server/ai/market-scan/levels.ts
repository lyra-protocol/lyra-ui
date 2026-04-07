import { MarketCandle } from "@/core/market/types";

type WeightedLevel = {
  price: number;
  weight: number;
};

function getSwingLevels(
  candles: MarketCandle[],
  side: "support" | "resistance",
  weight: number
) {
  const levels: WeightedLevel[] = [];

  for (let index = 1; index < candles.length - 1; index += 1) {
    const previous = candles[index - 1];
    const current = candles[index];
    const next = candles[index + 1];

    if (side === "support" && current.low < previous.low && current.low < next.low) {
      levels.push({ price: current.low, weight });
    }

    if (side === "resistance" && current.high > previous.high && current.high > next.high) {
      levels.push({ price: current.high, weight });
    }
  }

  return levels;
}

function clusterLevels(levels: WeightedLevel[]) {
  const sorted = [...levels].sort((left, right) => left.price - right.price);
  const clusters: Array<{ price: number; weight: number }> = [];

  for (const level of sorted) {
    const last = clusters.at(-1);
    const tolerance = level.price * 0.0035;

    if (!last || Math.abs(level.price - last.price) > tolerance) {
      clusters.push({ price: level.price, weight: level.weight });
      continue;
    }

    const combinedWeight = last.weight + level.weight;
    last.price = (last.price * last.weight + level.price * level.weight) / combinedWeight;
    last.weight = combinedWeight;
  }

  return clusters;
}

function scoreLevel(level: { price: number; weight: number }, price: number) {
  const distance = Math.abs(price - level.price) / price;
  return level.weight / Math.max(distance, 0.0025);
}

function pickNearestLevel(
  levels: Array<{ price: number; weight: number }>,
  price: number,
  side: "support" | "resistance"
) {
  const filtered = levels.filter((level) => (side === "support" ? level.price < price : level.price > price));
  if (filtered.length === 0) {
    return null;
  }

  return filtered.sort((left, right) => scoreLevel(right, price) - scoreLevel(left, price))[0]?.price ?? null;
}

export function getMarketLevels(args: {
  price: number;
  candles15m: MarketCandle[];
  candles1h: MarketCandle[];
  candles4h: MarketCandle[];
  candles1d: MarketCandle[];
}) {
  const supportCandidates = [
    ...getSwingLevels(args.candles15m.slice(-48), "support", 1),
    ...getSwingLevels(args.candles1h.slice(-36), "support", 2),
    ...getSwingLevels(args.candles4h.slice(-24), "support", 3),
    ...getSwingLevels(args.candles1d.slice(-16), "support", 4),
    { price: Math.min(...args.candles1h.slice(-24).map((candle) => candle.low)), weight: 2 },
    { price: Math.min(...args.candles4h.slice(-20).map((candle) => candle.low)), weight: 3 },
  ];
  const resistanceCandidates = [
    ...getSwingLevels(args.candles15m.slice(-48), "resistance", 1),
    ...getSwingLevels(args.candles1h.slice(-36), "resistance", 2),
    ...getSwingLevels(args.candles4h.slice(-24), "resistance", 3),
    ...getSwingLevels(args.candles1d.slice(-16), "resistance", 4),
    { price: Math.max(...args.candles1h.slice(-24).map((candle) => candle.high)), weight: 2 },
    { price: Math.max(...args.candles4h.slice(-20).map((candle) => candle.high)), weight: 3 },
  ];

  const support = pickNearestLevel(clusterLevels(supportCandidates), args.price, "support");
  const resistance = pickNearestLevel(clusterLevels(resistanceCandidates), args.price, "resistance");

  return { support, resistance };
}
