"use client";

import { useUIStore } from "@/stores/ui-store";
import { WorkspaceAiPanel } from "@/components/workspace/context/workspace-ai-panel";

export function WorkspaceAiFloatingPanel() {
  const aiPanelDetached = useUIStore((state) => state.aiPanelDetached);

  if (!aiPanelDetached) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div className="pointer-events-auto absolute bottom-4 right-4 h-[min(72vh,720px)] w-[min(720px,calc(100vw-32px))] overflow-hidden border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <WorkspaceAiPanel active detached />
      </div>
    </div>
  );
}
