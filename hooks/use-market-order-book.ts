"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarketOrderBook } from "@/core/market/market-client";

export function useMarketOrderBook(productId: string) {
  return useQuery({
    queryKey: ["markets", "order-book", productId],
    queryFn: () => fetchMarketOrderBook(productId),
    enabled: Boolean(productId),
    refetchInterval: 1500,
    refetchOnReconnect: true,
  });
}
