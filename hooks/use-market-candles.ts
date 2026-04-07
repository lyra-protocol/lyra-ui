"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarketCandles } from "@/core/market/market-client";
import { MarketTimeframe } from "@/core/market/types";

export function useMarketCandles(productId: string, timeframe: MarketTimeframe) {
  return useQuery({
    queryKey: ["markets", "candles", productId, timeframe],
    queryFn: () => fetchMarketCandles(productId, timeframe),
    enabled: Boolean(productId),
    refetchInterval: 1000 * 30,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
