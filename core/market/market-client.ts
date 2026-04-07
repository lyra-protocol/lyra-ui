"use client";

import { fetchCoinGeckoMarkets } from "@/core/market/coingecko-browser";
import { buildMarketOverview } from "@/core/market/market-overview";
import {
  fetchHyperliquidCandles,
  fetchHyperliquidDirectory,
  fetchHyperliquidOverview,
  fetchHyperliquidOrderBook,
} from "@/core/market/hyperliquid-browser";
import { MarketDirectoryItem, MarketTimeframe } from "@/core/market/types";

function mergeDirectory(
  hyperliquidMarkets: MarketDirectoryItem[],
  geckoMarkets: Awaited<ReturnType<typeof fetchCoinGeckoMarkets>>
) {
  const geckoBySymbol = new Map(
    geckoMarkets.map((market) => [market.symbol.toUpperCase(), market])
  );

  const merged = hyperliquidMarkets.map<MarketDirectoryItem>((market) => {
    const gecko = geckoBySymbol.get(market.symbol.toUpperCase());
    return {
      ...market,
      name: gecko?.name ?? market.name,
      image_url: gecko?.image ?? market.image_url,
      current_price: gecko?.current_price ?? market.current_price,
      market_cap: gecko?.market_cap ?? market.market_cap,
      total_volume: gecko?.total_volume ?? market.total_volume,
      price_change_percentage_24h:
        gecko?.price_change_percentage_24h ?? market.price_change_percentage_24h,
    };
  });

  const recognizableMarkets = merged
    .filter((market) => market.market_cap !== null)
    .sort((left, right) => (right.market_cap ?? 0) - (left.market_cap ?? 0));
  const longTailMarkets = merged
    .filter((market) => market.market_cap === null)
    .sort((left, right) => (right.exchange_volume_24h ?? 0) - (left.exchange_volume_24h ?? 0));

  if (recognizableMarkets.length >= 20) {
    return [...recognizableMarkets, ...longTailMarkets];
  }

  return merged.sort(
    (left, right) => (right.exchange_volume_24h ?? 0) - (left.exchange_volume_24h ?? 0)
  );
}

export function fetchMarketProducts() {
  return (async () => {
    const hyperliquidMarkets = await fetchHyperliquidDirectory();

    try {
      return mergeDirectory(hyperliquidMarkets, await fetchCoinGeckoMarkets());
    } catch {
      return hyperliquidMarkets.sort(
        (left, right) => (right.exchange_volume_24h ?? 0) - (left.exchange_volume_24h ?? 0)
      );
    }
  })();
}

export function fetchMarketOverview(productId: string) {
  return (async () => {
    const [overview, candles] = await Promise.all([
      fetchHyperliquidOverview(productId),
      fetchHyperliquidCandles(productId, "15m"),
    ]);

    return buildMarketOverview(overview, candles);
  })();
}

export function fetchMarketCandles(productId: string, timeframe: MarketTimeframe) {
  return fetchHyperliquidCandles(productId, timeframe);
}

export function fetchMarketOrderBook(productId: string) {
  return fetchHyperliquidOrderBook(productId);
}
