import "server-only";

import { AiSignalSummary } from "@/core/ai/signal";
import { MarketTimeframe } from "@/core/market/types";
import { TradingSnapshot } from "@/core/server/ai/context/trading-snapshot-service";
import { MarketOpportunity } from "@/core/server/ai/market-scan/types";

function normalizeMessage(message: string) {
  return message.toLowerCase();
}

function parseLevel(value: string) {
  const parsed = Number(value.match(/-?\d+(?:\.\d+)?/)?.[0] ?? NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isPortfolioQuestion(message: string) {
  const value = normalizeMessage(message);
  return (
    value.includes("current trades") ||
    value.includes("what trades do we currently have") ||
    value.includes("what trades do we have") ||
    value.includes("open trades") ||
    value.includes("open positions") ||
    value.includes("current position") ||
    value.includes("portfolio") ||
    value.includes("account exposure")
  );
}

export function shouldUseSignalContract(message: string) {
  const value = normalizeMessage(message);
  if (isPortfolioQuestion(value)) {
    return false;
  }
  return (
    value.includes("trade") ||
    value.includes("market") ||
    value.includes("setup") ||
    value.includes("exploit") ||
    value.includes("explore") ||
    value.includes("movement") ||
    value.includes("price action") ||
    value.includes("what does") ||
    value.includes("should i")
  );
}

export function pickPrimaryOpportunity(
  opportunities: MarketOpportunity[] | null,
  activeProductId: string
) {
  if (!opportunities?.length) {
    return null;
  }

  return (
    opportunities.find((item) => item.productId === activeProductId) ??
    opportunities.find((item) => item.verdict === "trade") ??
    opportunities[0]
  );
}

export function buildSignalSummaryFromOpportunity(
  opportunity: MarketOpportunity,
  timeframe: MarketTimeframe
): AiSignalSummary {
  return {
    productId: opportunity.productId,
    symbol: opportunity.symbol,
    timeframe,
    price: opportunity.price,
    marketState: opportunity.marketState,
    verdict: opportunity.verdict,
    bias: opportunity.bias,
    confidence: opportunity.confidence,
    setup: opportunity.setup,
    support: opportunity.support,
    resistance: opportunity.resistance,
    trigger: opportunity.trigger,
    invalidation: opportunity.invalidation,
    longPlan: {
      ...opportunity.longPlan,
      condition: opportunity.longPlan.condition,
    },
    shortPlan: {
      ...opportunity.shortPlan,
      condition: opportunity.shortPlan.condition,
    },
    reasons: opportunity.reasons.slice(0, 3),
  };
}

export function buildSignalSummaryFromTradingSnapshot(
  snapshot: TradingSnapshot,
  productId: string,
  symbol: string
): AiSignalSummary {
  return {
    productId,
    symbol,
    timeframe: snapshot.focusTimeframe,
    price: snapshot.currentPrice,
    marketState:
      snapshot.market === "Bullish" ? "bullish" : snapshot.market === "Bearish" ? "bearish" : "range",
    verdict:
      snapshot.status === "TRADE" ? "trade" : snapshot.status === "WAIT" ? "watch" : "skip",
    bias:
      snapshot.market === "Bullish" ? "long" : snapshot.market === "Bearish" ? "short" : "neutral",
    confidence: null,
    setup: "none",
    support: snapshot.support,
    resistance: snapshot.resistance,
    trigger: snapshot.market === "Range" ? snapshot.shortPlan.condition : snapshot.longPlan.condition,
    invalidation:
      snapshot.market === "Bullish"
        ? `Below ${snapshot.longPlan.stopLoss}`
        : snapshot.market === "Bearish"
          ? `Above ${snapshot.shortPlan.stopLoss}`
          : "No clean invalidation yet.",
    longPlan: {
      entry: parseLevel(snapshot.longPlan.entry),
      stopLoss: parseLevel(snapshot.longPlan.stopLoss),
      takeProfit: parseLevel(snapshot.longPlan.takeProfit),
      leverage: null,
      rr: null,
      executable: snapshot.status === "TRADE" || snapshot.status === "WAIT",
      condition: snapshot.longPlan.condition,
    },
    shortPlan: {
      entry: parseLevel(snapshot.shortPlan.entry),
      stopLoss: parseLevel(snapshot.shortPlan.stopLoss),
      takeProfit: parseLevel(snapshot.shortPlan.takeProfit),
      leverage: null,
      rr: null,
      executable: snapshot.status === "TRADE" || snapshot.status === "WAIT",
      condition: snapshot.shortPlan.condition,
    },
    reasons: [snapshot.threeMonthStance],
  };
}

export function buildSignalContract(message: string, signal: AiSignalSummary | null) {
  if (isPortfolioQuestion(message)) {
    return [
      "The user is asking about current trades or positions.",
      "Answer directly from workspace state.",
      "List open positions first.",
      "Then list the most recent trades.",
      "If there are no open positions, say that clearly.",
      "Keep it short and factual.",
    ].join("\n");
  }
  if (!shouldUseSignalContract(message)) {
    return "Answer directly, briefly, and with trader intent.";
  }

  return [
    "Return a trading read in this exact format only.",
    "Do not add an intro sentence.",
    "Do not use numbered lists, bullets, or sections like Verdict / Bias / Why / Trigger / Action.",
    "MARKET: Bullish / Bearish / Range",
    "SUPPORT: exact level",
    "RESISTANCE: exact level",
    "LONG:",
    "Entry: exact level or exact range",
    "SL: exact level or none",
    "TP: exact level or none",
    "Leverage: exact integer x or none",
    "SHORT:",
    "Entry: exact level or exact range",
    "SL: exact level or none",
    "TP: exact level or none",
    "Leverage: exact integer x or none",
    "STATUS: Trade / Watch / No Trade Zone",
    "NO TRADE: one short line for when to stay out",
    signal?.confidence ? `Use the supplied confidence context (${signal.confidence}%).` : "Use the supplied context only.",
    "Pick integer leverage between 1x and 40x only when the setup is clean. Otherwise use none.",
    "If the setup is not clean, the status must be No Trade Zone or Watch.",
    "Keep it short, direct, and executable.",
  ].join("\n");
}

export function buildSignalContextBlock(signal: AiSignalSummary | null) {
  if (!signal) {
    return "No structured market setup summary was available.";
  }

  return JSON.stringify(signal);
}
