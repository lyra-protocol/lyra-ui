import { MarketCandle, MarketDirectoryItem } from "@/core/market/types";
import { MarketAnalysisGate } from "./analysis-gate";
import { buildDirectionalAssessment } from "./directional-plan";
import { getMarketLevels } from "./levels";
import { MarketOpportunity, MarketStructureState } from "./types";

type CandleMetrics = {
  change: number;
  range: number;
  positionInRange: number;
};

function getWindowMetrics(candles: MarketCandle[]): CandleMetrics {
  const open = candles[0]?.open ?? 0;
  const close = candles.at(-1)?.close ?? 0;
  const high = Math.max(...candles.map((candle) => candle.high));
  const low = Math.min(...candles.map((candle) => candle.low));

  return {
    change: open > 0 ? ((close - open) / open) * 100 : 0,
    range: close > 0 ? ((high - low) / close) * 100 : 0,
    positionInRange: high <= low ? 0.5 : Math.min(Math.max((close - low) / (high - low), 0), 1),
  };
}

function getMarketState(change1h: number, change4h: number, change1d: number): MarketStructureState {
  const weighted = change1h * 0.25 + change4h * 0.35 + change1d * 0.4;
  if (weighted >= 1.2) return "bullish";
  if (weighted <= -1.2) return "bearish";
  return "range";
}

function buildReasons(args: {
  state: MarketStructureState;
  support: number | null;
  resistance: number | null;
  longScore: number;
  shortScore: number;
  longConfidence: number;
  shortConfidence: number;
  metrics15m: CandleMetrics;
  metrics4h: CandleMetrics;
  metrics1d: CandleMetrics;
}) {
  return [
    `state is ${args.state}; 15m ${args.metrics15m.change.toFixed(2)}%, 4h ${args.metrics4h.change.toFixed(2)}%, 1d ${args.metrics1d.change.toFixed(2)}%`,
    `support ${args.support?.toFixed(2) ?? "--"} / resistance ${args.resistance?.toFixed(2) ?? "--"} with 4h range ${args.metrics4h.range.toFixed(2)}%`,
    `long score ${args.longScore.toFixed(1)} (${args.longConfidence}%) vs short score ${args.shortScore.toFixed(1)} (${args.shortConfidence}%)`,
  ];
}

export function scoreMarketOpportunity(args: {
  market: MarketDirectoryItem;
  candles15m: MarketCandle[];
  candles1h: MarketCandle[];
  candles4h: MarketCandle[];
  candles1d: MarketCandle[];
  gate: MarketAnalysisGate;
}): MarketOpportunity | null {
  if (
    args.candles15m.length < 12 ||
    args.candles1h.length < 12 ||
    args.candles4h.length < 12 ||
    args.candles1d.length < 30 ||
    args.market.current_price <= 0
  ) {
    return null;
  }

  const metrics15m = getWindowMetrics(args.candles15m);
  const metrics1h = getWindowMetrics(args.candles1h);
  const metrics4h = getWindowMetrics(args.candles4h);
  const metrics1d = getWindowMetrics(args.candles1d);
  const marketState = getMarketState(metrics1h.change, metrics4h.change, metrics1d.change);
  const { support, resistance } = getMarketLevels({
    price: args.market.current_price,
    candles15m: args.candles15m,
    candles1h: args.candles1h,
    candles4h: args.candles4h,
    candles1d: args.candles1d,
  });
  const longAssessment = buildDirectionalAssessment({
    direction: "long",
    marketState,
    price: args.market.current_price,
    support,
    resistance,
    metrics15m,
    metrics1h,
    metrics4h,
    metrics1d,
    volume24h: args.market.exchange_volume_24h ?? 0,
    maxLeverage: args.market.max_leverage,
  });
  const shortAssessment = buildDirectionalAssessment({
    direction: "short",
    marketState,
    price: args.market.current_price,
    support,
    resistance,
    metrics15m,
    metrics1h,
    metrics4h,
    metrics1d,
    volume24h: args.market.exchange_volume_24h ?? 0,
    maxLeverage: args.market.max_leverage,
  });
  const preferred = longAssessment.score >= shortAssessment.score ? longAssessment : shortAssessment;
  const preferredPlan = preferred.plan;
  const preferredDirection = preferred === longAssessment ? "long" : "short";
  const preferredEntryDistancePercent =
    preferredPlan.entry && args.market.current_price > 0
      ? Math.abs((args.market.current_price - preferredPlan.entry) / args.market.current_price) * 100
      : null;
  const aligned =
    (preferredDirection === "long" && args.gate.stance.includes("bullish")) ||
    (preferredDirection === "short" && args.gate.stance.includes("bearish")) ||
    args.gate.stance.includes("compression");
  const overextended =
    preferredDirection === "long"
      ? metrics4h.positionInRange >= 0.88 && metrics15m.change > 1.6
      : metrics4h.positionInRange <= 0.12 && metrics15m.change < -1.6;
  const bias = preferred.score < 7 ? "neutral" : preferredDirection;
  const verdict = !preferredPlan.executable
    ? preferred.score >= 6
      ? "watch"
      : "skip"
    : preferred.confidence >= 78 &&
        preferred.score >= 10.5 &&
        (preferredPlan.rr ?? 0) >= 1.5 &&
        (preferredEntryDistancePercent ?? Number.POSITIVE_INFINITY) <= 1.35 &&
        aligned &&
        !overextended
      ? "trade"
      : preferred.score >= 8.2 && (preferredPlan.rr ?? 0) >= 1.25
        ? "watch"
        : "skip";

  return {
    productId: args.market.id,
    symbol: `${args.market.base_currency}/${args.market.quote_currency}`,
    name: args.market.name,
    price: args.market.current_price,
    score: preferred.score,
    confidence: preferred.confidence,
    marketState,
    bias,
    verdict,
    setup: bias === "neutral" ? "none" : preferred.setup,
    support,
    resistance,
    trigger: preferred.trigger,
    invalidation: preferred.invalidation,
    reasons: buildReasons({
      state: marketState,
      support,
      resistance,
      longScore: longAssessment.score,
      shortScore: shortAssessment.score,
      longConfidence: longAssessment.confidence,
      shortConfidence: shortAssessment.confidence,
      metrics15m,
      metrics4h,
      metrics1d,
    }),
    longPlan: longAssessment.plan,
    shortPlan: shortAssessment.plan,
    elements: preferred.elements,
    regime: {
      stance: args.gate.stance,
      gateConfidence: args.gate.confidence,
      change90d: args.gate.change90d,
      change14d: args.gate.change14d,
      range90d: args.gate.range90d,
      positionInRange90d: args.gate.positionInRange90d,
      compressionRatio: args.gate.compressionRatio,
    },
    readiness: {
      preferredDirection: bias === "neutral" ? null : preferredDirection,
      preferredRr: preferredPlan.rr,
      entryDistancePercent:
        preferredEntryDistancePercent === null ? null : Number(preferredEntryDistancePercent.toFixed(2)),
      aligned,
      overextended,
    },
    metrics: {
      change15m: metrics15m.change,
      change1h: metrics1h.change,
      change4h: metrics4h.change,
      change1d: metrics1d.change,
      range15m: metrics15m.range,
      range1h: metrics1h.range,
      range4h: metrics4h.range,
      range1d: metrics1d.range,
      positionInRange15m: metrics15m.positionInRange,
      positionInRange4h: metrics4h.positionInRange,
      positionInRange1d: metrics1d.positionInRange,
      volume24h: args.market.exchange_volume_24h ?? 0,
    },
  };
}
