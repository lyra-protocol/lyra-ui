"use client";

import { useEffect, useMemo } from "react";
import { useLiveMarketTickers } from "@/hooks/use-live-market-tickers";
import { useMarketOverview } from "@/hooks/use-market-overview";
import { MarketTicker } from "@/core/market/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

function mergeSnapshots(
  overview: MarketTicker | null | undefined,
  live: MarketTicker | null | undefined
) {
  if (!overview && !live) {
    return null;
  }

  return {
    ...(overview ?? {}),
    ...(live ?? {}),
  } as MarketTicker;
}

export function ActiveMarketSync() {
  const activeProductId = useWorkspaceStore((state) => state.activeProductId);
  const setActiveMarketSnapshot = useWorkspaceStore(
    (state) => state.setActiveMarketSnapshot
  );
  const overviewQuery = useMarketOverview(activeProductId);
  const liveTickers = useLiveMarketTickers(activeProductId ? [activeProductId] : []);
  const liveSnapshot = activeProductId ? liveTickers[activeProductId] ?? null : null;
  const nextSnapshot = useMemo(
    () => mergeSnapshots(overviewQuery.data ?? null, liveSnapshot),
    [liveSnapshot, overviewQuery.data]
  );

  useEffect(() => {
    setActiveMarketSnapshot(null);
  }, [activeProductId, setActiveMarketSnapshot]);

  useEffect(() => {
    setActiveMarketSnapshot(nextSnapshot);
  }, [nextSnapshot, setActiveMarketSnapshot]);

  return null;
}
