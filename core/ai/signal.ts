import { AiAlert } from "@/core/ai/types";
import { MarketTimeframe } from "@/core/market/types";

export type AiSignalVerdict = "trade" | "watch" | "skip";
export type AiSignalBias = "long" | "short" | "neutral";
export type AiSignalSetup = "continuation" | "pullback" | "breakdown" | "bounce" | "none";
export type AiSignalMarketState = "bullish" | "bearish" | "range";

export type AiSignalTradeLeg = {
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  leverage: number | null;
  rr: number | null;
  executable: boolean;
  condition: string | null;
};

export type AiSignalSummary = {
  productId: string;
  symbol: string;
  timeframe: MarketTimeframe;
  price: number | null;
  marketState?: AiSignalMarketState | null;
  verdict: AiSignalVerdict;
  bias: AiSignalBias;
  confidence: number | null;
  setup: AiSignalSetup | null;
  support?: number | null;
  resistance?: number | null;
  trigger: string | null;
  invalidation: string | null;
  longPlan?: AiSignalTradeLeg | null;
  shortPlan?: AiSignalTradeLeg | null;
  reasons: string[];
};

export type AiResponseSections = {
  summary: string;
  reasonLines: string[];
  trigger: string | null;
  action: string | null;
  risk: string | null;
  implication: string | null;
};

const SECTION_LABELS = new Map([
  ["why", "reason"],
  ["reason", "reason"],
  ["trigger", "trigger"],
  ["action", "action"],
  ["risk", "risk"],
  ["implication", "implication"],
]);

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringValue(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function toTradeLeg(value: unknown): AiSignalTradeLeg | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const packet = value as Record<string, unknown>;
  return {
    entry: toNumber(packet.entry),
    stopLoss: toNumber(packet.stopLoss),
    takeProfit: toNumber(packet.takeProfit),
    leverage: toNumber(packet.leverage),
    rr: toNumber(packet.rr),
    executable: Boolean(packet.executable),
    condition: toStringValue(packet.condition),
  };
}

export function formatAiSignalVerdict(verdict: AiSignalVerdict) {
  if (verdict === "trade") return "Trade";
  if (verdict === "watch") return "Watch";
  return "No trade";
}

export function isAiSignalActionable(signal: AiSignalSummary | null | undefined) {
  return Boolean(
    signal &&
      signal.verdict === "trade" &&
      signal.bias !== "neutral" &&
      (signal.confidence ?? 0) >= 72
  );
}

export function extractAiResponseSections(content: string): AiResponseSections {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const summaryLines: string[] = [];
  const reasonLines: string[] = [];
  let trigger: string | null = null;
  let action: string | null = null;
  let risk: string | null = null;
  let implication: string | null = null;
  let activeSection: "reason" | "summary" = "summary";

  for (const line of lines) {
    const labelMatch = line.match(/^([A-Za-z /]+):\s*(.+)?$/);
    if (labelMatch) {
      const normalized = SECTION_LABELS.get(labelMatch[1].trim().toLowerCase()) ?? null;
      const value = labelMatch[2]?.trim() ?? "";
      if (normalized === "reason") {
        activeSection = "reason";
        if (value) reasonLines.push(value);
        continue;
      }
      if (normalized === "trigger") {
        trigger = value || trigger;
        activeSection = "summary";
        continue;
      }
      if (normalized === "action") {
        action = value || action;
        activeSection = "summary";
        continue;
      }
      if (normalized === "risk") {
        risk = value || risk;
        activeSection = "summary";
        continue;
      }
      if (normalized === "implication") {
        implication = value || implication;
        activeSection = "summary";
        continue;
      }
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      if (activeSection === "reason") {
        reasonLines.push(bullet[1].trim());
      } else {
        summaryLines.push(bullet[1].trim());
      }
      continue;
    }

    if (activeSection === "reason") {
      reasonLines.push(line);
    } else {
      summaryLines.push(line);
    }
  }

  return {
    summary: summaryLines.join(" ").trim(),
    reasonLines,
    trigger,
    action,
    risk,
    implication,
  };
}

export function getAiSignalFromAlert(alert: AiAlert): AiSignalSummary | null {
  const packet = alert.contextPacket ?? {};
  const signal = packet.signal as Record<string, unknown> | undefined;
  const metrics = signal?.metrics as Record<string, unknown> | undefined;
  const rawBias = typeof metrics?.bias === "string" ? metrics.bias : "neutral";
  const rawSetup = typeof metrics?.setup === "string" ? metrics.setup : "none";

  if (!alert.productId) {
    return null;
  }

  return {
    productId: alert.productId,
    symbol: toStringValue(metrics?.symbol) ?? alert.productId,
    timeframe: (signal?.timeframe as MarketTimeframe | undefined) ?? "1h",
    price: toNumber(metrics?.price),
    marketState:
      signal?.marketState === "bullish" || signal?.marketState === "bearish" || signal?.marketState === "range"
        ? signal.marketState
        : null,
    verdict: (toNumber(metrics?.confidence) ?? 0) >= 72 ? "trade" : "watch",
    bias: rawBias === "long" || rawBias === "short" ? rawBias : "neutral",
    confidence: toNumber(metrics?.confidence),
    setup: rawSetup === "continuation" || rawSetup === "pullback" || rawSetup === "breakdown" || rawSetup === "bounce" ? rawSetup : "none",
    support: toNumber(metrics?.support),
    resistance: toNumber(metrics?.resistance),
    trigger: toStringValue(metrics?.trigger),
    invalidation: toStringValue(metrics?.invalidation),
    longPlan: toTradeLeg(metrics?.longPlan),
    shortPlan: toTradeLeg(metrics?.shortPlan),
    reasons: [alert.body].filter(Boolean),
  };
}
