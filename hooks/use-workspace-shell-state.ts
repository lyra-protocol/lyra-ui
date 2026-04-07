"use client";

import { useMemo } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function useWorkspaceShellState() {
  const activeProductId = useWorkspaceStore((state) => state.activeProductId);
  const activeTimeframe = useWorkspaceStore((state) => state.activeTimeframe);
  const activeMarketSnapshot = useWorkspaceStore((state) => state.activeMarketSnapshot);
  const focusedRegion = useWorkspaceStore((state) => state.focusedRegion);
  const rightPanelOpen = useWorkspaceStore((state) => state.rightPanelOpen);
  const mode = useWorkspaceStore((state) => state.mode);
  const setMode = useWorkspaceStore((state) => state.setMode);
  const setFocusedRegion = useWorkspaceStore((state) => state.setFocusedRegion);

  return useMemo(
    () => ({
      activeProductId,
      activeTimeframe,
      activeMarketSnapshot,
      focusedRegion,
      rightPanelOpen,
      mode,
      setMode,
      setFocusedRegion,
    }),
    [
      activeMarketSnapshot,
      activeProductId,
      activeTimeframe,
      focusedRegion,
      mode,
      rightPanelOpen,
      setFocusedRegion,
      setMode,
    ]
  );
}
