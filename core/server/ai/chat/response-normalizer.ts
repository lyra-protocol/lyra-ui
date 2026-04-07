import { AiContextPacket } from "@/core/ai/types";
import { formatPrice } from "@/core/market/format";
import { isPortfolioQuestion } from "@/core/server/ai/chat/signal-metadata";

const LEADING_FILLER_PATTERNS = [
  /^sure[,.!\s-]*/i,
  /^here'?s (a )?(quick|concise|clean)?\s*(summary|read|breakdown)[:\s-]*/i,
  /^based on the (current )?(workspace|market) context[:,\s-]*/i,
  /^to (determine|answer) (if )?.+?:\s*/i,
];

const DROP_LINE_PATTERNS = [
  /^what (specific )?aspect .+\?$/i,
  /^what would you like to do next\??$/i,
  /^you may want to check the following:?$/i,
  /^to proceed, you might want to:?$/i,
  /^if external research was enabled.+$/i,
];

const LABEL_LINE_PATTERN = /^(verdict|bias|why|trigger|action|risk|implication|summary|reason):\s*(.+)$/i;
const NUMBERED_LABEL_PATTERN = /^\d+\.\s*(verdict|bias|why|trigger|action|risk|implication|summary|reason):\s*(.+)$/i;

function normalizeLeadLine(line: string) {
  let next = line.trim();
  for (const pattern of LEADING_FILLER_PATTERNS) {
    next = next.replace(pattern, "").trim();
  }
  return next;
}

function cleanGenericText(content: string) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => {
      if (!line) {
        return index > 0 && index < all.length - 1;
      }
      return !DROP_LINE_PATTERNS.some((pattern) => pattern.test(line));
    })
    .map((line, index) => (index === 0 ? normalizeLeadLine(line) : line))
    .filter(Boolean)
    .map((line) => {
      const numberedLabel = line.match(NUMBERED_LABEL_PATTERN);
      if (numberedLabel) {
        const [, label, value] = numberedLabel;
        return `- **${label.charAt(0).toUpperCase()}${label.slice(1).toLowerCase()}:** ${value.trim()}`;
      }

      const labelLine = line.match(LABEL_LINE_PATTERN);
      if (labelLine) {
        const [, label, value] = labelLine;
        return `- **${label.charAt(0).toUpperCase()}${label.slice(1).toLowerCase()}:** ${value.trim()}`;
      }

      return line;
    });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function formatPositionLine(context: AiContextPacket) {
  if (context.openPositions.length === 0) {
    return ["### Open positions", "- None."];
  }

  return [
    "### Open positions",
    ...context.openPositions.slice(0, 6).map(
      (position) =>
        `- ${position.direction === "short" ? "Short" : "Long"} ${position.symbol} · ${position.quantity.toFixed(4).replace(/\.?0+$/, "")} @ ${formatPrice(position.entryPrice)} · ${position.leverage}x`
    ),
  ];
}

function formatRecentTradeLine(context: AiContextPacket) {
  if (context.recentTrades.length === 0) {
    return ["### Recent trades", "- None."];
  }

  return [
    "### Recent trades",
    ...context.recentTrades.slice(0, 5).map(
      (trade) =>
        `- ${trade.symbol} · ${trade.action} · ${trade.quantity.toFixed(4).replace(/\.?0+$/, "")} @ ${formatPrice(trade.price)}${trade.realizedPnl ? ` · ${trade.realizedPnl >= 0 ? "+" : ""}${formatPrice(trade.realizedPnl)}` : ""}`
    ),
  ];
}

function formatAccountBlock(context: AiContextPacket) {
  if (!context.account) {
    return ["### Account", "- Unavailable."];
  }

  return [
    "### Account",
    `- Cash: ${formatPrice(context.account.cashBalance)} ${context.account.currency}`,
    `- Realized PnL: ${context.account.realizedPnl >= 0 ? "+" : ""}${formatPrice(context.account.realizedPnl)} ${context.account.currency}`,
  ];
}

function buildPortfolioAnswer(context: AiContextPacket) {
  return [
    ...formatPositionLine(context),
    "",
    ...formatRecentTradeLine(context),
    "",
    ...formatAccountBlock(context),
  ].join("\n");
}

export function normalizeAiTextOutput(args: {
  message: string;
  content: string;
  context: AiContextPacket;
}) {
  if (isPortfolioQuestion(args.message)) {
    return buildPortfolioAnswer(args.context);
  }

  const cleaned = cleanGenericText(args.content);
  return cleaned || "No clear read yet.";
}
