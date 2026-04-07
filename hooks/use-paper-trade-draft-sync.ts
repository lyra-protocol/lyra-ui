"use client";

import { useEffect } from "react";
import { PaperTradeDraft, usePaperTradeDraftStore } from "@/stores/paper-trade-draft-store";

export function usePaperTradeDraftSync(draft: PaperTradeDraft) {
  const setDraft = usePaperTradeDraftStore((state) => state.setDraft);
  const clearDraft = usePaperTradeDraftStore((state) => state.clearDraft);
  const {
    direction,
    entryPrice,
    leverage,
    marginUsed,
    mode,
    productId,
    quantity,
    stopLoss,
    symbol,
    takeProfit,
  } = draft;

  useEffect(() => {
    setDraft({
      direction,
      entryPrice,
      leverage,
      marginUsed,
      mode,
      productId,
      quantity,
      stopLoss,
      symbol,
      takeProfit,
    });
  }, [
    direction,
    entryPrice,
    leverage,
    marginUsed,
    mode,
    productId,
    quantity,
    setDraft,
    stopLoss,
    symbol,
    takeProfit,
  ]);

  useEffect(() => () => clearDraft(productId), [clearDraft, productId]);
}
