"use client";

import { CommandPalette } from "@/components/shell/command-palette";
import { WorkspaceAiChatModal } from "@/components/workspace/context/workspace-ai-chat-modal";
import { AiTradeEntryModal } from "@/components/workspace/context/ai-trade-entry-modal";
import { TerminalOnboardingModal } from "@/components/workspace/onboarding/terminal-onboarding-modal";
import { ActiveMarketSync } from "@/components/workspace/active-market-sync";
import { MarketBootstrap } from "@/components/workspace/market-bootstrap";
import { WorkspaceHotkeys } from "@/components/workspace/workspace-hotkeys";
import { WorkspaceSessionSync } from "@/components/workspace/workspace-session-sync";
import { WorkspaceRealtimeSync } from "@/components/workspace/workspace-realtime-sync";
import { LiveMarketChart } from "@/components/workspace/live-market-chart";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { usePaperPositions } from "@/hooks/use-paper-positions";
import { BulkTopBar } from "@/components/workspace/bulk/bulk-top-bar";
import { BulkMiniTickerStrip } from "@/components/workspace/bulk/bulk-mini-ticker-strip";
import { BulkPairHeader } from "@/components/workspace/bulk/bulk-pair-header";
import { BulkChartToolRail } from "@/components/workspace/bulk/bulk-chart-tool-rail";
import { BulkTimeframeBar } from "@/components/workspace/bulk/bulk-timeframe-bar";
import { BulkOrderbook } from "@/components/workspace/bulk/bulk-orderbook";
import { BulkTradeTicket } from "@/components/workspace/bulk/bulk-trade-ticket";
import { BulkBottomTabs } from "@/components/workspace/bulk/bulk-bottom-tabs";

export function BulkTerminalShell() {
  const { activeProductId, activeTimeframe, activeMarketSnapshot } = useWorkspaceStore();
  const positions = usePaperPositions();
  const activePosition =
    positions.find((position) => position.productId === activeProductId) ?? null;

  return (
    <main className="relative flex h-screen w-full flex-col bg-background text-foreground">
      <WorkspaceHotkeys />
      <WorkspaceSessionSync />
      <WorkspaceRealtimeSync />
      <MarketBootstrap />
      <ActiveMarketSync />

      <BulkTopBar />
      <BulkMiniTickerStrip />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Main column: chart + bottom tabs */}
        <section className="flex min-w-0 flex-1 flex-col">
          <BulkPairHeader />
          <BulkTimeframeBar />
          <div className="flex min-h-0 flex-1">
            <BulkChartToolRail />
            <div className="relative min-h-0 min-w-0 flex-1 bg-background">
              <LiveMarketChart
                productId={activeProductId}
                timeframe={activeTimeframe}
                snapshot={activeMarketSnapshot}
                activePosition={activePosition}
              />
            </div>
          </div>
          <div className="h-[200px] min-h-[200px] shrink-0">
            <BulkBottomTabs />
          </div>
        </section>

        {/* Middle column: orderbook */}
        <div className="hidden w-[260px] shrink-0 lg:flex">
          <BulkOrderbook />
        </div>

        {/* Right column: trade ticket */}
        <div className="hidden w-[280px] shrink-0 xl:flex">
          <BulkTradeTicket />
        </div>
      </div>

      <CommandPalette />
      <WorkspaceAiChatModal />
      <AiTradeEntryModal />
      <TerminalOnboardingModal />
    </main>
  );
}
