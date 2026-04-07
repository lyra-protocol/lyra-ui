"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarketOverview } from "@/core/market/market-client";

export function useMarketOverview(productId: string) {
  return useQuery({
    queryKey: ["markets", "overview", productId],
    queryFn: () => fetchMarketOverview(productId),
    enabled: Boolean(productId),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
