import {
  MarketOpportunityElements,
  MarketOpportunityPlan,
  MarketOpportunitySetup,
  MarketStructureState,
} from "./types";

type CandleMetrics = {
  change: number;
  range: number;
  positionInRange: number;
};

type DirectionalAssessment = {
  plan: MarketOpportunityPlan;
  setup: MarketOpportunitySetup;
  trigger: string;
  invalidation: string;
  elements: MarketOpportunityElements;
  score: number;
  confidence: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getLeverageSuggestion(maxLeverage: number | null, confidence: number, rr: number | null) {
  const cap = Math.min(maxLeverage ?? 5, 40);
  if (!rr || rr < 1.2) return null;
  if (confidence >= 88 && rr >= 2.4) return Math.min(cap, 10);
  if (confidence >= 80 && rr >= 1.9) return Math.min(cap, 7);
  if (confidence >= 72 && rr >= 1.5) return Math.min(cap, 5);
  return Math.min(cap, 3);
}

export function buildDirectionalAssessment(args: {
  direction: "long" | "short";
  marketState: MarketStructureState;
  price: number;
  support: number | null;
  resistance: number | null;
  metrics15m: CandleMetrics;
  metrics1h: CandleMetrics;
  metrics4h: CandleMetrics;
  metrics1d: CandleMetrics;
  volume24h: number;
  maxLeverage: number | null;
}) {
  const rangeSize =
    args.support !== null && args.resistance !== null
      ? Math.max(args.resistance - args.support, args.price * 0.01)
      : args.price * Math.max(args.metrics4h.range / 100, 0.018);
  const buffer = args.price * Math.max(args.metrics15m.range / 100 * 0.18, args.metrics1h.range / 100 * 0.1, 0.0035);
  const nearSupport = args.support !== null ? (args.price - args.support) / args.price : Number.POSITIVE_INFINITY;
  const nearResistance = args.resistance !== null ? (args.resistance - args.price) / args.price : Number.POSITIVE_INFINITY;
  const alignedChanges = [args.metrics1h.change, args.metrics4h.change, args.metrics1d.change].filter((change) =>
    args.direction === "long" ? change > 0 : change < 0
  ).length;
  const trend = alignedChanges / 3;
  const pullbackReady =
    args.direction === "long"
      ? args.support !== null && nearSupport <= Math.max(args.metrics4h.range / 100 * 0.22, 0.018)
      : args.resistance !== null && nearResistance <= Math.max(args.metrics4h.range / 100 * 0.22, 0.018);
  const breakoutReady =
    args.direction === "long"
      ? args.resistance !== null && nearResistance <= Math.max(args.metrics4h.range / 100 * 0.18, 0.012) && args.metrics15m.change > 0
      : args.support !== null && nearSupport <= Math.max(args.metrics4h.range / 100 * 0.18, 0.012) && args.metrics15m.change < 0;
  const setup: MarketOpportunitySetup =
    args.direction === "long"
      ? breakoutReady
        ? "continuation"
        : pullbackReady
          ? "pullback"
          : "none"
      : breakoutReady
        ? "breakdown"
        : pullbackReady
          ? "bounce"
          : "none";
  const entry =
    args.direction === "long"
      ? breakoutReady
        ? (args.resistance ?? args.price) + buffer * 0.25
        : args.support !== null
          ? args.support + buffer * 0.2
          : null
      : breakoutReady
        ? (args.support ?? args.price) - buffer * 0.25
        : args.resistance !== null
          ? args.resistance - buffer * 0.2
          : null;
  const stopLoss =
    entry === null
      ? null
      : args.direction === "long"
        ? breakoutReady
          ? (args.resistance ?? args.price) - buffer * 0.9
          : (args.support ?? args.price) - buffer
        : breakoutReady
          ? (args.support ?? args.price) + buffer * 0.9
          : (args.resistance ?? args.price) + buffer;
  const takeProfit =
    entry === null
      ? null
      : args.direction === "long"
        ? breakoutReady
          ? entry + Math.max(rangeSize * 0.85, buffer * 4)
          : args.resistance !== null
            ? args.resistance - buffer * 0.15
            : entry + rangeSize * 0.75
        : breakoutReady
          ? entry - Math.max(rangeSize * 0.85, buffer * 4)
          : args.support !== null
            ? args.support + buffer * 0.15
            : entry - rangeSize * 0.75;
  const risk = entry !== null && stopLoss !== null ? Math.abs(entry - stopLoss) : null;
  const reward = entry !== null && takeProfit !== null ? Math.abs(takeProfit - entry) : null;
  const rr = risk && reward && risk > 0 ? reward / risk : null;
  const middlePenalty =
    args.metrics4h.positionInRange > 0.42 && args.metrics4h.positionInRange < 0.58 && setup === "none" ? -2.5 : 0;
  const elements: MarketOpportunityElements = {
    trend: Number((trend * 4).toFixed(2)),
    location: Number(((pullbackReady || breakoutReady ? 3.2 : 0.9) + (setup === "none" ? 0 : 0.8)).toFixed(2)),
    structure: Number(
      ((args.direction === "long" ? args.marketState !== "bearish" : args.marketState !== "bullish") ? 2.4 : 0.8).toFixed(2)
    ),
    riskReward: Number((rr ? (rr >= 2.2 ? 4 : rr >= 1.6 ? 3 : rr >= 1.2 ? 1.8 : -1.5) : -2).toFixed(2)),
    liquidity: Number(clamp(Math.log10(Math.max(args.volume24h, 1)) - 4.6, 0, 2.2).toFixed(2)),
    volatility: Number(
      clamp(
        args.metrics4h.range >= 2.5 && args.metrics4h.range <= 18 && args.metrics15m.range >= 0.45 ? 2 : 0.9,
        0,
        2
      ).toFixed(2)
    ),
    penalty: middlePenalty,
  };
  const score = Number(
    (
      elements.trend +
      elements.location +
      elements.structure +
      elements.riskReward +
      elements.liquidity +
      elements.volatility +
      elements.penalty
    ).toFixed(2)
  );
  const confidence = Math.round(clamp(score * 6.8 + trend * 14 + (rr ? rr * 8 : 0), 18, 96));
  const executable = Boolean(entry && stopLoss && takeProfit && rr && rr >= 1.2 && score >= 6.5 && setup !== "none");

  return {
    plan: {
      entry,
      stopLoss,
      takeProfit,
      leverage: executable ? getLeverageSuggestion(args.maxLeverage, confidence, rr) : null,
      rr: rr ? Number(rr.toFixed(2)) : null,
      executable,
      condition:
        setup === "continuation" || setup === "breakdown"
          ? `${args.direction === "long" ? "break and hold above" : "break and hold below"} ${entry?.toFixed(2) ?? "--"}`
          : `${args.direction === "long" ? "hold support near" : "reject resistance near"} ${entry?.toFixed(2) ?? "--"}`,
    },
    setup,
    trigger:
      setup === "continuation" || setup === "breakdown"
        ? `${args.direction === "long" ? "trigger above" : "trigger below"} ${entry?.toFixed(2) ?? "--"}`
        : `${args.direction === "long" ? "hold above" : "reject below"} ${entry?.toFixed(2) ?? "--"}`,
    invalidation: `${args.direction === "long" ? "lose" : "reclaim"} ${stopLoss?.toFixed(2) ?? "--"}`,
    elements,
    score,
    confidence,
  } satisfies DirectionalAssessment;
}
