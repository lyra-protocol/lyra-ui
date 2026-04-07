"use client";

import { useEffect } from "react";
import { useMarketUniverse } from "@/hooks/use-market-universe";
import { useMarketCatalogStore } from "@/stores/market-catalog-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function MarketBootstrap() {
  const activeProductId = useWorkspaceStore((state) => state.activeProductId);
  const recentProductIds = useWorkspaceStore((state) => state.recentProductIds);
  const setActiveProductId = useWorkspaceStore((state) => state.setActiveProductId);
  const setMarkets = useMarketCatalogStore((state) => state.setMarkets);
  const marketUniverseQuery = useMarketUniverse();

  useEffect(() => {
    setMarkets(marketUniverseQuery.data ?? []);
  }, [marketUniverseQuery.data, setMarkets]);

  useEffect(() => {
    const markets = marketUniverseQuery.data ?? [];
    if (markets.length === 0) {
      return;
    }

    const hasActiveMarket = markets.some((market) => market.id === activeProductId);
    if (!hasActiveMarket) {
      setActiveProductId(markets[0].id);
      return;
    }

    if (recentProductIds.length === 0) {
      setActiveProductId(activeProductId);
    }
  }, [activeProductId, marketUniverseQuery.data, recentProductIds.length, setActiveProductId]);

  return null;
}
