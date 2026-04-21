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
import { useTpSlWatcher } from "@/hooks/use-tp-sl-watcher";

export function BulkTerminalShell() {
  const { activeProductId, activeTimeframe, activeMarketSnapshot } = useWorkspaceStore();
  const positions = usePaperPositions();
  const activePosition =
    positions.find((position) => position.productId === activeProductId) ?? null;

  // Background watcher: auto-closes any position when its SL or TP is hit.
  useTpSlWatcher();

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <WorkspaceHotkeys />
      <WorkspaceSessionSync />
      <WorkspaceRealtimeSync />
      <MarketBootstrap />
      <ActiveMarketSync />

      <BulkTopBar />
      <BulkMiniTickerStrip />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: chart column with its own bottom tabs sitting under chart + orderbook only */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 overflow-hidden">
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
            </section>

            <aside className="hidden w-[18%] min-w-[240px] max-w-[320px] shrink-0 md:flex">
              <BulkOrderbook />
            </aside>
          </div>

          {/* Bottom tabs span chart + orderbook only */}
          <div className="h-[240px] min-h-[240px] shrink-0 border-t border-[var(--line)]">
            <BulkBottomTabs />
          </div>
        </div>

        {/* Right: trade ticket is full height, top to bottom */}
        <aside className="hidden w-[22%] min-w-[300px] max-w-[380px] shrink-0 lg:flex">
          <BulkTradeTicket />
        </aside>
      </div>

      <CommandPalette />
      <WorkspaceAiChatModal />
      <AiTradeEntryModal />
      <TerminalOnboardingModal />
    </main>
  );
}
