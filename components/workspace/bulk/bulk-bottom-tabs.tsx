"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/core/market/format";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { usePaperAccountSummary } from "@/hooks/use-paper-account-summary";
import { usePaperTradeActions } from "@/hooks/use-paper-trade-actions";
import {
  getApproxLiquidationPrice,
  getEffectivePositionNotional,
} from "@/core/paper/leverage";
import {
  getPositionCurrentPrice,
  getPositionUnrealizedPnl,
} from "@/core/paper/metrics";

type BulkTab =
  | "Positions"
  | "Open Orders"
  | "Balances"
  | "Order History"
  | "Trade History"
  | "Funding History"
  | "Position History";

const TABS: BulkTab[] = [
  "Positions",
  "Open Orders",
  "Balances",
  "Order History",
  "Trade History",
  "Funding History",
  "Position History",
];

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center text-[11px] text-foreground/40">
      {message}
    </div>
  );
}

function PositionsPanel({ currentMarketOnly }: { currentMarketOnly: boolean }) {
  const { positions, markets } = usePaperAccountSummary();
  const { activeProductId } = useWorkspaceStore();
  const tradeMutation = usePaperTradeActions();

  const rows = useMemo(
    () =>
      (currentMarketOnly
        ? positions.filter((position) => position.productId === activeProductId)
        : positions
      ).map((position) => {
        const currentPrice = getPositionCurrentPrice(position, markets);
        const unrealized = getPositionUnrealizedPnl(position, markets);
        const notional = getEffectivePositionNotional(position.marginUsed, position.leverage);
        const roePercent = position.marginUsed > 0 ? (unrealized / position.marginUsed) * 100 : 0;
        const liq = getApproxLiquidationPrice({
          direction: position.direction,
          entryPrice: position.entryPrice,
          leverage: position.leverage,
        });
        return { position, currentPrice, unrealized, notional, roePercent, liq };
      }),
    [positions, markets, currentMarketOnly, activeProductId]
  );

  if (!rows.length) return <EmptyRow message="You have no positions yet." />;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
      <div className="grid shrink-0 grid-cols-[1.1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_0.6fr] border-b border-[var(--line)] px-3 py-1.5 text-[9px] uppercase tracking-wider text-foreground/40">
        <span>Market</span>
        <span className="text-right">Size</span>
        <span className="text-right">Entry</span>
        <span className="text-right">Mark</span>
        <span className="text-right">PnL</span>
        <span className="text-right">ROE %</span>
        <span className="text-right">Liq. Price</span>
        <span className="text-right">Margin</span>
        <span className="text-right">Close</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map(({ position, currentPrice, unrealized, notional, roePercent, liq }) => (
          <div
            key={position.id}
            className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_0.6fr] border-b border-[var(--line)] px-3 py-2 transition hover:bg-foreground/[0.03]"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground/90">{position.symbol}</span>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider",
                  position.direction === "long"
                    ? "text-[var(--positive)]"
                    : "text-[var(--negative)]"
                )}
              >
                {position.direction} {position.leverage}x
              </span>
            </div>
            <span className="text-right tabular-nums text-foreground/80">
              {position.quantity.toFixed(4)}
            </span>
            <span className="text-right tabular-nums text-foreground/70">
              {formatPrice(position.entryPrice)}
            </span>
            <span className="text-right tabular-nums text-foreground/70">
              {formatPrice(currentPrice)}
            </span>
            <span
              className={cn(
                "text-right tabular-nums font-medium",
                unrealized >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
              )}
            >
              {unrealized >= 0 ? "+" : ""}
              {formatPrice(unrealized)}
            </span>
            <span
              className={cn(
                "text-right tabular-nums",
                roePercent >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
              )}
            >
              {roePercent >= 0 ? "+" : ""}
              {roePercent.toFixed(2)}%
            </span>
            <span className="text-right tabular-nums text-foreground/60">
              {liq ? formatPrice(liq) : "—"}
            </span>
            <span className="text-right tabular-nums text-foreground/60">
              ${notional.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() =>
                  tradeMutation.mutate({
                    action: "close",
                    productId: position.productId,
                    symbol: position.symbol,
                    quantity: position.quantity,
                    price: currentPrice,
                    note: "Closed from terminal",
                  })
                }
                className="rounded-[4px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2 py-0.5 text-[10px] font-medium text-foreground/85 transition hover:bg-foreground/[0.05]"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeHistoryPanel({ currentMarketOnly }: { currentMarketOnly: boolean }) {
  const { trades } = usePaperAccountSummary();
  const { activeProductId } = useWorkspaceStore();

  const rows = useMemo(
    () => (currentMarketOnly ? trades.filter((trade) => trade.productId === activeProductId) : trades),
    [trades, currentMarketOnly, activeProductId]
  );
  if (!rows.length) return <EmptyRow message="No trades yet." />;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
      <div className="grid shrink-0 grid-cols-[1fr_0.8fr_1fr_1fr_1fr_1.2fr] border-b border-[var(--line)] px-3 py-1.5 text-[9px] uppercase tracking-wider text-foreground/40">
        <span>Market</span>
        <span>Action</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Price</span>
        <span className="text-right">Realized</span>
        <span className="text-right">Time</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((trade) => (
          <div
            key={trade.id}
            className="grid grid-cols-[1fr_0.8fr_1fr_1fr_1fr_1.2fr] border-b border-[var(--line)] px-3 py-2 text-foreground/80"
          >
            <span className="font-medium">{trade.symbol}</span>
            <span className="capitalize text-foreground/70">{trade.action}</span>
            <span className="text-right tabular-nums">{trade.quantity.toFixed(4)}</span>
            <span className="text-right tabular-nums">{formatPrice(trade.price)}</span>
            <span
              className={cn(
                "text-right tabular-nums",
                trade.realizedPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
              )}
            >
              {trade.realizedPnl >= 0 ? "+" : ""}
              {formatPrice(trade.realizedPnl)}
            </span>
            <span className="text-right tabular-nums text-foreground/55">
              {new Date(trade.executedAt).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BalancesPanel() {
  const { account, equity, unrealizedPnl } = usePaperAccountSummary();
  if (!account) return <EmptyRow message="Connect wallet to load paper balances." />;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
      <div className="grid shrink-0 grid-cols-4 border-b border-[var(--line)] px-3 py-1.5 text-[9px] uppercase tracking-wider text-foreground/40">
        <span>Asset</span>
        <span className="text-right">Balance</span>
        <span className="text-right">Equity</span>
        <span className="text-right">Unrealized PnL</span>
      </div>
      <div className="grid grid-cols-4 border-b border-[var(--line)] px-3 py-2 text-foreground/85">
        <span>{account.currency}</span>
        <span className="text-right tabular-nums">
          ${account.cashBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
        <span className="text-right tabular-nums">
          ${equity.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
        <span
          className={cn(
            "text-right tabular-nums",
            unrealizedPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
          )}
        >
          {unrealizedPnl >= 0 ? "+" : ""}${Math.abs(unrealizedPnl).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}

export function BulkBottomTabs() {
  const [active, setActive] = useState<BulkTab>("Positions");
  const [currentMarket, setCurrentMarket] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-[var(--line)] bg-[var(--panel)]">
      <div className="flex h-8 items-center justify-between border-b border-[var(--line)] px-2">
        <div className="flex items-center gap-4 text-[11px]">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={cn(
                "relative inline-flex h-7 items-center px-1 transition",
                active === tab
                  ? "text-foreground"
                  : "text-foreground/50 hover:text-foreground/85"
              )}
            >
              {tab}
              {tab === active ? (
                <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-foreground" />
              ) : null}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-foreground/55">
          <input
            type="checkbox"
            checked={currentMarket}
            onChange={(event) => setCurrentMarket(event.target.checked)}
            className="h-3 w-3 accent-foreground"
          />
          Current Market
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {active === "Positions" ? (
          <PositionsPanel currentMarketOnly={currentMarket} />
        ) : active === "Trade History" ? (
          <TradeHistoryPanel currentMarketOnly={currentMarket} />
        ) : active === "Balances" ? (
          <BalancesPanel />
        ) : (
          <EmptyRow message={`${active} — coming soon.`} />
        )}
      </div>
    </div>
  );
}
