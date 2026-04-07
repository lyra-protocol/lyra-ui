"use client";

import { Group, Panel } from "react-resizable-panels";
import { CommandPalette } from "@/components/shell/command-palette";
import { WorkspaceAiFloatingPanel } from "@/components/workspace/context/workspace-ai-floating-panel";
import { ContextIntelligencePanel } from "@/components/workspace/context/context-intelligence-panel";
import { AiTradeEntryModal } from "@/components/workspace/context/ai-trade-entry-modal";
import { ActiveMarketSync } from "@/components/workspace/active-market-sync";
import { MarketBootstrap } from "@/components/workspace/market-bootstrap";
import { WorkspaceCenter } from "@/components/workspace/workspace-center";
import { WorkspaceHotkeys } from "@/components/workspace/workspace-hotkeys";
import { WorkspaceResizeHandle } from "@/components/workspace/workspace-resize-handle";
import { WorkspaceSessionSync } from "@/components/workspace/workspace-session-sync";
import { WorkspaceRealtimeSync } from "@/components/workspace/workspace-realtime-sync";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function WorkspaceShell() {
  const rightPanelOpen = useWorkspaceStore((state) => state.rightPanelOpen);

  return (
    <main className="relative flex h-screen w-full flex-col bg-background text-foreground">
      <WorkspaceHotkeys />
      <WorkspaceSessionSync />
      <WorkspaceRealtimeSync />
      <MarketBootstrap />
      <ActiveMarketSync />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceSidebar />

        <Group orientation="horizontal" id="lyra-shell-horizontal">
          <Panel defaultSize={rightPanelOpen ? "72%" : "100%"} minSize="42%">
            <WorkspaceCenter />
          </Panel>

          {rightPanelOpen ? (
            <>
              <WorkspaceResizeHandle direction="vertical" />
              <Panel defaultSize="24%" minSize="18%" maxSize="34%">
                <ContextIntelligencePanel />
              </Panel>
            </>
          ) : null}
        </Group>
      </div>

      <CommandPalette />
      <WorkspaceAiFloatingPanel />
      <AiTradeEntryModal />
    </main>
  );
}
