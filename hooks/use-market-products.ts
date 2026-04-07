"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarketProducts } from "@/core/market/market-client";

export function useMarketProducts() {
  return useQuery({
    queryKey: ["markets", "products"],
    queryFn: fetchMarketProducts,
    staleTime: 1000 * 60 * 10,
  });
}
