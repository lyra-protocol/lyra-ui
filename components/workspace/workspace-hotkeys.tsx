"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { useUIStore } from "@/stores/ui-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function WorkspaceHotkeys() {
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette);
  const openCommandPalette = useUIStore((state) => state.openCommandPalette);
  const closeCommandPalette = useUIStore((state) => state.closeCommandPalette);
  const toggleLeftSidebar = useWorkspaceStore((state) => state.toggleLeftSidebar);
  const bottomPanelOpen = useWorkspaceStore((state) => state.bottomPanelOpen);
  const bottomPanelTab = useWorkspaceStore((state) => state.bottomPanelTab);
  const openBottomPanel = useWorkspaceStore((state) => state.openBottomPanel);
  const closeBottomPanel = useWorkspaceStore((state) => state.closeBottomPanel);
  const setBottomPanelTab = useWorkspaceStore((state) => state.setBottomPanelTab);

  useHotkeys("meta+k,ctrl+k", (event) => {
    event.preventDefault();
    toggleCommandPalette();
  });

  useHotkeys("/", (event) => {
    event.preventDefault();
    openCommandPalette("/");
  });

  useHotkeys("meta+b,ctrl+b", (event) => {
    event.preventDefault();
    toggleLeftSidebar();
  });

  useHotkeys("meta+j,ctrl+j", (event) => {
    event.preventDefault();
    if (bottomPanelOpen && bottomPanelTab === "terminal") {
      closeBottomPanel();
      return;
    }
    setBottomPanelTab("terminal");
    openBottomPanel();
  });

  useHotkeys("escape", () => {
    closeCommandPalette();
  });

  return null;
}
