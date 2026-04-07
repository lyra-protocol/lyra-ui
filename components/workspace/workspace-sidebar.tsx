"use client";

import { ActivityRail } from "@/components/workspace/activity-rail";
import { ContextSidebar } from "@/components/workspace/context-sidebar";

export function WorkspaceSidebar() {
  return (
    <aside className="flex h-full min-h-0 shrink-0 border-r border-black/8 bg-background">
      <ActivityRail />
      <ContextSidebar />
    </aside>
  );
}
