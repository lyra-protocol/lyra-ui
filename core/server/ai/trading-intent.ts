import { AiContextPacket } from "@/core/ai/types";

function describePosition(context: AiContextPacket) {
  if (!context.activePosition) {
    return "No open position. Primary goal is to identify whether there is a high-quality trade, a watch condition, or no trade.";
  }

  return `There is an open ${context.activePosition.direction} position in ${context.activePosition.symbol}. The goal is to manage risk and decide whether to hold, add, reduce, or exit.`;
}

export function buildTradingIntentBrief(context: AiContextPacket) {
  return [
    "Trading intent:",
    "- Lyra exists to help the user trade well, not to chat casually.",
    "- The default objective is to decide whether there is an edge right now.",
    "- If there is no edge, say so clearly and recommend watch / stand aside / look elsewhere.",
    "- Staying out of the market is a valid decision.",
    describePosition(context),
    "Default response shape for broad market questions:",
    "1. Verdict: Trade / Watch / No trade",
    "2. Bias: Long / Short / Neutral",
    "3. Why: 2-4 compact bullets grounded in current market context",
    "4. Trigger: what would make the setup valid or invalid",
    "5. Action: trade now, observe, or look elsewhere",
  ].join("\n");
}
