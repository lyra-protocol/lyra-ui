import { create } from "zustand";
import { PaperPositionDirection } from "@/core/paper/types";

export type PaperTradeDraft = {
  productId: string;
  symbol: string;
  mode: "setup" | "manage";
  direction: PaperPositionDirection;
  leverage: number;
  marginUsed: number | null;
  entryPrice: number | null;
  quantity: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
};

type PaperTradeDraftStore = {
  drafts: Record<string, PaperTradeDraft>;
  setDraft: (draft: PaperTradeDraft) => void;
  clearDraft: (productId: string) => void;
};

export const usePaperTradeDraftStore = create<PaperTradeDraftStore>((set) => ({
  drafts: {},
  setDraft: (draft) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [draft.productId]: draft,
      },
    })),
  clearDraft: (productId) =>
    set((state) => {
      const nextDrafts = { ...state.drafts };
      delete nextDrafts[productId];
      return { drafts: nextDrafts };
    }),
}));
