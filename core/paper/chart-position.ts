import { PaperPosition } from "@/core/paper/types";
import { PaperTradeDraft } from "@/stores/paper-trade-draft-store";

export function getChartTradePosition({
  productId,
  activePosition,
  draft,
}: {
  productId: string;
  activePosition: PaperPosition | null;
  draft: PaperTradeDraft | null;
}) {
  if (activePosition) {
    if (!draft || draft.mode !== "manage" || draft.productId !== activePosition.productId) {
      return activePosition;
    }

    return {
      ...activePosition,
      stopLoss: draft.stopLoss,
      takeProfit: draft.takeProfit,
    } satisfies PaperPosition;
  }

  if (
    !draft ||
    draft.mode !== "setup" ||
    draft.productId !== productId ||
    !draft.marginUsed ||
    !draft.entryPrice ||
    !draft.quantity
  ) {
    return null;
  }

  return {
    id: `draft:${draft.productId}`,
    productId: draft.productId,
    symbol: draft.symbol,
    direction: draft.direction,
    leverage: draft.leverage,
    marginUsed: draft.marginUsed,
    quantity: draft.quantity,
    entryPrice: draft.entryPrice,
    stopLoss: draft.stopLoss,
    takeProfit: draft.takeProfit,
    openedAt: "",
    updatedAt: "",
  } satisfies PaperPosition;
}
