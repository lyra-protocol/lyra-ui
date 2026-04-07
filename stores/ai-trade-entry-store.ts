import { create } from "zustand";
import { AiSignalSummary } from "@/core/ai/signal";

export type AiTradeEntryDraft = {
  signal: AiSignalSummary;
  content: string;
};

type AiTradeEntryStore = {
  draft: AiTradeEntryDraft | null;
  open: (draft: AiTradeEntryDraft) => void;
  close: () => void;
};

export const useAiTradeEntryStore = create<AiTradeEntryStore>((set) => ({
  draft: null,
  open: (draft) => set({ draft }),
  close: () => set({ draft: null }),
}));
