"use client";

import { useMemo } from "react";
import { AccountSummaryCard } from "@/components/workspace/context/account-summary-card";
import { ContextOnboardingNote } from "@/components/workspace/context/context-onboarding-note";
import { PaperTradePanel } from "@/components/workspace/context/paper-trade-panel";
import { SelectedMarketCard } from "@/components/workspace/context/selected-market-card";
import { MarketDirectoryItem } from "@/core/market/types";
import { useMarketUniverse } from "@/hooks/use-market-universe";
import { usePaperAccountSummary } from "@/hooks/use-paper-account-summary";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { useWorkspaceShellState } from "@/hooks/use-workspace-shell-state";

const EMPTY_MARKETS: MarketDirectoryItem[] = [];

export function ContextIntelligencePanel() {
  const auth = useWorkspaceAuth();
  const workspace = useWorkspaceShellState();
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
      className="flex h-full min-h-0 flex-col overflow-hidden border-l border-black/8 bg-background"
      onPointerDown={() => workspace.setFocusedRegion("context")}
    >
      <div className="border-b border-black/8 px-2 py-1.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">Context</p>
        <p className="mt-1 text-[11px] text-black/78">
          {activeMarket?.symbol ?? "Market"} · {workspace.activeTimeframe}
        </p>
      </div>

      {account ? (
        <ContextOnboardingNote startingBalance={account.startingBalance} currency={account.currency} />
      ) : null}

      {account ? (
        <AccountSummaryCard
          currency={account.currency}
          cashBalance={account.cashBalance}
          equity={equity}
          realizedPnl={account.realizedPnl}
          unrealizedPnl={unrealizedPnl}
          positionCount={positions.length}
        />
      ) : (
        <div className="border-b border-black/8 px-2 py-3 text-[10px] leading-4 text-black/44">
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
          activePosition={activePosition}
          onConnectWallet={() => auth.login()}
        />
      </div>
    </aside>
  );
}
