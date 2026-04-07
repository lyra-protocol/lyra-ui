"use client";

import { usePaperWorkspace } from "@/hooks/use-paper-workspace";

export function usePaperTrades() {
  return usePaperWorkspace().data?.trades ?? [];
}
