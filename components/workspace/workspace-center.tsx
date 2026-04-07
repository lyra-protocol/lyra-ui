"use client";

import { WorkspaceBottomPanel } from "@/components/workspace/bottom-panel/workspace-bottom-panel";
import { CenterContextBar } from "@/components/workspace/center-context-bar";
import { ChartSurface } from "@/components/workspace/chart-surface";

export function WorkspaceCenter() {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <CenterContextBar />
      <ChartSurface />
      <WorkspaceBottomPanel />
    </section>
  );
}
