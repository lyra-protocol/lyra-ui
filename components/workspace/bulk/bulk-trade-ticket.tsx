"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/core/market/format";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { usePaperAccountSummary } from "@/hooks/use-paper-account-summary";
import { usePaperPositions } from "@/hooks/use-paper-positions";
import { usePaperTradeActions } from "@/hooks/use-paper-trade-actions";
import { usePaperWorkspace } from "@/hooks/use-paper-workspace";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { getApproxLiquidationPrice, isSupportedPaperLeverage } from "@/core/paper/leverage";

type OrderType = "market" | "limit" | "pro";

const LEVERAGE_MARKS = [1, 5, 10, 20, 30, 50];

export function BulkTradeTicket() {
  const auth = useWorkspaceAuth();
  const workspace = usePaperWorkspace();
  const { activeProductId, activeMarketSnapshot } = useWorkspaceStore();
  const price = activeMarketSnapshot?.price ?? 0;
  const positions = usePaperPositions();
  const activePosition = positions.find((p) => p.productId === activeProductId) ?? null;
  const summary = usePaperAccountSummary();
  const tradeMutation = usePaperTradeActions();

  const maxLeverage = workspace.data?.capabilities.maxLeverage ?? 40;
  const cashBalance = summary.account?.cashBalance ?? 0;
  const currency = summary.account?.currency ?? "USDT";

  const [orderType, setOrderType] = useState<OrderType>("market");
  const [size, setSize] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [tpsl, setTpsl] = useState(false);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  useEffect(() => {
    if (leverage > maxLeverage) setLeverage(maxLeverage);
  }, [leverage, maxLeverage]);

  const parsedSize = useMemo(() => {
    const value = Number(size.replace(/,/g, ""));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [size]);
  const parsedStopLoss = useMemo(() => {
    const v = Number(stopLoss);
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [stopLoss]);
  const parsedTakeProfit = useMemo(() => {
    const v = Number(takeProfit);
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [takeProfit]);

  const notional = parsedSize; // size is entered in USD already
  const effectiveExposure = notional * leverage;
  const estimatedQuantity = price > 0 ? effectiveExposure / price : 0;
  const slidePercent = cashBalance > 0 ? Math.min(1, notional / cashBalance) : 0;

  const canTrade =
    auth.authenticated &&
    Boolean(activeProductId) &&
    price > 0 &&
    notional > 0 &&
    notional <= cashBalance &&
    isSupportedPaperLeverage(leverage, maxLeverage) &&
    !tradeMutation.isPending;

  const handleSubmit = (direction: "long" | "short") => {
    if (!canTrade) return;
    const symbol = activeProductId.replace(/-USD$/i, "");
    tradeMutation.mutate({
      action: "open",
      productId: activeProductId,
      symbol,
      direction,
      notional,
      leverage,
      price,
      stopLoss: tpsl ? parsedStopLoss : null,
      takeProfit: tpsl ? parsedTakeProfit : null,
      note: `Opened from terminal`,
    });
  };

  const liquidationPrice = activePosition
    ? getApproxLiquidationPrice({
        direction: activePosition.direction,
        entryPrice: activePosition.entryPrice,
        leverage: activePosition.leverage,
      })
    : null;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-[var(--line)] bg-[var(--panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2 text-[11px]">
        <button className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2 py-1 font-medium text-foreground/85">
          Cross
        </button>
        <button className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2 py-1 font-medium text-foreground/85">
          {leverage}x
        </button>
        <button className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2 py-1 font-medium text-foreground/85">
          PM
        </button>
      </div>

      <div className="flex items-center gap-4 border-b border-[var(--line)] px-3 py-2 text-[12px]">
        {(["market", "limit", "pro"] as OrderType[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setOrderType(id)}
            disabled={id !== "market"}
            className={cn(
              "capitalize transition",
              orderType === id
                ? "text-foreground"
                : id === "market"
                  ? "text-foreground/45 hover:text-foreground/80"
                  : "text-foreground/25"
            )}
            title={id === "market" ? undefined : "Coming soon"}
          >
            {id === "pro" ? (
              <span className="flex items-center gap-1">
                Pro <ChevronDown className="h-3.5 w-3.5" />
              </span>
            ) : (
              id
            )}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 text-[11px]">
        <div>
          <div className="flex items-center justify-between text-foreground/60">
            <span>Size</span>
            <span>
              Available {cashBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 flex h-9 items-center justify-between rounded-[8px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-3">
            <input
              value={size}
              onChange={(event) => setSize(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground/40"
            />
            <span className="text-foreground/60">{currency}</span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground/40" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-foreground/55">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setSize(String(Math.floor((cashBalance * pct) / 100)))}
                className="rounded-[4px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.5 text-foreground/75 hover:text-foreground"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <div className="mb-1 flex items-center justify-between text-foreground/60">
            <span>Leverage</span>
            <span className="tabular-nums text-foreground/85">{leverage}x</span>
          </div>
          <input
            type="range"
            min={1}
            max={maxLeverage}
            step={1}
            value={leverage}
            onChange={(event) => setLeverage(Number(event.target.value))}
            className="w-full accent-yellow-400"
          />
          <div className="mt-1 flex items-center justify-between text-[9px] text-foreground/40">
            {LEVERAGE_MARKS.filter((mark) => mark <= maxLeverage).map((mark) => (
              <button
                key={mark}
                type="button"
                onClick={() => setLeverage(mark)}
                className="tabular-nums hover:text-foreground/70"
              >
                {mark}x
              </button>
            ))}
          </div>
        </div>

        <div className="mt-1 space-y-2">
          <label className="flex items-center gap-2 text-foreground/60">
            <input
              type="checkbox"
              checked={reduceOnly}
              onChange={(event) => setReduceOnly(event.target.checked)}
              className="h-3 w-3 accent-foreground"
            />
            Reduce Only
          </label>
          <label className="flex items-center gap-2 text-foreground/60">
            <input
              type="checkbox"
              checked={tpsl}
              onChange={(event) => setTpsl(event.target.checked)}
              className="h-3 w-3 accent-foreground"
            />
            TP/SL
          </label>
          {tpsl ? (
            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
              <div>
                <p className="text-foreground/55">Stop Loss</p>
                <input
                  value={stopLoss}
                  onChange={(event) => setStopLoss(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="mt-1 h-8 w-full rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 text-[11px] outline-none"
                />
              </div>
              <div>
                <p className="text-foreground/55">Take Profit</p>
                <input
                  value={takeProfit}
                  onChange={(event) => setTakeProfit(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="mt-1 h-8 w-full rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 text-[11px] outline-none"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canTrade}
            onClick={() => handleSubmit("long")}
            className="h-10 rounded-[8px] bg-[var(--positive)] text-[13px] font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {tradeMutation.isPending ? "Opening…" : "Buy / Long"}
          </button>
          <button
            type="button"
            disabled={!canTrade}
            onClick={() => handleSubmit("short")}
            className="h-10 rounded-[8px] bg-[var(--negative)] text-[13px] font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {tradeMutation.isPending ? "Opening…" : "Sell / Short"}
          </button>
        </div>

        <div className="h-1 w-full rounded-full bg-foreground/10">
          <div
            className="h-1 rounded-full bg-yellow-400"
            style={{ width: `${Math.round(slidePercent * 100)}%` }}
          />
        </div>

        {tradeMutation.error instanceof Error ? (
          <p className="text-[10px] text-[var(--negative)]">
            {tradeMutation.error.message}
          </p>
        ) : null}
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[11px]">
        <Stat
          label="Current Position"
          value={
            activePosition
              ? `${activePosition.quantity.toFixed(4)} ${activePosition.symbol}`
              : "0.00"
          }
        />
        <Stat
          label="Liq. Price"
          value={liquidationPrice ? formatPrice(liquidationPrice) : "— / —"}
        />
        <Stat
          label="Order Value"
          value={`$${effectiveExposure.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
        />
        <Stat
          label="Margin Required"
          value={`$${notional.toLocaleString("en-US", { maximumFractionDigits: 2 })} / $${cashBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          accent={notional > cashBalance ? "text-[var(--negative)]" : undefined}
        />
        <Stat label="Est. Quantity" value={`${estimatedQuantity.toFixed(6)}`} />
        <Stat label="Fees" value="0.035% / 0.000%" />
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[11px]">
        <p className="mb-2 text-foreground/55">Account</p>
        <Stat
          label="Total Equity"
          value={`$${summary.equity.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
        />
        <Stat
          label="Unrealized PNL"
          value={`${summary.unrealizedPnl >= 0 ? "+" : "-"}$${Math.abs(summary.unrealizedPnl).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          accent={
            summary.unrealizedPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
          }
        />
        <Stat label="PortfolioMMR" value="0.00% Ⓘ" />
      </div>
    </aside>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-foreground/55">{label}</span>
      <span className={`tabular-nums ${accent ?? "text-foreground/90"}`}>{value}</span>
    </div>
  );
}
