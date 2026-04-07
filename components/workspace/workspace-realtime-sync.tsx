"use client";

import { usePaperWorkspaceRealtime } from "@/hooks/use-paper-workspace-realtime";

export function WorkspaceRealtimeSync() {
  usePaperWorkspaceRealtime();
  return null;
}
