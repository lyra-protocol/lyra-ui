"use client";

import { useEffect, useRef } from "react";
import { useLiveMarketTickers } from "@/hooks/use-live-market-tickers";
import { usePaperPositions } from "@/hooks/use-paper-positions";
import { usePaperTradeActions } from "@/hooks/use-paper-trade-actions";

/**
 * Monitors open paper positions against the live mark price and auto-closes
 * when take-profit or stop-loss levels are crossed.
 *
 * Each position is closed at most once per session here; the mutation updates
 * the React Query cache so the position disappears from the UI immediately.
 */
export function useTpSlWatcher() {
  const positions = usePaperPositions();
  const tradeMutation = usePaperTradeActions();
  const closedIdsRef = useRef<Set<string>>(new Set());

  const productIds = positions.map((position) => position.productId);
  const tickers = useLiveMarketTickers(productIds);

  useEffect(() => {
    for (const position of positions) {
      if (closedIdsRef.current.has(position.id)) continue;
      const ticker = tickers[position.productId];
      const markPrice = ticker?.price;
      if (!markPrice || !Number.isFinite(markPrice)) continue;

      const tp = position.takeProfit;
      const sl = position.stopLoss;

      const hitTp =
        typeof tp === "number" &&
        tp > 0 &&
        (position.direction === "long" ? markPrice >= tp : markPrice <= tp);
      const hitSl =
        typeof sl === "number" &&
        sl > 0 &&
        (position.direction === "long" ? markPrice <= sl : markPrice >= sl);

      if (!hitTp && !hitSl) continue;

      closedIdsRef.current.add(position.id);
      tradeMutation.mutate(
        {
          action: "close",
          productId: position.productId,
          symbol: position.symbol,
          quantity: position.quantity,
          price: markPrice,
          note: hitTp ? "Auto-close: take profit hit" : "Auto-close: stop loss hit",
        },
        {
          onError: () => {
            // Allow another attempt on the next tick if the server rejected it.
            closedIdsRef.current.delete(position.id);
          },
        }
      );
    }
  }, [positions, tickers, tradeMutation]);
}
