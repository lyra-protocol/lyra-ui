"use client";

import { useMemo, useState } from "react";
import { MarketListRow } from "@/components/workspace/sidebar-panels/market-list-row";
import { SidebarSearchInput } from "@/components/workspace/sidebar-panels/sidebar-search-input";
import { SidebarSectionHeader } from "@/components/workspace/sidebar-section-header";
import { useMarketUniverse } from "@/hooks/use-market-universe";
import { useWorkspaceStore } from "@/stores/workspace-store";

function matchesProduct(query: string, terms: string[]) {
  const pattern = query.toLowerCase();
  return terms.some((term) => term.toLowerCase().includes(pattern));
}

export function MarketDirectoryPanel() {
  const [query, setQuery] = useState("");
  const activeProductId = useWorkspaceStore((state) => state.activeProductId);
  const recentProductIds = useWorkspaceStore((state) => state.recentProductIds);
  const setActiveProductId = useWorkspaceStore((state) => state.setActiveProductId);
  const setFocusedRegion = useWorkspaceStore((state) => state.setFocusedRegion);
  const marketUniverseQuery = useMarketUniverse();

  const visibleMarkets = useMemo(() => {
    const markets = marketUniverseQuery.data ?? [];
    if (query.trim()) {
      return markets.filter((market) =>
        matchesProduct(query, [market.id, market.symbol, market.name, market.display_name])
      );
    }

    const focusIds = [activeProductId, ...recentProductIds].filter(Boolean);
    const marketById = new Map(markets.map((market) => [market.id, market]));
    const focusMarkets = [...new Set(focusIds)]
      .map((id) => marketById.get(id))
      .filter((market): market is NonNullable<typeof market> => Boolean(market));
    const remainingMarkets = markets.filter(
      (market) => !focusMarkets.some((focusedMarket) => focusedMarket.id === market.id)
    );

    return [...focusMarkets, ...remainingMarkets];
  }, [activeProductId, marketUniverseQuery.data, query, recentProductIds]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarSectionHeader title="Browse" />
      <SidebarSearchInput value={query} onChange={setQuery} placeholder="Search markets" />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {marketUniverseQuery.isLoading ? (
          <div className="px-2 py-3 text-[10px] text-black/44">Loading market feed…</div>
        ) : marketUniverseQuery.isError ? (
          <div className="px-2 py-3 text-[10px] text-black/44">
            Unable to load live markets right now.
          </div>
        ) : visibleMarkets.length === 0 ? (
          <div className="px-2 py-3 text-[10px] text-black/44">
            No live markets match this search.
          </div>
        ) : (
          visibleMarkets.map((market) => (
            <MarketListRow
              key={market.id}
              id={market.id}
              symbol={market.symbol}
              name={market.name}
              imageUrl={market.image_url}
              lastPrice={market.current_price}
              change24h={market.price_change_percentage_24h}
              active={activeProductId === market.id}
              onClick={() => {
                setActiveProductId(market.id);
                setFocusedRegion("canvas");
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
