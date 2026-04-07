"use client";

import { usePaperWorkspace } from "@/hooks/use-paper-workspace";

export function usePaperAccount() {
  return usePaperWorkspace().data?.account ?? null;
}
