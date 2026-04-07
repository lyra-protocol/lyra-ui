"use client";

import { usePaperWorkspace } from "@/hooks/use-paper-workspace";

export function useRecentRecordActivity() {
  const workspace = usePaperWorkspace();

  return {
    activity: workspace.data?.activity ?? [],
    recordSyncStatus: workspace.data?.recordSyncStatus ?? "pending",
  } as const;
}
