"use client";

import { useMemo, useState } from "react";
import { getDisplaySymbol } from "@/core/market/display";
import { MarketDirectoryItem } from "@/core/market/types";
import { SidebarSearchInput } from "@/components/workspace/sidebar-panels/sidebar-search-input";
import {
  buildSeededMarkets,
  searchMarkets,
} from "@/components/workspace/sidebar-panels/workspace-side-market-helpers";
import {
  MarketMemoryRow,
  MemoryRow,
  SectionLabel,
} from "@/components/workspace/sidebar-panels/workspace-side-primitives";
import { SidebarSectionHeader } from "@/components/workspace/sidebar-section-header";
import { useMarketUniverse } from "@/hooks/use-market-universe";
import { useWorkspaceStore } from "@/stores/workspace-store";

const EMPTY_MARKETS: MarketDirectoryItem[] = [];

export function WorkspaceSidePanel() {
  const [query, setQuery] = useState("");
  const {
    activeProductId,
    activeTimeframe,
    watchlistProductIds,
    recentProductIds,
    savedWorkspaces,
    activeWorkspaceId,
    setActiveProductId,
    setFocusedRegion,
    openSavedWorkspace,
  } = useWorkspaceStore();
  const marketUniverseQuery = useMarketUniverse();
  const markets = marketUniverseQuery.data ?? EMPTY_MARKETS;

  const marketById = useMemo(() => new Map(markets.map((market) => [market.id, market])), [markets]);
  const watchlist = watchlistProductIds
    .map((productId) => marketById.get(productId))
    .filter((market): market is MarketDirectoryItem => Boolean(market))
    .slice(0, 8);
  const recentMarkets = recentProductIds
    .filter((productId) => !watchlistProductIds.includes(productId))
    .map((productId) => marketById.get(productId))
    .filter((market): market is MarketDirectoryItem => Boolean(market))
    .slice(0, 6);
  const quickOpenResults = useMemo(() => searchMarkets(markets, query), [markets, query]);
  const seededMarkets = useMemo(
    () => buildSeededMarkets(markets, activeProductId, watchlist, recentMarkets),
    [activeProductId, markets, recentMarkets, watchlist]
  );

  const openMarket = (productId: string) => {
    setActiveProductId(productId);
    setFocusedRegion("canvas");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarSectionHeader title="Context" />

      <div className="px-2 pb-1 pt-0.5 text-[10px] text-black/42">
        {activeProductId ? getDisplaySymbol(activeProductId) : "Loading"} · {activeTimeframe}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {watchlist.length > 0 ? (
          <>
            <SectionLabel>Pinned</SectionLabel>
            {watchlist.map((market) => (
              <MarketMemoryRow
                key={market.id}
                active={market.id === activeProductId}
                label={market.symbol}
                meta={market.name}
                imageUrl={market.image_url}
                onClick={() => openMarket(market.id)}
              />
            ))}
          </>
        ) : null}

        {recentMarkets.length > 0 ? (
          <>
            <SectionLabel>Recent</SectionLabel>
            {recentMarkets.map((market) => (
              <MarketMemoryRow
                key={market.id}
                active={market.id === activeProductId}
                label={market.symbol}
                meta={market.name}
                imageUrl={market.image_url}
                onClick={() => openMarket(market.id)}
              />
            ))}
          </>
        ) : null}

        {savedWorkspaces.length > 0 ? (
          <>
            <SectionLabel>Views</SectionLabel>
            {savedWorkspaces.map((workspace) => (
              <MemoryRow
                key={workspace.id}
                active={workspace.id === activeWorkspaceId}
                label={workspace.name}
                meta={workspace.timeframe}
                onClick={() => {
                  openSavedWorkspace(workspace.id);
                  setFocusedRegion("canvas");
                }}
              />
            ))}
          </>
        ) : null}

        <SectionLabel>Open</SectionLabel>
        <SidebarSearchInput value={query} onChange={setQuery} placeholder="Open a market" />

        {query.trim() ? (
          quickOpenResults.length === 0 ? (
            <div className="px-2 py-2 text-[10px] text-black/38">No live markets match.</div>
          ) : (
            quickOpenResults.map((market) => (
              <MarketMemoryRow
                key={market.id}
                label={market.symbol}
                meta={market.name}
                imageUrl={market.image_url}
                onClick={() => openMarket(market.id)}
              />
            ))
          )
        ) : marketUniverseQuery.isLoading ? (
          <div className="px-2 py-2 text-[10px] text-black/38">Loading live markets…</div>
        ) : (
          seededMarkets.map((market) => (
            <MarketMemoryRow
              key={market.id}
              active={market.id === activeProductId}
              label={market.symbol}
              meta={market.name}
              imageUrl={market.image_url}
              onClick={() => openMarket(market.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
