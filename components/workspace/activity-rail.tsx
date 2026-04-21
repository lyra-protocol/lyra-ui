"use client";

import { RailSection, useWorkspaceStore } from "@/stores/workspace-store";
import { PanelLeft, Search, MessageSquareText } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

type RailItem = {
  id: RailSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const RAIL_ITEMS: RailItem[] = [
  { id: "memory", label: "Workspace", icon: PanelLeft },
  { id: "browse", label: "Browse", icon: Search },
];

export function ActivityRail() {
  const openAiChat = useUIStore((s) => s.openAiChat);
  const {
    activeRailSection,
    leftSidebarCollapsed,
    setActiveRailSection,
    toggleLeftSidebar,
    openLeftSidebar,
  } = useWorkspaceStore();
  const handleSelect = (section: RailSection) => {
    if (activeRailSection === section) {
      toggleLeftSidebar();
      return;
    }

    setActiveRailSection(section);
    if (leftSidebarCollapsed) {
      openLeftSidebar();
    }
  };

  return (
    <nav
      aria-label="Workspace sections"
      className="flex h-full w-12 flex-col border-r border-black/8 bg-background"
    >
      <div className="flex h-11 items-center justify-center border-b border-black/8">
        <span className="text-[10px] font-semibold tracking-[0.22em] text-black/78">LY</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col py-1">
        {RAIL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeRailSection === item.id && !leftSidebarCollapsed;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-label={item.label}
              aria-pressed={active}
              title={item.label}
              className={[
                "relative flex h-10 items-center justify-center border-l-2 transition",
                active
                  ? "border-black text-black"
                  : "border-transparent text-black/44 hover:bg-black/[0.02] hover:text-black/72",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}

        <div className="mt-1 px-2">
          <div className="h-px w-full bg-black/8" />
        </div>

        <button
          type="button"
          onClick={openAiChat}
          aria-label="Assistant"
          title="Assistant"
          className="relative flex h-10 items-center justify-center border-l-2 border-transparent text-black/44 transition hover:bg-black/[0.02] hover:text-black/72"
        >
          <MessageSquareText className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
