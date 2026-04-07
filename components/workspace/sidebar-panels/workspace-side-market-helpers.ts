import { MarketDirectoryItem } from "@/core/market/types";

export function buildSeededMarkets(
  markets: MarketDirectoryItem[],
  activeProductId: string,
  watchlist: MarketDirectoryItem[],
  recentMarkets: MarketDirectoryItem[]
) {
  const seeded: MarketDirectoryItem[] = [];
  const seen = new Set<string>();

  const append = (market?: MarketDirectoryItem) => {
    if (!market || seen.has(market.id)) {
      return;
    }
    seen.add(market.id);
    seeded.push(market);
  };

  append(markets.find((market) => market.id === activeProductId));
  watchlist.forEach(append);
  recentMarkets.forEach(append);
  markets.forEach((market) => {
    if (seeded.length >= 8) {
      return;
    }
    if (market.image_url || market.market_cap !== null || market.total_volume !== null) {
      append(market);
    }
  });

  return seeded.slice(0, 8);
}

export function searchMarkets(markets: MarketDirectoryItem[], query: string) {
  const search = query.trim().toLowerCase();
  if (!search) {
    return [];
  }

  return markets
    .filter((market) =>
      [market.id, market.symbol, market.name, market.display_name].some((value) =>
        value.toLowerCase().includes(search)
      )
    )
    .slice(0, 8);
}
