"use client";

import { useMemo } from "react";
import { MarketDirectoryItem } from "@/core/market/types";
import { getPaperAccountEquity, getPaperAccountUnrealizedPnl } from "@/core/paper/metrics";
import { useLiveMarketTickers } from "@/hooks/use-live-market-tickers";
import { useMarketUniverse } from "@/hooks/use-market-universe";
import { usePaperWorkspace } from "@/hooks/use-paper-workspace";

const EMPTY_MARKETS: MarketDirectoryItem[] = [];

function mergeLivePrices(markets: MarketDirectoryItem[], livePrices: Record<string, number>) {
  return markets.map((market) => {
    const livePrice = livePrices[market.id];
    return livePrice && livePrice > 0 ? { ...market, current_price: livePrice } : market;
  });
}

export function usePaperAccountSummary() {
  const marketUniverse = useMarketUniverse();
  const workspace = usePaperWorkspace();
  const positions = useMemo(() => workspace.data?.positions ?? [], [workspace.data?.positions]);
  const trades = useMemo(() => workspace.data?.trades ?? [], [workspace.data?.trades]);
  const liveTickers = useLiveMarketTickers(positions.map((position) => position.productId));
  const livePrices = useMemo(
    () => Object.fromEntries(Object.entries(liveTickers).map(([productId, ticker]) => [productId, ticker.price])),
    [liveTickers]
  );
  const markets = useMemo(
    () => mergeLivePrices(marketUniverse.data ?? EMPTY_MARKETS, livePrices),
    [livePrices, marketUniverse.data]
  );
  const account = workspace.data?.account ?? null;

  return useMemo(
    () => ({
      account,
      positions,
      trades,
      markets,
      equity: getPaperAccountEquity(account, positions, markets),
      unrealizedPnl: getPaperAccountUnrealizedPnl(positions, markets),
      isLoading: workspace.isLoading || marketUniverse.isLoading,
      error: workspace.error ?? marketUniverse.error ?? null,
    }),
    [
      account,
      marketUniverse.error,
      marketUniverse.isLoading,
      markets,
      positions,
      trades,
      workspace.error,
      workspace.isLoading,
    ]
  );
}
