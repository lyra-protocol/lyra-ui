import "server-only";

import {
  MarketCandle,
  MarketDirectoryItem,
  MarketTicker,
  MarketTimeframe,
} from "@/core/market/types";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

type HyperliquidMeta = {
  universe: Array<{ name: string; maxLeverage: number }>;
};

type HyperliquidAssetContext = {
  dayNtlVlm: string;
  prevDayPx: string;
  markPx: string;
  midPx?: string;
  openInterest: string;
};

type HyperliquidCandle = {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
};

const HYPERLIQUID_INTERVAL_MAP: Record<MarketTimeframe, string> = {
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

const HYPERLIQUID_LOOKBACK_MS: Record<MarketTimeframe, number> = {
  "15m": 1000 * 60 * 60 * 24 * 3,
  "1h": 1000 * 60 * 60 * 24 * 7,
  "4h": 1000 * 60 * 60 * 24 * 30,
  "1d": 1000 * 60 * 60 * 24 * 180,
};

function toNumber(value?: string | number | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function postHyperliquid<T>(body: unknown) {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function toProductId(coin: string) {
  return `${coin}-USD`;
}

function toHyperliquidCoin(productId: string) {
  return productId.replace(/-USD$/i, "");
}

export async function fetchHyperliquidProductsServer() {
  const [meta, contexts] = await postHyperliquid<[HyperliquidMeta, HyperliquidAssetContext[]]>({
    type: "metaAndAssetCtxs",
  });

  return meta.universe.map<MarketDirectoryItem>((asset, index) => {
    const context = contexts[index];
    const currentPrice = toNumber(context?.markPx || context?.midPx);
    const previousPrice = toNumber(context?.prevDayPx);
    const change24h =
      previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : null;

    return {
      id: toProductId(asset.name),
      provider_coin: asset.name,
      symbol: asset.name,
      name: asset.name,
      base_currency: asset.name,
      quote_currency: "USD",
      display_name: asset.name,
      current_price: currentPrice,
      market_cap: null,
      total_volume: toNumber(context?.dayNtlVlm),
      exchange_volume_24h: toNumber(context?.dayNtlVlm),
      price_change_percentage_24h: change24h,
      max_leverage: asset.maxLeverage ?? null,
      open_interest: toNumber(context?.openInterest),
    };
  });
}

export async function fetchHyperliquidOverviewServer(productId: string) {
  const markets = await fetchHyperliquidProductsServer();
  const market = markets.find((item) => item.id === productId);

  if (!market) {
    throw new Error(`Unsupported market: ${productId}`);
  }

  return {
    productId,
    price: market.current_price,
    open24h:
      market.price_change_percentage_24h === null
        ? market.current_price
        : market.current_price / (1 + market.price_change_percentage_24h / 100),
    high24h: market.current_price,
    low24h: market.current_price,
    volume24h: market.exchange_volume_24h ?? 0,
    bestBid: market.current_price,
    bestAsk: market.current_price,
    lastSize: 0,
    time: new Date().toISOString(),
  } satisfies MarketTicker;
}

export async function fetchHyperliquidCandlesServer(
  productId: string,
  timeframe: MarketTimeframe
) {
  const now = Date.now();
  const candles = await postHyperliquid<HyperliquidCandle[]>({
    type: "candleSnapshot",
    req: {
      coin: toHyperliquidCoin(productId),
      interval: HYPERLIQUID_INTERVAL_MAP[timeframe],
      startTime: now - HYPERLIQUID_LOOKBACK_MS[timeframe],
      endTime: now,
    },
  });

  return candles.map<MarketCandle>((entry) => ({
    time: Math.floor(entry.t / 1000),
    open: toNumber(entry.o),
    high: toNumber(entry.h),
    low: toNumber(entry.l),
    close: toNumber(entry.c),
    volume: toNumber(entry.v),
  }));
}
