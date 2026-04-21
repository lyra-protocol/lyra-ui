"use client";

import { useMemo } from "react";
import { MessageSquareText } from "lucide-react";
import { AccountSummaryCard } from "@/components/workspace/context/account-summary-card";
import { ContextOnboardingNote } from "@/components/workspace/context/context-onboarding-note";
import { PaperBalanceResetAction } from "@/components/workspace/context/paper-balance-reset-action";
import { PaperTradePanel } from "@/components/workspace/context/paper-trade-panel";
import { SelectedMarketCard } from "@/components/workspace/context/selected-market-card";
import { MarketDirectoryItem } from "@/core/market/types";
import { useMarketUniverse } from "@/hooks/use-market-universe";
import { usePaperAccountSummary } from "@/hooks/use-paper-account-summary";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { useWorkspaceShellState } from "@/hooks/use-workspace-shell-state";
import { useUIStore } from "@/stores/ui-store";

const EMPTY_MARKETS: MarketDirectoryItem[] = [];

export function ContextIntelligencePanel() {
  const auth = useWorkspaceAuth();
  const workspace = useWorkspaceShellState();
  const openAiChat = useUIStore((s) => s.openAiChat);
  const marketUniverse = useMarketUniverse();
  const paperSummary = usePaperAccountSummary();

  const markets = useMemo(() => marketUniverse.data ?? EMPTY_MARKETS, [marketUniverse.data]);
  const activeMarket = useMemo(
    () => markets.find((market) => market.id === workspace.activeProductId) ?? null,
    [markets, workspace.activeProductId]
  );
  const { account, equity, unrealizedPnl, positions } = paperSummary;
  const activePosition = positions.find((position) => position.productId === workspace.activeProductId) ?? null;

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden border-l border-[var(--line)] bg-[var(--panel-2)]"
      onPointerDown={() => workspace.setFocusedRegion("context")}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45">Context</p>
          <p className="mt-1 truncate text-[11px] text-foreground/80">
            {activeMarket?.symbol ?? "Market"} · {workspace.activeTimeframe}
          </p>
        </div>
        <button
          type="button"
          onClick={openAiChat}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] text-foreground/70 transition hover:bg-foreground/[0.05] hover:text-foreground/90"
          aria-label="Open assistant"
          title="Assistant"
        >
          <MessageSquareText className="h-4 w-4" />
        </button>
      </div>

      {account ? (
        <ContextOnboardingNote startingBalance={account.startingBalance} currency={account.currency} />
      ) : null}

      {account ? (
        <>
          <AccountSummaryCard
            currency={account.currency}
            cashBalance={account.cashBalance}
            equity={equity}
            realizedPnl={account.realizedPnl}
            unrealizedPnl={unrealizedPnl}
            positionCount={positions.length}
          />
          <PaperBalanceResetAction startingBalance={account.startingBalance} currency={account.currency} />
        </>
      ) : (
        <div className="border-b border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[10px] leading-4 text-foreground/50">
          {auth.authenticated ? "Loading paper workspace…" : "Connect a wallet to open your paper workspace."}
        </div>
      )}

      <SelectedMarketCard
        market={activeMarket}
        snapshot={workspace.activeMarketSnapshot}
        position={activePosition}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <PaperTradePanel
          authenticated={auth.authenticated}
          symbol={activeMarket?.symbol ?? "--"}
          productId={workspace.activeProductId}
          price={workspace.activeMarketSnapshot?.price ?? activeMarket?.current_price ?? 0}
          availableBalance={account?.cashBalance ?? 0}
          marketMaxLeverage={null}
          activePosition={activePosition}
          onConnectWallet={() => auth.login()}
        />
      </div>
    </aside>
  );
}
