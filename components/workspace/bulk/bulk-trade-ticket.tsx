"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock,
  Info,
  Layers,
  MoveDiagonal,
  Pencil,
  Shield,
  Shuffle,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/core/market/format";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { usePaperAccountSummary } from "@/hooks/use-paper-account-summary";
import { usePaperPositions } from "@/hooks/use-paper-positions";
import { usePaperTradeActions } from "@/hooks/use-paper-trade-actions";
import { usePaperPositionLevels } from "@/hooks/use-paper-position-levels";
import { usePaperWorkspace } from "@/hooks/use-paper-workspace";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import {
  getApproxLiquidationPrice,
  getEffectivePositionNotional,
  getPaperLeverageMarks,
  isSupportedPaperLeverage,
} from "@/core/paper/leverage";
import {
  TerminalPopover,
  PopoverHeader,
  PopoverRow,
} from "@/components/ui/terminal-popover";
import {
  useTerminalPreferencesStore,
  type MarginMode as PrefsMarginMode,
  type PositionMode,
} from "@/stores/terminal-preferences-store";
import { useDemoAccount } from "@/hooks/use-demo-account";
import { BulkMarketReadCard } from "@/components/workspace/bulk/bulk-market-read-card";

type OrderType =
  | "market"
  | "limit"
  | "stop-market"
  | "stop-limit"
  | "trailing-stop"
  | "twap"
  | "scale"
  | "oco";

type OrderTypeMeta = {
  id: OrderType;
  label: string;
  group: "core" | "pro";
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const ORDER_TYPES: OrderTypeMeta[] = [
  {
    id: "market",
    label: "Market",
    group: "core",
    icon: Zap,
    description: "Fill immediately at best available price.",
  },
  {
    id: "limit",
    label: "Limit",
    group: "core",
    icon: TrendingUp,
    description: "Place at your price or better.",
  },
  {
    id: "stop-market",
    label: "Stop Market",
    group: "pro",
    icon: TrendingDown,
    description: "Trigger a market order when price crosses a stop.",
  },
  {
    id: "stop-limit",
    label: "Stop Limit",
    group: "pro",
    icon: Layers,
    description: "Trigger a limit order at a specific stop price.",
  },
  {
    id: "trailing-stop",
    label: "Trailing Stop",
    group: "pro",
    icon: MoveDiagonal,
    description: "Stop that chases price by a fixed offset.",
  },
  {
    id: "twap",
    label: "TWAP",
    group: "pro",
    icon: Clock,
    description: "Slice execution over time to reduce impact.",
  },
  {
    id: "scale",
    label: "Scale",
    group: "pro",
    icon: Layers,
    description: "Ladder entries across a price range.",
  },
  {
    id: "oco",
    label: "OCO",
    group: "pro",
    icon: Shuffle,
    description: "Two orders — one cancels the other when filled.",
  },
];

const SIZE_PRESETS = [25, 50, 75, 100];

function parseNumber(input: string): number {
  const value = Number(input.replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function parseLevel(input: string): number | null {
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Single-price paper fill: market, limit, stop-market, stop-limit (simplified). */
function resolvePaperOpenExecution(args: {
  orderType: OrderType;
  direction: "long" | "short";
  mark: number;
  limitPrice: string;
  stopPrice: string;
}): { ok: true; price: number } | { ok: false; message: string } {
  const { orderType, direction, mark, limitPrice, stopPrice } = args;
  if (mark <= 0) {
    return { ok: false, message: "No live price for this market yet." };
  }

  if (orderType === "market") {
    return { ok: true, price: mark };
  }

  if (orderType === "limit") {
    const lp = parseLevel(limitPrice);
    if (!lp) {
      return { ok: false, message: "Enter a limit price to place this order." };
    }
    const fill = direction === "long" ? Math.min(mark, lp) : Math.max(mark, lp);
    return { ok: true, price: fill };
  }

  if (orderType === "stop-market") {
    const sp = parseLevel(stopPrice);
    if (!sp) {
      return { ok: false, message: "Enter a stop price." };
    }
    const triggered = direction === "long" ? mark >= sp : mark <= sp;
    if (!triggered) {
      return {
        ok: false,
        message:
          direction === "long"
            ? "Stop hasn’t triggered yet (mark is still below your stop). Use Market to buy now, or lower the stop."
            : "Stop hasn’t triggered yet (mark is still above your stop). Use Market to sell now, or raise the stop.",
      };
    }
    return { ok: true, price: mark };
  }

  if (orderType === "stop-limit") {
    const sp = parseLevel(stopPrice);
    const lp = parseLevel(limitPrice);
    if (!sp) {
      return { ok: false, message: "Enter a stop price." };
    }
    if (!lp) {
      return { ok: false, message: "Enter a limit price." };
    }
    const triggered = direction === "long" ? mark >= sp : mark <= sp;
    if (!triggered) {
      return {
        ok: false,
        message:
          "Stop hasn’t triggered yet. Use Market to trade at the current price, or adjust your stop.",
      };
    }
    const fill = direction === "long" ? Math.min(mark, lp) : Math.max(mark, lp);
    return { ok: true, price: fill };
  }

  return { ok: false, message: "This order type isn’t available in paper mode yet. Use Market or Limit." };
}

function tabClass(active: boolean) {
  return cn(
    "relative inline-flex h-8 items-center px-1 text-[12px] transition",
    active
      ? "font-medium text-foreground"
      : "text-foreground/45 hover:text-foreground/80"
  );
}

function SectionLabel({
  icon: Icon,
  label,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between pb-1.5 text-[10px] uppercase tracking-wider text-foreground/40">
      <span className="inline-flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      {action}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between py-[3px] text-[11px]">
      <span className="inline-flex items-center gap-1 text-foreground/55">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </span>
      <span className={cn("tabular-nums", accent ?? "text-foreground/90")}>
        {value}
      </span>
    </div>
  );
}

export function BulkTradeTicket() {
  const auth = useWorkspaceAuth();
  const workspace = usePaperWorkspace();
  const { activeProductId, activeMarketSnapshot } = useWorkspaceStore();
  const price = activeMarketSnapshot?.price ?? 0;
  const livePositions = usePaperPositions();
  const demo = useDemoAccount();
  const positions = demo.active ? demo.positions : livePositions;
  const activePosition =
    positions.find((position) => position.productId === activeProductId) ?? null;
  const summary = usePaperAccountSummary();
  const tradeMutation = usePaperTradeActions();
  const levelsMutation = usePaperPositionLevels();

  const maxLeverage = workspace.data?.capabilities.maxLeverage ?? 40;
  const cashBalance = demo.active ? demo.balance : summary.account?.cashBalance ?? 0;
  const currency = summary.account?.currency ?? "USDT";
  const symbolLabel = activeProductId?.replace(/-USD$/i, "") || "—";
  const equity = demo.active ? demo.equity : summary.equity;
  const unrealizedPnl = demo.active ? demo.unrealizedPnl : summary.unrealizedPnl;

  const [orderType, setOrderType] = useState<OrderType>("market");
  const marginMode = useTerminalPreferencesStore((state) => state.marginMode);
  const setMarginMode = useTerminalPreferencesStore((state) => state.setMarginMode);
  const positionMode = useTerminalPreferencesStore((state) => state.positionMode);
  const setPositionMode = useTerminalPreferencesStore((state) => state.setPositionMode);
  const leverage = useTerminalPreferencesStore((state) => state.leverage);
  const setLeverage = useTerminalPreferencesStore((state) => state.setLeverage);
  const [sizeInput, setSizeInput] = useState("");
  const [reduceOnly, setReduceOnly] = useState(false);
  const [tpsl, setTpsl] = useState(false);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");

  // Strategy-specific fields (filled in when the user picks a pro order type).
  const [stopPrice, setStopPrice] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [trailOffset, setTrailOffset] = useState("1.5");
  const [twapDuration, setTwapDuration] = useState("10");
  const [scaleCount, setScaleCount] = useState("5");
  const [scaleFromPrice, setScaleFromPrice] = useState("");
  const [scaleToPrice, setScaleToPrice] = useState("");
  const [strategyNotice, setStrategyNotice] = useState<string | null>(null);

  // Levels for existing position (synchronise with active position)
  const [editingLevels, setEditingLevels] = useState(false);
  const [positionStopLoss, setPositionStopLoss] = useState("");
  const [positionTakeProfit, setPositionTakeProfit] = useState("");

  useEffect(() => {
    if (leverage > maxLeverage) setLeverage(maxLeverage);
  }, [leverage, maxLeverage, setLeverage]);

  useEffect(() => {
    setStrategyNotice(null);
  }, [orderType]);

  useEffect(() => {
    if (!activePosition) {
      setPositionStopLoss("");
      setPositionTakeProfit("");
      setEditingLevels(false);
      return;
    }
    setPositionStopLoss(activePosition.stopLoss ? String(activePosition.stopLoss) : "");
    setPositionTakeProfit(activePosition.takeProfit ? String(activePosition.takeProfit) : "");
  }, [activePosition?.id, activePosition?.stopLoss, activePosition?.takeProfit]);

  // Parsed values
  const parsedMargin = useMemo(() => parseNumber(sizeInput), [sizeInput]);
  const parsedStopLoss = useMemo(() => parseLevel(stopLoss), [stopLoss]);
  const parsedTakeProfit = useMemo(() => parseLevel(takeProfit), [takeProfit]);

  const notional = parsedMargin; // USD the user puts up
  const effectiveExposure = notional * leverage;
  const estimatedQuantity = price > 0 ? effectiveExposure / price : 0;
  const sliderPercent =
    cashBalance > 0 ? Math.min(1, notional / cashBalance) : 0;

  const leverageQuickMarks = useMemo(() => getPaperLeverageMarks(maxLeverage), [maxLeverage]);

  const canTrade =
    auth.authenticated &&
    Boolean(activeProductId) &&
    price > 0 &&
    notional > 0 &&
    notional <= cashBalance &&
    isSupportedPaperLeverage(leverage, maxLeverage) &&
    !tradeMutation.isPending;

  const submit = (nextDirection: "long" | "short") => {
    if (!canTrade || !activeProductId) return;
    tradeMutation.reset();
    setDirection(nextDirection);
    const symbol = activeProductId.replace(/-USD$/i, "");

    const resolved = resolvePaperOpenExecution({
      orderType,
      direction: nextDirection,
      mark: price,
      limitPrice,
      stopPrice,
    });

    if (!resolved.ok) {
      setStrategyNotice(resolved.message);
      return;
    }

    tradeMutation.mutate(
      {
        action: "open",
        productId: activeProductId,
        symbol,
        direction: nextDirection,
        notional,
        leverage,
        price: resolved.price,
        stopLoss: tpsl ? parsedStopLoss : null,
        takeProfit: tpsl ? parsedTakeProfit : null,
        note: `Paper ${orderType} · terminal`,
      },
      {
        onSuccess: () => setStrategyNotice(null),
      }
    );
  };

  const liquidationPrice = activePosition
    ? getApproxLiquidationPrice({
        direction: activePosition.direction,
        entryPrice: activePosition.entryPrice,
        leverage: activePosition.leverage,
      })
    : null;

  const submitLevels = () => {
    if (!activePosition) return;
    levelsMutation.mutate(
      {
        productId: activePosition.productId,
        stopLoss: parseLevel(positionStopLoss),
        takeProfit: parseLevel(positionTakeProfit),
        note: "Levels updated from terminal",
      },
      {
        onSuccess: () => setEditingLevels(false),
      }
    );
  };

  const closePosition = () => {
    if (!activePosition) return;
    tradeMutation.mutate({
      action: "close",
      productId: activePosition.productId,
      symbol: activePosition.symbol,
      quantity: activePosition.quantity,
      price,
      note: "Manual close from terminal",
    });
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-[var(--line)] bg-[var(--panel)]">
      <BulkMarketReadCard />
      {/* Mode bar */}
      <div className="flex items-center gap-1.5 border-b border-[var(--line)] px-3 py-2 text-[11px]">
        <MarginModePopover mode={marginMode} onChange={setMarginMode} />
        <LeveragePopover
          leverage={leverage}
          maxLeverage={maxLeverage}
          onChange={setLeverage}
        />
        <PositionModePopover mode={positionMode} onChange={setPositionMode} />
      </div>

      {/* Order type tabs (Market, Limit, Pro-dropdown) */}
      <OrderTypeTabs value={orderType} onChange={setOrderType} />

      {/* Strategy form (only when not plain market) */}
      {orderType !== "market" ? (
        <div className="border-b border-[var(--line)] px-3 py-3">
          <StrategyForm
            orderType={orderType}
            price={price}
            stopPrice={stopPrice}
            limitPrice={limitPrice}
            trailOffset={trailOffset}
            twapDuration={twapDuration}
            scaleCount={scaleCount}
            scaleFromPrice={scaleFromPrice}
            scaleToPrice={scaleToPrice}
            onChange={(next) => {
              if (typeof next.stopPrice === "string") setStopPrice(next.stopPrice);
              if (typeof next.limitPrice === "string") setLimitPrice(next.limitPrice);
              if (typeof next.trailOffset === "string") setTrailOffset(next.trailOffset);
              if (typeof next.twapDuration === "string") setTwapDuration(next.twapDuration);
              if (typeof next.scaleCount === "string") setScaleCount(next.scaleCount);
              if (typeof next.scaleFromPrice === "string") setScaleFromPrice(next.scaleFromPrice);
              if (typeof next.scaleToPrice === "string") setScaleToPrice(next.scaleToPrice);
            }}
          />
        </div>
      ) : null}

      {/* Scrollable body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Size */}
        <div className="border-b border-[var(--line)] px-3 py-3">
          <div className="flex items-center justify-between text-[11px] text-foreground/60">
            <span>Size ({currency})</span>
            <span>
              Available {cashBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1.5 flex h-10 items-center justify-between rounded-[8px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-3">
            <input
              value={sizeInput}
              onChange={(event) => setSizeInput(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-foreground/40"
            />
            <span className="rounded-[4px] border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-foreground/60">
              {currency}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-[11px]">
            {SIZE_PRESETS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() =>
                  setSizeInput(String(Math.floor((cashBalance * pct) / 100)))
                }
                className="rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] py-1 text-foreground/80 transition hover:bg-foreground/[0.05] hover:text-foreground"
              >
                {pct}%
              </button>
            ))}
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-1.5 rounded-full bg-yellow-400 transition-[width]"
              style={{ width: `${Math.round(sliderPercent * 100)}%` }}
            />
          </div>
        </div>

        {/* Leverage */}
        <div className="border-b border-[var(--line)] px-3 py-3">
          <SectionLabel
            icon={Shield}
            label="Leverage"
            action={
              <span className="tabular-nums text-[11px] text-foreground/90">
                {leverage}x
              </span>
            }
          />
          <input
            type="range"
            min={1}
            max={maxLeverage}
            step={1}
            value={leverage}
            onChange={(event) => setLeverage(Number(event.target.value))}
            className="w-full accent-yellow-400"
          />
          <div className="mt-1 grid grid-cols-6 gap-0.5 text-[10px] text-foreground/45">
            {leverageQuickMarks.map((mark) => (
              <button
                key={mark}
                type="button"
                onClick={() => setLeverage(mark)}
                className={cn(
                  "tabular-nums rounded-[4px] py-0.5 transition",
                  leverage === mark
                    ? "bg-foreground/10 text-foreground/95"
                    : "hover:text-foreground/85"
                )}
              >
                {mark}x
              </button>
            ))}
          </div>
        </div>

        {/* TP / SL + flags (new trade) */}
        <div className="border-b border-[var(--line)] px-3 py-3">
          <SectionLabel icon={Target} label="Stop Loss / Take Profit (new trade)" />
          <div className="flex items-center gap-4 text-[11px]">
            <label className="flex items-center gap-1.5 text-foreground/65">
              <input
                type="checkbox"
                checked={tpsl}
                onChange={(event) => setTpsl(event.target.checked)}
                className="h-3 w-3 accent-foreground"
              />
              Attach TP/SL
            </label>
            <label className="flex items-center gap-1.5 text-foreground/65">
              <input
                type="checkbox"
                checked={reduceOnly}
                onChange={(event) => setReduceOnly(event.target.checked)}
                className="h-3 w-3 accent-foreground"
              />
              Reduce Only
            </label>
          </div>
          {tpsl ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-0.5 block text-[10px] text-foreground/50">
                  Stop Loss
                </span>
                <div className="flex h-9 items-center rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2">
                  <input
                    value={stopLoss}
                    onChange={(event) => setStopLoss(event.target.value)}
                    inputMode="decimal"
                    placeholder={formatPrice(price * 0.98)}
                    className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-foreground/35"
                  />
                  <span className="text-[10px] text-foreground/45">USD</span>
                </div>
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[10px] text-foreground/50">
                  Take Profit
                </span>
                <div className="flex h-9 items-center rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2">
                  <input
                    value={takeProfit}
                    onChange={(event) => setTakeProfit(event.target.value)}
                    inputMode="decimal"
                    placeholder={formatPrice(price * 1.02)}
                    className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-foreground/35"
                  />
                  <span className="text-[10px] text-foreground/45">USD</span>
                </div>
              </label>
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-foreground/40">
              Enable to set SL/TP when opening the trade. Triggers on mark price.
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="border-b border-[var(--line)] px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!canTrade}
              onClick={() => submit("long")}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-semibold transition",
                "bg-[var(--positive)] text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
              )}
            >
              <ArrowUpRight className="h-4 w-4" />
              {tradeMutation.isPending && direction === "long"
                ? "Opening…"
                : "Buy / Long"}
            </button>
            <button
              type="button"
              disabled={!canTrade}
              onClick={() => submit("short")}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-semibold transition",
                "bg-[var(--negative)] text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
              )}
            >
              <ArrowDownRight className="h-4 w-4" />
              {tradeMutation.isPending && direction === "short"
                ? "Opening…"
                : "Sell / Short"}
            </button>
          </div>
          {tradeMutation.error instanceof Error ? (
            <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--negative)]">
              <CircleAlert className="h-3 w-3" />
              {tradeMutation.error.message}
            </p>
          ) : null}
          {strategyNotice ? (
            <div className="mt-2 flex items-start gap-1.5 rounded-[6px] border border-yellow-500/30 bg-yellow-500/10 px-2 py-1.5 text-[10px] text-yellow-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <p>{strategyNotice}</p>
              <button
                type="button"
                onClick={() => setStrategyNotice(null)}
                className="ml-auto text-yellow-400/70 hover:text-yellow-400"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Existing position panel */}
        <div className="border-b border-[var(--line)] px-3 py-3">
          <SectionLabel
            icon={Target}
            label={`Position on ${symbolLabel}`}
            action={
              activePosition ? (
                <button
                  type="button"
                  onClick={() => setEditingLevels((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[10px] text-foreground/55 transition hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                  {editingLevels ? "Cancel" : "Edit SL/TP"}
                </button>
              ) : null
            }
          />
          {activePosition ? (
            <div className="flex flex-col gap-1.5 text-[11px]">
              <Row
                label="Side"
                value={
                  <span
                    className={cn(
                      "uppercase tracking-wider",
                      activePosition.direction === "long"
                        ? "text-[var(--positive)]"
                        : "text-[var(--negative)]"
                    )}
                  >
                    {activePosition.direction} {activePosition.leverage}x
                  </span>
                }
              />
              <Row
                label="Size"
                value={`${activePosition.quantity.toFixed(6)} ${activePosition.symbol}`}
              />
              <Row label="Entry" value={formatPrice(activePosition.entryPrice)} />
              <Row label="Mark" value={formatPrice(price)} />
              <Row
                label="Margin"
                value={`$${activePosition.marginUsed.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
              />
              <Row
                label="Notional"
                value={`$${getEffectivePositionNotional(
                  activePosition.marginUsed,
                  activePosition.leverage
                ).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
              />
              <Row
                label="Liq. Price"
                value={liquidationPrice ? formatPrice(liquidationPrice) : "—"}
                accent="text-[var(--negative)]"
              />
              <Row
                label="Stop Loss"
                value={
                  activePosition.stopLoss
                    ? formatPrice(activePosition.stopLoss)
                    : "—"
                }
                accent="text-[var(--negative)]"
              />
              <Row
                label="Take Profit"
                value={
                  activePosition.takeProfit
                    ? formatPrice(activePosition.takeProfit)
                    : "—"
                }
                accent="text-[var(--positive)]"
              />

              {editingLevels ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-0.5 block text-[10px] text-foreground/50">
                      Stop Loss
                    </span>
                    <div className="flex h-9 items-center rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2">
                      <input
                        value={positionStopLoss}
                        onChange={(event) => setPositionStopLoss(event.target.value)}
                        inputMode="decimal"
                        placeholder={formatPrice(activePosition.entryPrice * 0.98)}
                        className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-foreground/35"
                      />
                      <span className="text-[10px] text-foreground/45">USD</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-[10px] text-foreground/50">
                      Take Profit
                    </span>
                    <div className="flex h-9 items-center rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2">
                      <input
                        value={positionTakeProfit}
                        onChange={(event) => setPositionTakeProfit(event.target.value)}
                        inputMode="decimal"
                        placeholder={formatPrice(activePosition.entryPrice * 1.02)}
                        className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-foreground/35"
                      />
                      <span className="text-[10px] text-foreground/45">USD</span>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={submitLevels}
                    disabled={levelsMutation.isPending}
                    className="col-span-2 inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] bg-foreground text-[12px] font-medium text-background transition hover:opacity-90 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {levelsMutation.isPending ? "Saving…" : "Save SL / TP"}
                  </button>
                  {levelsMutation.error instanceof Error ? (
                    <p className="col-span-2 inline-flex items-center gap-1 text-[10px] text-[var(--negative)]">
                      <CircleAlert className="h-3 w-3" />
                      {levelsMutation.error.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={closePosition}
                disabled={tradeMutation.isPending}
                className="mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] text-[12px] font-medium text-foreground/90 transition hover:bg-foreground/[0.05] disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
                Close position
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-foreground/40">
              No position on {symbolLabel}. Open one above.
            </p>
          )}
        </div>

        {/* Preview */}
        <div className="border-b border-[var(--line)] px-3 py-3">
          <SectionLabel icon={Info} label="Preview" />
          <div className="flex flex-col gap-0.5">
            <Row
              label="Order value"
              value={`$${effectiveExposure.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}`}
            />
            <Row
              label="Margin required"
              value={`$${notional.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })} / $${cashBalance.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}`}
              accent={notional > cashBalance ? "text-[var(--negative)]" : undefined}
            />
            <Row label="Est. qty" value={estimatedQuantity.toFixed(6)} />
            <Row label="Fees" value="0.035% taker / 0.000% maker" />
          </div>
        </div>

        {/* Account */}
        <div className="px-3 py-3">
          <SectionLabel icon={Shield} label="Account" />
          <Row
            label="Total equity"
            value={`$${equity.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })}`}
          />
          <Row
            label="Unrealized PnL"
            value={`${unrealizedPnl >= 0 ? "+" : "-"}$${Math.abs(
              unrealizedPnl
            ).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
            accent={
              unrealizedPnl >= 0
                ? "text-[var(--positive)]"
                : "text-[var(--negative)]"
            }
          />
          <Row label="Portfolio MMR" value="0.00%" />
          {demo.active ? (
            <Row
              label="Status"
              value="Demo · connect to trade"
              accent="text-yellow-400"
            />
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function OrderTypeTabs({
  value,
  onChange,
}: {
  value: OrderType;
  onChange: (next: OrderType) => void;
}) {
  const [proOpen, setProOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!proOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setProOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProOpen(false);
    };
    document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [proOpen]);

  const activeMeta = ORDER_TYPES.find((type) => type.id === value);
  const isProActive = activeMeta?.group === "pro";
  const proOptions = ORDER_TYPES.filter((type) => type.group === "pro");

  return (
    <div className="relative z-[200] flex shrink-0 items-center gap-5 border-b border-[var(--line)] bg-[var(--panel)] px-3 text-[12px]">
      {(["market", "limit"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(tabClass(value === id))}
        >
          <span className="capitalize">{id}</span>
          {value === id ? (
            <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-foreground" />
          ) : null}
        </button>
      ))}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setProOpen((prev) => !prev)}
          className={cn(tabClass(isProActive))}
        >
          <span className="capitalize">
            {isProActive ? activeMeta?.label : "Pro"}
          </span>
          <ChevronDown
            className={cn(
              "ml-0.5 h-3 w-3 transition-transform",
              proOpen && "rotate-180"
            )}
          />
          {isProActive ? (
            <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-foreground" />
          ) : null}
        </button>
        {proOpen ? (
          <div className="absolute right-0 top-[calc(100%+4px)] z-[220] w-[280px] overflow-hidden rounded-[10px] border border-[var(--line-strong)] bg-[var(--panel)] shadow-[0_18px_48px_rgba(0,0,0,0.4)]">
            <div className="border-b border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[9px] uppercase tracking-wider text-foreground/40">
              Pro strategies
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {proOptions.map((meta) => {
                const Icon = meta.icon;
                const selected = value === meta.id;
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => {
                      onChange(meta.id);
                      setProOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2.5 text-left transition",
                      selected
                        ? "bg-foreground/[0.06]"
                        : "hover:bg-foreground/[0.04]"
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 text-foreground/65" />
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-foreground/90">
                        {meta.label}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-[1.3] text-foreground/50">
                        {meta.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type StrategyFormState = Partial<{
  stopPrice: string;
  limitPrice: string;
  trailOffset: string;
  twapDuration: string;
  scaleCount: string;
  scaleFromPrice: string;
  scaleToPrice: string;
}>;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-0.5 block text-[10px] text-foreground/50">
      {children}
    </span>
  );
}

function InputBox({
  value,
  onChange,
  placeholder,
  suffix,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="flex h-9 items-center rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-foreground/35"
      />
      {suffix ? (
        <span className="ml-1 text-[10px] text-foreground/45">{suffix}</span>
      ) : null}
    </div>
  );
}

function StrategyForm({
  orderType,
  price,
  stopPrice,
  limitPrice,
  trailOffset,
  twapDuration,
  scaleCount,
  scaleFromPrice,
  scaleToPrice,
  onChange,
}: {
  orderType: OrderType;
  price: number;
  stopPrice: string;
  limitPrice: string;
  trailOffset: string;
  twapDuration: string;
  scaleCount: string;
  scaleFromPrice: string;
  scaleToPrice: string;
  onChange: (next: StrategyFormState) => void;
}) {
  const priceHint = price ? formatPrice(price) : "0";

  switch (orderType) {
    case "limit":
      return (
        <div>
          <SectionLabel icon={TrendingUp} label="Limit order" />
          <FieldLabel>Limit price</FieldLabel>
          <InputBox
            value={limitPrice}
            onChange={(next) => onChange({ limitPrice: next })}
            placeholder={priceHint}
            suffix="USD"
          />
          <p className="mt-1 text-[10px] text-foreground/45">
            Fills only at your price or better.
          </p>
        </div>
      );
    case "stop-market":
      return (
        <div>
          <SectionLabel icon={TrendingDown} label="Stop market" />
          <FieldLabel>Stop (trigger) price</FieldLabel>
          <InputBox
            value={stopPrice}
            onChange={(next) => onChange({ stopPrice: next })}
            placeholder={priceHint}
            suffix="USD"
          />
          <p className="mt-1 text-[10px] text-foreground/45">
            Sends a market order when mark crosses the stop.
          </p>
        </div>
      );
    case "stop-limit":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Stop price</FieldLabel>
            <InputBox
              value={stopPrice}
              onChange={(next) => onChange({ stopPrice: next })}
              placeholder={priceHint}
              suffix="USD"
            />
          </div>
          <div>
            <FieldLabel>Limit price</FieldLabel>
            <InputBox
              value={limitPrice}
              onChange={(next) => onChange({ limitPrice: next })}
              placeholder={priceHint}
              suffix="USD"
            />
          </div>
          <p className="col-span-2 -mt-1 text-[10px] text-foreground/45">
            When the stop trips, rest a limit at your configured price.
          </p>
        </div>
      );
    case "trailing-stop":
      return (
        <div>
          <SectionLabel icon={MoveDiagonal} label="Trailing stop" />
          <FieldLabel>Trail offset (%)</FieldLabel>
          <InputBox
            value={trailOffset}
            onChange={(next) => onChange({ trailOffset: next })}
            placeholder="1.5"
            suffix="%"
          />
          <p className="mt-1 text-[10px] text-foreground/45">
            Stop follows the mark by this offset. Never tightens in the wrong
            direction.
          </p>
        </div>
      );
    case "twap":
      return (
        <div>
          <SectionLabel icon={Clock} label="TWAP" />
          <FieldLabel>Duration (minutes)</FieldLabel>
          <InputBox
            value={twapDuration}
            onChange={(next) => onChange({ twapDuration: next })}
            placeholder="10"
            suffix="min"
          />
          <p className="mt-1 text-[10px] text-foreground/45">
            Execution sliced into equal child orders over the window.
          </p>
        </div>
      );
    case "scale":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>From price</FieldLabel>
            <InputBox
              value={scaleFromPrice}
              onChange={(next) => onChange({ scaleFromPrice: next })}
              placeholder={priceHint}
              suffix="USD"
            />
          </div>
          <div>
            <FieldLabel>To price</FieldLabel>
            <InputBox
              value={scaleToPrice}
              onChange={(next) => onChange({ scaleToPrice: next })}
              placeholder={priceHint}
              suffix="USD"
            />
          </div>
          <div className="col-span-2">
            <FieldLabel>Orders</FieldLabel>
            <InputBox
              value={scaleCount}
              onChange={(next) => onChange({ scaleCount: next })}
              placeholder="5"
              suffix="legs"
            />
          </div>
          <p className="col-span-2 -mt-1 text-[10px] text-foreground/45">
            Ladder your entry across the range evenly.
          </p>
        </div>
      );
    case "oco":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Take profit price</FieldLabel>
            <InputBox
              value={limitPrice}
              onChange={(next) => onChange({ limitPrice: next })}
              placeholder={priceHint}
              suffix="USD"
            />
          </div>
          <div>
            <FieldLabel>Stop price</FieldLabel>
            <InputBox
              value={stopPrice}
              onChange={(next) => onChange({ stopPrice: next })}
              placeholder={priceHint}
              suffix="USD"
            />
          </div>
          <p className="col-span-2 -mt-1 text-[10px] text-foreground/45">
            One-cancels-the-other: the first leg to fill removes the other.
          </p>
        </div>
      );
    default:
      return null;
  }
}

function PillButton({
  open,
  onClick,
  children,
  tone = "default",
}: {
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-[11px] font-medium transition",
        tone === "accent"
          ? "text-yellow-400"
          : "text-foreground/85 hover:bg-foreground/[0.05] hover:text-foreground"
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-3 w-3 text-foreground/55 transition-transform",
          open && "rotate-180"
        )}
      />
    </button>
  );
}

function MarginModePopover({
  mode,
  onChange,
}: {
  mode: PrefsMarginMode;
  onChange: (next: PrefsMarginMode) => void;
}) {
  return (
    <TerminalPopover
      width={260}
      align="end"
      trigger={({ open, toggle }) => (
        <PillButton open={open} onClick={toggle}>
          <span className="capitalize">{mode}</span>
        </PillButton>
      )}
    >
      {(close) => (
        <>
          <PopoverHeader>Margin mode</PopoverHeader>
          <PopoverRow
            active={mode === "cross"}
            onClick={() => {
              onChange("cross");
              close();
            }}
            title="Cross"
            subtitle="Entire account balance shares collateral across all positions. Max capital efficiency."
            right={
              mode === "cross" ? (
                <CheckCircle2 className="h-4 w-4 text-yellow-400" />
              ) : null
            }
          />
          <PopoverRow
            active={mode === "isolated"}
            onClick={() => {
              onChange("isolated");
              close();
            }}
            title="Isolated"
            subtitle="Ring-fence margin per position. Max loss is capped at the allocated amount."
            right={
              mode === "isolated" ? (
                <CheckCircle2 className="h-4 w-4 text-yellow-400" />
              ) : null
            }
          />
        </>
      )}
    </TerminalPopover>
  );
}

function LeveragePopover({
  leverage,
  maxLeverage,
  onChange,
}: {
  leverage: number;
  maxLeverage: number;
  onChange: (next: number) => void;
}) {
  const [draft, setDraft] = useState(leverage);
  useEffect(() => setDraft(leverage), [leverage]);
  const marks = getPaperLeverageMarks(maxLeverage);

  return (
    <TerminalPopover
      width={260}
      align="end"
      trigger={({ open, toggle }) => (
        <PillButton open={open} onClick={toggle} tone="accent">
          {leverage}x
        </PillButton>
      )}
    >
      {(close) => (
        <>
          <PopoverHeader>Leverage</PopoverHeader>
          <div className="px-3 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider text-foreground/45">
                Level
              </span>
              <span className="tabular-nums text-[14px] font-semibold text-foreground/95">
                {draft}x
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={maxLeverage}
              step={1}
              value={draft}
              onChange={(event) => setDraft(Number(event.target.value))}
              className="mt-2 w-full accent-yellow-400"
            />
            <div className="mt-2 grid grid-cols-6 gap-1 text-[10px] text-foreground/50">
              {marks.map((mark) => (
                <button
                  key={mark}
                  type="button"
                  onClick={() => setDraft(mark)}
                  className={cn(
                    "rounded-[4px] border py-0.5 transition",
                    draft === mark
                      ? "border-yellow-400/40 bg-yellow-500/10 text-yellow-400"
                      : "border-transparent hover:text-foreground/85"
                  )}
                >
                  {mark}x
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-[1.4] text-foreground/45">
              Higher leverage means closer liquidation. At {draft}x the market
              needs to move ~{(100 / draft).toFixed(2)}% against you to wipe
              your margin.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={close}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-[6px] border border-[var(--line)] text-[11px] text-foreground/70 transition hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  close();
                }}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-[6px] bg-foreground text-[11px] font-medium text-background transition hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </TerminalPopover>
  );
}

function PositionModePopover({
  mode,
  onChange,
}: {
  mode: PositionMode;
  onChange: (next: PositionMode) => void;
}) {
  return (
    <TerminalPopover
      width={260}
      align="end"
      trigger={({ open, toggle }) => (
        <PillButton open={open} onClick={toggle}>
          PM · {mode === "hedge" ? "Hedge" : "One-Way"}
        </PillButton>
      )}
    >
      {(close) => (
        <>
          <PopoverHeader>Position mode</PopoverHeader>
          <PopoverRow
            active={mode === "one-way"}
            onClick={() => {
              onChange("one-way");
              close();
            }}
            title="One-Way"
            subtitle="A single position per market. Long and short orders net against each other."
            right={
              mode === "one-way" ? (
                <CheckCircle2 className="h-4 w-4 text-yellow-400" />
              ) : null
            }
          />
          <PopoverRow
            active={mode === "hedge"}
            onClick={() => {
              onChange("hedge");
              close();
            }}
            title="Hedge"
            subtitle="Long and short sides run simultaneously on the same market."
            right={
              mode === "hedge" ? (
                <CheckCircle2 className="h-4 w-4 text-yellow-400" />
              ) : null
            }
          />
        </>
      )}
    </TerminalPopover>
  );
}
