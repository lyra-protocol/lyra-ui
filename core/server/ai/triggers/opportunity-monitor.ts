import "server-only";

import { evaluateAiTriggerSignal } from "@/core/server/ai/triggers/evaluate-signal";
import { scanMarketsForSetups } from "@/core/server/ai/market-scan/scan-service";
import { AiRequestContext } from "@/core/server/ai/auth/request-context";
import { MarketOpportunity } from "@/core/server/ai/market-scan/types";

const SCAN_COOLDOWN_MS = 5 * 60 * 1000;
const ALERT_COOLDOWN_MS = 20 * 60 * 1000;
const LAST_SCAN_BY_USER = new Map<string, number>();
const LAST_ALERT_BY_KEY = new Map<string, number>();

function shouldSkipScan(workspaceUserId: string) {
  const lastScan = LAST_SCAN_BY_USER.get(workspaceUserId) ?? 0;
  return Date.now() - lastScan < SCAN_COOLDOWN_MS;
}

function shouldSkipAlert(workspaceUserId: string, productId: string, bias: string) {
  const key = `${workspaceUserId}:${productId}:${bias}`;
  const lastAlert = LAST_ALERT_BY_KEY.get(key) ?? 0;
  return Date.now() - lastAlert < ALERT_COOLDOWN_MS;
}

function markAlert(workspaceUserId: string, productId: string, bias: string) {
  LAST_ALERT_BY_KEY.set(`${workspaceUserId}:${productId}:${bias}`, Date.now());
}

function getPreferredPlan(candidate: MarketOpportunity) {
  if (candidate.bias === "long") return candidate.longPlan;
  if (candidate.bias === "short") return candidate.shortPlan;
  return null;
}

function qualifiesForAlert(candidate: MarketOpportunity, requestContext: AiRequestContext) {
  const settings = requestContext.workspaceUser.aiOpportunitySettings;
  if (!settings.enabled || candidate.bias === "neutral" || candidate.verdict !== "trade") {
    return false;
  }

  const plan = getPreferredPlan(candidate);
  return Boolean(
    plan?.executable &&
      candidate.confidence >= settings.minimumConfidence &&
      candidate.score >= settings.minimumScore &&
      (plan.rr ?? 0) >= settings.minimumRiskReward &&
      (candidate.readiness.entryDistancePercent ?? Number.POSITIVE_INFINITY) <= settings.maximumEntryDistancePercent &&
      candidate.readiness.aligned &&
      !candidate.readiness.overextended &&
      !shouldSkipAlert(requestContext.workspaceUser.id, candidate.productId, candidate.bias)
  );
}

export async function runAiOpportunityMonitor(requestContext: AiRequestContext) {
  const workspaceUserId = requestContext.workspaceUser.id;
  if (shouldSkipScan(workspaceUserId)) {
    return;
  }

  LAST_SCAN_BY_USER.set(workspaceUserId, Date.now());
  const opportunities = await scanMarketsForSetups({ limit: 3, candidateCount: 10 });
  const settings = requestContext.workspaceUser.aiOpportunitySettings;
  const candidates = opportunities
    .filter((item) => qualifiesForAlert(item, requestContext))
    .sort((left, right) => {
      const leftPlan = getPreferredPlan(left);
      const rightPlan = getPreferredPlan(right);
      const leftQuality =
        left.score + left.confidence * 0.08 + (leftPlan?.rr ?? 0) * 1.2 - (left.readiness.entryDistancePercent ?? 5);
      const rightQuality =
        right.score + right.confidence * 0.08 + (rightPlan?.rr ?? 0) * 1.2 - (right.readiness.entryDistancePercent ?? 5);
      return rightQuality - leftQuality;
    });

  for (const candidate of candidates.slice(0, settings.maximumAlertsPerScan)) {
    const plan = getPreferredPlan(candidate);
    const result = await evaluateAiTriggerSignal(
      requestContext,
      {
        type: "market_opportunity",
        productId: candidate.productId,
        timeframe: "1h",
        summary: `${candidate.bias} ${candidate.setup} setup scored ${candidate.score.toFixed(1)} with ${candidate.confidence}% confidence, ${plan?.rr?.toFixed(2) ?? "--"}R, ${candidate.readiness.entryDistancePercent?.toFixed(2) ?? "--"}% from trigger.`,
        metrics: {
          symbol: candidate.symbol,
          price: Number(candidate.price.toFixed(4)),
          marketState: candidate.marketState,
          score: Number(candidate.score.toFixed(2)),
          confidence: candidate.confidence,
          bias: candidate.bias,
          setup: candidate.setup,
          support: candidate.support ? Number(candidate.support.toFixed(4)) : null,
          resistance: candidate.resistance ? Number(candidate.resistance.toFixed(4)) : null,
          change1h: Number(candidate.metrics.change1h.toFixed(2)),
          change4h: Number(candidate.metrics.change4h.toFixed(2)),
          change1d: Number(candidate.metrics.change1d.toFixed(2)),
          range4h: Number(candidate.metrics.range4h.toFixed(2)),
          trigger: candidate.trigger,
          invalidation: candidate.invalidation,
          readiness: candidate.readiness,
          regime: candidate.regime,
          longPlan: candidate.longPlan,
          shortPlan: candidate.shortPlan,
          elements: candidate.elements,
        },
      },
      "scanner"
    );

    if (result.alert) {
      markAlert(workspaceUserId, candidate.productId, candidate.bias);
    }
  }
}
