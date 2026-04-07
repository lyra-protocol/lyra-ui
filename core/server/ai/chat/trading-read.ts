import { ParsedTradingPlan, parseTradingPlan } from "@/core/ai/trading-plan";
import { AiSignalSummary } from "@/core/ai/signal";
import { TradingSnapshot } from "@/core/server/ai/context/trading-snapshot-service";
import { MarketOpportunity } from "@/core/server/ai/market-scan/types";

function formatLevel(value: number | null) {
  return value !== null && Number.isFinite(value) ? value.toFixed(4).replace(/\.?0+$/, "") : "--";
}

function formatStatus(status: TradingSnapshot["status"] | null | undefined) {
  if (status === "TRADE") return "Trade";
  if (status === "WAIT") return "Watch";
  return "No Trade Zone";
}

function pickLeverage(confidence: number | null, direction: "long" | "short", signal: AiSignalSummary | null) {
  if (!signal || signal.bias !== direction || signal.verdict !== "trade") {
    return "none";
  }

  const score = signal.confidence ?? confidence ?? 0;
  if (score >= 90) return "10x";
  if (score >= 84) return "7x";
  if (score >= 78) return "5x";
  return "3x";
}

function buildNoTradeLine(snapshot: TradingSnapshot) {
  if (!snapshot.noTradeZone.active) {
    return "No trade only if price starts chopping without reclaim or rejection.";
  }

  return `Stay out inside ${formatLevel(snapshot.noTradeZone.low)} - ${formatLevel(snapshot.noTradeZone.high)}.`;
}

function hasStructuredTradeRead(plan: ParsedTradingPlan | null) {
  return Boolean(plan?.market && plan?.status && plan?.long.entry && plan?.short.entry);
}

export function buildStructuredTradingRead(snapshot: TradingSnapshot, signal: AiSignalSummary | null) {
  return [
    `MARKET: ${snapshot.market}`,
    `SUPPORT: ${formatLevel(snapshot.support)}`,
    `RESISTANCE: ${formatLevel(snapshot.resistance)}`,
    "",
    "LONG:",
    `Entry: ${snapshot.longPlan.entry}`,
    `SL: ${snapshot.longPlan.stopLoss}`,
    `TP: ${snapshot.longPlan.takeProfit}`,
    `Leverage: ${pickLeverage(signal?.confidence ?? null, "long", signal)}`,
    "",
    "SHORT:",
    `Entry: ${snapshot.shortPlan.entry}`,
    `SL: ${snapshot.shortPlan.stopLoss}`,
    `TP: ${snapshot.shortPlan.takeProfit}`,
    `Leverage: ${pickLeverage(signal?.confidence ?? null, "short", signal)}`,
    "",
    `STATUS: ${formatStatus(snapshot.status)}`,
    `NO TRADE: ${buildNoTradeLine(snapshot)}`,
  ].join("\n");
}

function formatPlanLevel(value: number | null) {
  return value === null ? "none" : formatLevel(value);
}

export function buildStructuredTradingReadFromOpportunity(opportunity: MarketOpportunity) {
  const market =
    opportunity.marketState === "bullish" ? "Bullish" : opportunity.marketState === "bearish" ? "Bearish" : "Range";
  const status =
    opportunity.verdict === "trade" ? "Trade" : opportunity.verdict === "watch" ? "Watch" : "No Trade Zone";

  return [
    `MARKET: ${market}`,
    `SUPPORT: ${formatLevel(opportunity.support)}`,
    `RESISTANCE: ${formatLevel(opportunity.resistance)}`,
    "",
    "LONG:",
    `Entry: ${formatPlanLevel(opportunity.longPlan.entry)}`,
    `SL: ${formatPlanLevel(opportunity.longPlan.stopLoss)}`,
    `TP: ${formatPlanLevel(opportunity.longPlan.takeProfit)}`,
    `Leverage: ${opportunity.longPlan.leverage ? `${opportunity.longPlan.leverage}x` : "none"}`,
    "",
    "SHORT:",
    `Entry: ${formatPlanLevel(opportunity.shortPlan.entry)}`,
    `SL: ${formatPlanLevel(opportunity.shortPlan.stopLoss)}`,
    `TP: ${formatPlanLevel(opportunity.shortPlan.takeProfit)}`,
    `Leverage: ${opportunity.shortPlan.leverage ? `${opportunity.shortPlan.leverage}x` : "none"}`,
    "",
    `STATUS: ${status}`,
    `NO TRADE: ${opportunity.verdict === "trade" ? `Only act on ${opportunity.trigger}.` : "Wait for the cleaner trigger or move on."}`,
  ].join("\n");
}

export function normalizeTradingReadOutput(args: {
  content: string;
  snapshot: TradingSnapshot | null;
  signal: AiSignalSummary | null;
  opportunity?: MarketOpportunity | null;
}) {
  const content = args.content.trim();
  const parsed = parseTradingPlan(content);
  if (hasStructuredTradeRead(parsed)) {
    return content;
  }

  if (args.opportunity) {
    return buildStructuredTradingReadFromOpportunity(args.opportunity);
  }

  if (!args.snapshot) {
    return content;
  }

  return buildStructuredTradingRead(args.snapshot, args.signal);
}
