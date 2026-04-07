"use client";

import {
  AiSignalSummary,
  extractAiResponseSections,
  formatAiSignalVerdict,
  isAiSignalActionable,
} from "@/core/ai/signal";
import { getTradeDraftDefaults, ParsedTradingPlan, parseTradingPlan } from "@/core/ai/trading-plan";
import { AiMarkdownContent } from "@/components/workspace/context/ai-markdown-content";
import { AiSignalActions } from "@/components/workspace/context/ai-signal-actions";
import { AiSignalContextGrid } from "@/components/workspace/context/ai-signal-context-grid";
import { AiTradeEntryDraft } from "@/stores/ai-trade-entry-store";

type Props = {
  content: string;
  prompt?: string;
  signal?: AiSignalSummary | null;
  status: "complete" | "streaming" | "error";
  compact?: boolean;
  onQuickPrompt?: (prompt: string) => void;
  onEnterTrade?: (draft: AiTradeEntryDraft) => void;
};

function formatPlanValue(value: number | null) {
  return value === null ? "--" : value.toFixed(4).replace(/\.?0+$/, "");
}

function badgeClass(signal: AiSignalSummary | null | undefined) {
  if (!signal) {
    return "border-black/10 bg-white text-black/76";
  }
  if (signal.verdict === "trade") {
    return "border-black bg-black text-white";
  }
  if (signal.verdict === "watch") {
    return "border-black/10 bg-white text-black/76";
  }
  return "border-black/8 bg-white text-black/54";
}

export function AiSignalCard({
  content,
  prompt,
  signal,
  status,
  compact = false,
  onQuickPrompt,
  onEnterTrade,
}: Props) {
  const sections = extractAiResponseSections(content);
  const tradingPlan = parseTradingPlan(content);
  const structuredPlan: ParsedTradingPlan | null =
    tradingPlan ??
    (signal?.longPlan || signal?.shortPlan
      ? {
          market:
            signal.marketState === "bullish"
              ? "Bullish"
              : signal.marketState === "bearish"
                ? "Bearish"
                : signal.marketState === "range"
                  ? "Range"
                  : null,
          resistance: signal.resistance !== undefined ? formatPlanValue(signal.resistance ?? null) : null,
          support: signal.support !== undefined ? formatPlanValue(signal.support ?? null) : null,
          status: signal.verdict === "trade" ? "Trade" : signal.verdict === "watch" ? "Watch" : "No Trade Zone",
          noTrade: signal.verdict === "trade" ? `Only act on ${signal.trigger ?? "the trigger"}.` : "Wait for the cleaner trigger or skip it.",
          long: {
            entry: signal.longPlan?.entry !== undefined ? formatPlanValue(signal.longPlan.entry) : null,
            stopLoss: signal.longPlan?.stopLoss !== undefined ? formatPlanValue(signal.longPlan.stopLoss) : null,
            takeProfit: signal.longPlan?.takeProfit !== undefined ? formatPlanValue(signal.longPlan.takeProfit) : null,
            leverage: signal.longPlan?.leverage ?? null,
          },
          short: {
            entry: signal.shortPlan?.entry !== undefined ? formatPlanValue(signal.shortPlan.entry) : null,
            stopLoss: signal.shortPlan?.stopLoss !== undefined ? formatPlanValue(signal.shortPlan.stopLoss) : null,
            takeProfit: signal.shortPlan?.takeProfit !== undefined ? formatPlanValue(signal.shortPlan.takeProfit) : null,
            leverage: signal.shortPlan?.leverage ?? null,
          },
        }
      : null);
  const summary =
    sections.summary ||
    (status === "streaming" && !content.trim()
      ? "Reading current market and workspace…"
      : content.trim());
  const actionable = isAiSignalActionable(signal) && Boolean(onEnterTrade);
  const gridClass = compact ? "grid-cols-1 gap-1.5" : "grid-cols-2 gap-2";
  const reasons = signal?.reasons?.length ? signal.reasons : sections.reasonLines;
  const defaults = signal ? getTradeDraftDefaults(content, signal.bias) : null;
  const explainPrompt =
    signal ? `Break down ${signal.symbol} on ${signal.timeframe}. Tell me what you see, the trigger, and the risk.` : null;
  const alternativesPrompt =
    signal ? `If ${signal.symbol} is not the cleanest setup, scan for a better market and rank the best trade.` : null;

  return (
    <article className="border border-black/8 bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between gap-3 border-b border-black/6 px-2.5 py-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {signal ? (
              <>
                <span className={["inline-flex h-5 items-center border px-2 text-[9px] font-medium uppercase tracking-[0.12em]", badgeClass(signal)].join(" ")}>
                  {formatAiSignalVerdict(signal.verdict)}
                </span>
                <span className="text-[10px] text-black/54">
                  {signal.symbol} · {signal.timeframe}
                </span>
                <span className="text-[10px] text-black/42">
                  {signal.bias === "neutral" ? "Neutral" : `${signal.bias === "short" ? "Short" : "Long"} bias`}
                </span>
              </>
            ) : (
              <span className="text-[10px] uppercase tracking-[0.14em] text-black/34">Signal</span>
            )}
          </div>
          {prompt ? <p className="mt-1 text-[10px] text-black/42">{prompt}</p> : null}
        </div>
        {signal?.confidence ? (
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.12em] text-black/28">Confidence</p>
            <p className="text-[11px] font-medium text-black/82">{signal.confidence}%</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 px-2.5 py-2.5">
        {structuredPlan ? (
          <div className="grid gap-2 border-b border-black/6 pb-2 text-[10px] sm:grid-cols-4">
            <div>
              <p className="uppercase tracking-[0.12em] text-black/30">Market</p>
              <p className="mt-1 text-[11px] font-medium text-black/88">{structuredPlan.market ?? "Range"}</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.12em] text-black/30">Status</p>
              <p className="mt-1 text-[11px] font-medium text-black/88">{structuredPlan.status ?? "Watch"}</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.12em] text-black/30">Support</p>
              <p className="mt-1 text-[11px] font-medium text-black/78">{structuredPlan.support ?? "--"}</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.12em] text-black/30">Resistance</p>
              <p className="mt-1 text-[11px] font-medium text-black/78">{structuredPlan.resistance ?? "--"}</p>
            </div>
          </div>
        ) : (
          <AiMarkdownContent content={summary} />
        )}

        {structuredPlan ? (
          <div className={["grid gap-2 text-[10px]", gridClass].join(" ")}>
            <div className="border border-black/8 bg-white px-2 py-2">
              <p className="uppercase tracking-[0.12em] text-black/30">Long</p>
              <dl className="mt-1 grid grid-cols-[40px_minmax(0,1fr)] gap-x-2 gap-y-1 text-black/74">
                <dt>Entry</dt>
                <dd className="truncate">{structuredPlan.long.entry ?? "--"}</dd>
                <dt>SL</dt>
                <dd className="truncate">{structuredPlan.long.stopLoss ?? "--"}</dd>
                <dt>TP</dt>
                <dd className="truncate">{structuredPlan.long.takeProfit ?? "--"}</dd>
                <dt>Lev</dt>
                <dd>{structuredPlan.long.leverage ? `${structuredPlan.long.leverage}x` : "--"}</dd>
              </dl>
            </div>
            <div className="border border-black/8 bg-white px-2 py-2">
              <p className="uppercase tracking-[0.12em] text-black/30">Short</p>
              <dl className="mt-1 grid grid-cols-[40px_minmax(0,1fr)] gap-x-2 gap-y-1 text-black/74">
                <dt>Entry</dt>
                <dd className="truncate">{structuredPlan.short.entry ?? "--"}</dd>
                <dt>SL</dt>
                <dd className="truncate">{structuredPlan.short.stopLoss ?? "--"}</dd>
                <dt>TP</dt>
                <dd className="truncate">{structuredPlan.short.takeProfit ?? "--"}</dd>
                <dt>Lev</dt>
                <dd>{structuredPlan.short.leverage ? `${structuredPlan.short.leverage}x` : "--"}</dd>
              </dl>
            </div>
          </div>
        ) : null}

        {structuredPlan?.noTrade ? (
          <div className="border-t border-black/6 pt-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-black/30">No trade</p>
            <p className="mt-1 text-[10px] leading-4 text-black/66">{structuredPlan.noTrade}</p>
          </div>
        ) : null}

        <AiSignalContextGrid
          signal={signal}
          reasons={reasons}
          trigger={signal?.trigger ?? sections.trigger}
          invalidation={signal?.invalidation ?? sections.risk ?? sections.implication}
        />

        <AiSignalActions
          enterLabel={signal ? `Enter ${signal.bias === "short" ? "short" : "long"}` : undefined}
          onExplain={explainPrompt && onQuickPrompt ? () => onQuickPrompt(explainPrompt) : undefined}
          onFindAlternative={
            alternativesPrompt && onQuickPrompt ? () => onQuickPrompt(alternativesPrompt) : undefined
          }
          onEnterTrade={
            actionable && signal
              ? () =>
                  onEnterTrade?.({
                    signal: {
                      ...signal,
                      trigger: signal.trigger,
                      invalidation: defaults?.stopLoss ? `SL ${defaults.stopLoss}` : signal.invalidation,
                    },
                    content,
                  })
              : undefined
          }
        />
      </div>
    </article>
  );
}
