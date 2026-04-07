"use client";

import { MarketDirectoryPanel } from "@/components/workspace/sidebar-panels/market-directory-panel";
import { WorkspaceSidePanel } from "@/components/workspace/sidebar-panels/workspace-side-panel";
import { useWorkspaceStore } from "@/stores/workspace-store";

function SidebarContent() {
  const { activeRailSection } = useWorkspaceStore();

  if (activeRailSection === "browse") {
    return <MarketDirectoryPanel />;
  }
  return <WorkspaceSidePanel />;
}

export function ContextSidebar() {
  const { leftSidebarCollapsed, setFocusedRegion } = useWorkspaceStore();

  if (leftSidebarCollapsed) {
    return null;
  }

  return (
    <section
      className="flex h-full w-[248px] min-w-[248px] flex-col bg-background"
      onPointerDown={() => setFocusedRegion("sidebar")}
    >
      <div className="min-h-0 flex-1">
        <SidebarContent />
      </div>
    </section>
  );
}
