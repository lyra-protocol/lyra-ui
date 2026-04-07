import "server-only";

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { AiSignalSummary } from "@/core/ai/signal";
import { AiChatRequest, AiContextPacket, AiThread, AiWorkspaceSelection } from "@/core/ai/types";
import { getAzureOpenAiClient, getAzureOpenAiModel } from "@/core/server/ai/azure-openai-client";
import { AiChatStreamCallbacks } from "@/core/server/ai/chat/types";
import { getMultiTimeframeHistorySummary } from "@/core/server/ai/context/market-history-service";
import { getTradingSnapshot } from "@/core/server/ai/context/trading-snapshot-service";
import {
  buildSignalContextBlock,
  buildSignalContract,
  buildSignalSummaryFromTradingSnapshot,
  buildSignalSummaryFromOpportunity,
  isPortfolioQuestion,
  pickPrimaryOpportunity,
  shouldUseSignalContract,
} from "@/core/server/ai/chat/signal-metadata";
import { normalizeTradingReadOutput } from "@/core/server/ai/chat/trading-read";
import { normalizeAiTextOutput } from "@/core/server/ai/chat/response-normalizer";
import { scanMarketsForSetups } from "@/core/server/ai/market-scan/scan-service";
import { listAiMessages } from "@/core/server/ai/conversation/repository";
import { searchPublicMarketResearch } from "@/core/server/ai/research/public-research-service";
import { searchThreadMemory } from "@/core/server/ai/retrieval/thread-memory-search-service";

function shouldIncludeResearch(message: string) {
  const value = message.toLowerCase();
  return (
    value.includes("news") ||
    value.includes("recent") ||
    value.includes("why") ||
    value.includes("catalyst") ||
    value.includes("what happened")
  );
}

function shouldIncludeThreadMemory(message: string) {
  const value = message.toLowerCase();
  return (
    value.includes("previous") ||
    value.includes("earlier") ||
    value.includes("before") ||
    value.includes("last time") ||
    value.includes("thread")
  );
}

function shouldIncludeHistorySummary(message: string) {
  const value = message.toLowerCase();
  if (isPortfolioQuestion(message)) {
    return false;
  }
  return (
    value.includes("move") ||
    value.includes("movement") ||
    value.includes("history") ||
    value.includes("price action") ||
    value.includes("structure") ||
    value.includes("chart") ||
    value.includes("market")
  );
}

function shouldIncludeTradingSnapshot(message: string) {
  return !isPortfolioQuestion(message);
}

function shouldIncludeMarketScan(message: string) {
  const value = message.toLowerCase();
  return (
    value.includes("trade") ||
    value.includes("setup") ||
    value.includes("opportunity") ||
    value.includes("exploit") ||
    value.includes("explore") ||
    value.includes("other market") ||
    value.includes("elsewhere") ||
    value.includes("look elsewhere") ||
    value.includes("what should i trade") ||
    value.includes("what does the market say") ||
    value.includes("market say")
  );
}

function summarizeContext(context: AiContextPacket) {
  return [
    `Market: ${context.market.symbol} (${context.market.productId})`,
    `Timeframe: ${context.selection.activeTimeframe}`,
    context.market.price ? `Price: ${context.market.price}` : "Price: unavailable",
    context.account
      ? `Account: ${context.account.cashBalance} ${context.account.currency} cash, ${context.account.realizedPnl} realized PnL`
      : "Account: unavailable",
    context.activePosition
      ? `Position: ${context.activePosition.direction} ${context.activePosition.quantity} ${context.activePosition.symbol} @ ${context.activePosition.entryPrice}`
      : "Position: none",
    `Open positions: ${context.openPositions.length}`,
    `Recent trades: ${context.recentTrades.length}`,
    `Recent activity: ${context.recentActivity.length}`,
  ].join("\n");
}

function buildPortfolioState(context: AiContextPacket) {
  return {
    account: context.account,
    openPositions: context.openPositions.slice(0, 8),
    recentTrades: context.recentTrades.slice(0, 8),
    recentActivity: context.recentActivity.slice(0, 8),
  };
}

function buildMessages(args: {
  instructions: string;
  context: AiContextPacket;
  marketHistory: unknown;
  tradingSnapshot: Awaited<ReturnType<typeof getTradingSnapshot>>;
  threadMemory: Awaited<ReturnType<typeof searchThreadMemory>>;
  research: Awaited<ReturnType<typeof searchPublicMarketResearch>> | null;
  marketScan: Awaited<ReturnType<typeof scanMarketsForSetups>> | null;
  primarySignal: AiSignalSummary | null;
  history: Awaited<ReturnType<typeof listAiMessages>>;
  message: string;
}) {
  const historyMessages = args.history
    .filter((item) => item.role === "user" || item.role === "assistant")
    .slice(-8)
    .map<ChatCompletionMessageParam>((item) =>
      item.role === "user"
        ? { role: "user", content: item.content }
        : { role: "assistant", content: item.content }
    );

  const contextBlock = [
    "Workspace context:",
    summarizeContext(args.context),
    "",
    "Recent chart history summary:",
    JSON.stringify(args.marketHistory),
    "",
    "Current portfolio and trade state:",
    JSON.stringify(buildPortfolioState(args.context)),
    "",
    "Structured trading snapshot:",
    JSON.stringify(args.tradingSnapshot),
    "",
    "Related previous thread memory:",
    JSON.stringify(args.threadMemory),
    "",
    "Primary structured setup read:",
    buildSignalContextBlock(args.primarySignal),
    "",
    "Ranked market scan:",
    JSON.stringify(args.marketScan ?? []),
    "",
    "External research:",
    JSON.stringify(args.research ?? { enabled: false, summary: "Not requested." }),
    "",
    "Response contract:",
    buildSignalContract(args.message, args.primarySignal),
  ].join("\n");

  return [
    { role: "system", content: args.instructions },
    {
      role: "system",
      content:
        "Tool calling is unavailable for this model. Use the provided workspace context, history, thread memory, and research payload directly.",
    },
    { role: "system", content: contextBlock },
    ...historyMessages,
    { role: "user", content: args.message },
  ] satisfies ChatCompletionMessageParam[];
}

export async function streamAiChatWithChatCompletions(args: {
  payload: AiChatRequest;
  effectiveSelection: AiWorkspaceSelection;
  thread: AiThread;
  context: AiContextPacket;
  instructions: string;
  callbacks: AiChatStreamCallbacks;
}) {
  const [history, marketHistory, tradingSnapshot, threadMemory, research, marketScan] = await Promise.all([
    listAiMessages(args.thread.id),
    shouldIncludeHistorySummary(args.payload.message)
      ? getMultiTimeframeHistorySummary(args.effectiveSelection.activeProductId, [
          "15m",
          "1h",
          "4h",
          args.effectiveSelection.activeTimeframe,
        ]).catch(() => [])
      : Promise.resolve([]),
    shouldIncludeTradingSnapshot(args.payload.message)
      ? getTradingSnapshot(
          args.effectiveSelection.activeProductId,
          args.effectiveSelection.activeTimeframe === "1d" ? "15m" : args.effectiveSelection.activeTimeframe
        ).catch(() => null)
      : Promise.resolve(null),
    shouldIncludeThreadMemory(args.payload.message)
      ? searchThreadMemory({
          workspaceUserId: args.thread.workspaceUserId,
          query: args.payload.message,
          excludeThreadId: args.thread.id,
        }).catch(() => [])
      : Promise.resolve([]),
    shouldIncludeResearch(args.payload.message)
      ? searchPublicMarketResearch(args.payload.message).catch(() => null)
      : Promise.resolve(null),
    shouldIncludeMarketScan(args.payload.message)
      ? scanMarketsForSetups({
          limit: 5,
          includeProductId: args.effectiveSelection.activeProductId,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const primaryOpportunity = pickPrimaryOpportunity(
    marketScan,
    args.effectiveSelection.activeProductId
  );
  const primarySignal = tradingSnapshot
    ? buildSignalSummaryFromTradingSnapshot(
        tradingSnapshot,
        args.effectiveSelection.activeProductId,
        args.context.market.symbol || args.effectiveSelection.activeProductId
      )
    : primaryOpportunity
      ? buildSignalSummaryFromOpportunity(primaryOpportunity, args.effectiveSelection.activeTimeframe)
      : null;

  const stream = await getAzureOpenAiClient().chat.completions.create({
    model: getAzureOpenAiModel(),
    messages: buildMessages({
      instructions: args.instructions,
      context: args.context,
      marketHistory,
      tradingSnapshot,
      threadMemory,
      research,
      marketScan,
      primarySignal,
      history,
      message: args.payload.message,
    }),
    stream: true,
    max_tokens: 900,
    temperature: 0.2,
  });

  let content = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      content += delta;
      args.callbacks.onTextDelta({ delta });
    }
  }

  const normalizedContent = shouldUseSignalContract(args.payload.message)
    ? normalizeTradingReadOutput({
        content,
        snapshot: tradingSnapshot,
        signal: primarySignal,
        opportunity: primaryOpportunity,
      })
    : normalizeAiTextOutput({
        message: args.payload.message,
        content,
        context: args.context,
      });

  return {
    responseId: null,
    content: normalizedContent,
    signal:
      shouldUseSignalContract(args.payload.message) && primarySignal
        ? primarySignal
        : null,
  };
}
