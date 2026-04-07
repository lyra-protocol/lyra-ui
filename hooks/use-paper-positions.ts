"use client";

import { usePaperWorkspace } from "@/hooks/use-paper-workspace";

export function usePaperPositions() {
  return usePaperWorkspace().data?.positions ?? [];
}
