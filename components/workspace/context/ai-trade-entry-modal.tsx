"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { getTradeDraftDefaults } from "@/core/ai/trading-plan";
import { formatPrice } from "@/core/market/format";
import { PAPER_LEVERAGE_MAX } from "@/core/paper/leverage";
import { PaperLeverageSelector } from "@/components/workspace/context/paper-leverage-selector";
import { PaperTradeLevelField } from "@/components/workspace/context/paper-trade-level-field";
import { usePaperTradeActions } from "@/hooks/use-paper-trade-actions";
import { usePaperWorkspace } from "@/hooks/use-paper-workspace";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { useAiTradeEntryStore } from "@/stores/ai-trade-entry-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

function buildAmountPresets(balance: number) {
  return [250, 500, 1000, Math.min(2500, Math.max(250, Math.floor(balance * 0.1 / 50) * 50))]
    .filter((value, index, items) => value > 0 && value <= balance && items.indexOf(value) === index)
    .slice(0, 4);
}

function AiTradeEntryDialog({
  draft,
  availableBalance,
  sliderMaxLeverage,
  executionMaxLeverage,
}: {
  draft: NonNullable<ReturnType<typeof useAiTradeEntryStore.getState>["draft"]>;
  availableBalance: number;
  sliderMaxLeverage: number;
  executionMaxLeverage: number;
}) {
  const { signal, content } = draft;
  const auth = useWorkspaceAuth();
  const tradeMutation = usePaperTradeActions();
  const close = useAiTradeEntryStore((state) => state.close);
  const setActiveProductId = useWorkspaceStore((state) => state.setActiveProductId);
  const setActiveTimeframe = useWorkspaceStore((state) => state.setActiveTimeframe);
  const setBottomPanelTab = useWorkspaceStore((state) => state.setBottomPanelTab);
  const amountPresets = useMemo(() => buildAmountPresets(availableBalance), [availableBalance]);
  const defaults = useMemo(() => getTradeDraftDefaults(content, signal.bias), [content, signal.bias]);
  const [amount, setAmount] = useState(String(amountPresets[1] ?? amountPresets[0] ?? 500));
  const [leverage, setLeverage] = useState(
    Math.min(defaults.leverage ?? executionMaxLeverage, sliderMaxLeverage)
  );
  const [stopLoss, setStopLoss] = useState(defaults.stopLoss ? String(defaults.stopLoss) : "");
  const [takeProfit, setTakeProfit] = useState(defaults.takeProfit ? String(defaults.takeProfit) : "");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const parsedAmount = Number(amount.replace(/,/g, ""));
  const parsedStopLoss = stopLoss.trim() ? Number(stopLoss) : null;
  const parsedTakeProfit = takeProfit.trim() ? Number(takeProfit) : null;
  const previewOnly = leverage > executionMaxLeverage;
  const canSubmit =
    auth.authenticated &&
    signal.price &&
    parsedAmount > 0 &&
    signal.bias !== "neutral" &&
    leverage > 0 &&
    leverage <= executionMaxLeverage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/32 px-4">
      <div className="w-full max-w-md border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between border-b border-black/8 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-black/34">AI trade entry</p>
            <p className="mt-1 text-[14px] font-medium text-black/84">
              {signal.symbol} · {signal.bias === "short" ? "Short" : "Long"}
            </p>
          </div>
          <button type="button" onClick={close} className="text-black/38 transition hover:text-black/72">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-3 border border-black/8 bg-white px-3 py-3 text-[10px] shadow-[0_1px_0_rgba(0,0,0,0.03)]">
            <div className="min-w-0">
              <p className="uppercase tracking-[0.12em] text-black/30">Price</p>
              <p className="mt-1 text-[12px] font-medium text-black/84">{formatPrice(signal.price ?? undefined)}</p>
            </div>
            <div className="min-w-0">
              <p className="uppercase tracking-[0.12em] text-black/30">Confidence</p>
              <p className="mt-1 text-[12px] font-medium text-black/84">{signal.confidence ?? "--"}%</p>
            </div>
          </div>

          <div className="border border-black/8 bg-white px-3 py-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
            <p className="text-[10px] uppercase tracking-[0.12em] text-black/30">Amount</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {amountPresets.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  className={[
                    "h-8 border px-3 text-[10px] font-medium transition",
                    Number(amount) === value ? "border-black bg-black text-white" : "border-black/10 text-black/72 hover:bg-black/[0.03]",
                  ].join(" ")}
                >
                  {value} USDT
                </button>
              ))}
            </div>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-2 h-9 w-full border border-black/10 bg-white px-3 text-[12px] text-black/86 outline-none"
            />
          </div>

          <PaperLeverageSelector value={leverage} onChange={setLeverage} max={sliderMaxLeverage} />
          {executionMaxLeverage < sliderMaxLeverage ? (
            <p className="px-1 text-[10px] leading-4 text-black/36">
              Execution currently supports up to {executionMaxLeverage}x here.
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-3 border border-black/8 bg-white px-3 py-3 text-[10px] text-black/58 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
            <div>
              <p className="uppercase tracking-[0.12em] text-black/30">AI leverage</p>
              <p className="mt-1 leading-4">{leverage}x</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.12em] text-black/30">SL</p>
              <p className="mt-1 leading-4">{stopLoss || "--"}</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.12em] text-black/30">TP</p>
              <p className="mt-1 leading-4">{takeProfit || "--"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((value) => !value)}
            className="text-left text-[10px] font-medium text-black/62 transition hover:text-black/82"
          >
            {advancedOpen ? "Hide setup details" : "Adjust setup"}
          </button>

          {advancedOpen ? (
            <div className="space-y-3 border border-black/8 bg-white px-3 py-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <div className="grid grid-cols-2 gap-3">
                <PaperTradeLevelField
                  label="Stop loss"
                  kind="stopLoss"
                  value={stopLoss}
                  onChange={setStopLoss}
                  direction={signal.bias === "short" ? "short" : "long"}
                  referencePrice={signal.price ?? 0}
                />
                <PaperTradeLevelField
                  label="Take profit"
                  kind="takeProfit"
                  value={takeProfit}
                  onChange={setTakeProfit}
                  direction={signal.bias === "short" ? "short" : "long"}
                  referencePrice={signal.price ?? 0}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/8 px-4 py-3">
          <div className="text-[10px] leading-4 text-black/42">
            <p>
              {auth.authenticated
                ? `Using paper account · execution up to ${executionMaxLeverage}x`
                : "Connect your wallet to enter this trade."}
            </p>
            {tradeMutation.error instanceof Error ? (
              <p className="mt-1 text-[var(--negative)]">{tradeMutation.error.message}</p>
            ) : previewOnly ? (
              <p className="mt-1">Selected leverage is preview only here. Lower it to {executionMaxLeverage}x or less to enter.</p>
            ) : defaults.leverage ? (
              <p className="mt-1">AI suggested {defaults.leverage}x with the current TP/SL.</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={!canSubmit || tradeMutation.isPending}
            onClick={() => {
              if (!signal.price || signal.bias === "neutral") return;
              setActiveProductId(signal.productId);
              setActiveTimeframe(signal.timeframe);
              tradeMutation.mutate(
                {
                  action: "open",
                  productId: signal.productId,
                  symbol: signal.symbol,
                  direction: signal.bias,
                  leverage,
                  notional: parsedAmount,
                  price: signal.price,
                  stopLoss: Number.isFinite(parsedStopLoss) ? parsedStopLoss : null,
                  takeProfit: Number.isFinite(parsedTakeProfit) ? parsedTakeProfit : null,
                  note: "Opened from AI signal",
                },
                {
                  onSuccess: () => {
                    setBottomPanelTab("positions");
                    close();
                  },
                }
              );
            }}
            className="inline-flex h-9 items-center justify-center border border-black bg-black px-4 text-[10px] font-medium text-white transition hover:bg-black/88 disabled:cursor-not-allowed disabled:bg-black/20"
          >
            {tradeMutation.isPending ? "Entering…" : `Enter ${signal.bias}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AiTradeEntryModal() {
  const draft = useAiTradeEntryStore((state) => state.draft);
  const workspace = usePaperWorkspace();
  const availableBalance = workspace.data?.account.cashBalance ?? 0;
  const sliderMaxLeverage = PAPER_LEVERAGE_MAX;
  const executionMaxLeverage = workspace.data?.capabilities.maxLeverage ?? sliderMaxLeverage;

  if (!draft) {
    return null;
  }

  return (
    <AiTradeEntryDialog
      key={`${draft.signal.productId}:${draft.signal.bias}:${draft.signal.timeframe}:${draft.content.length}`}
      draft={draft}
      availableBalance={availableBalance}
      sliderMaxLeverage={sliderMaxLeverage}
      executionMaxLeverage={executionMaxLeverage}
    />
  );
}
