import "server-only";
import { getTimeframeSeconds } from "@/core/market/timeframes";
import {
  CoinbaseProduct,
  MarketCandle,
  MarketTicker,
  MarketTimeframe,
} from "@/core/market/types";

const EXCHANGE_REST_URL = "https://api.exchange.coinbase.com";
const QUOTE_PRIORITY = ["USD", "USDC", "USDT", "EUR", "GBP"];

type FetchOptions = {
  cache?: RequestCache;
  revalidate?: number;
};

async function fetchExchangeJson<T>(path: string, options?: FetchOptions) {
  const response = await fetch(`${EXCHANGE_REST_URL}${path}`, {
    cache: options?.cache,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Coinbase Exchange request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function getQuoteRank(quote: string) {
  const index = QUOTE_PRIORITY.indexOf(quote);
  return index === -1 ? QUOTE_PRIORITY.length + 1 : index;
}

export async function fetchCoinbaseExchangeProducts() {
  const products = await fetchExchangeJson<CoinbaseProduct[]>("/products", { revalidate: 300 });

  return products
    .filter((product) => product.status === "online" && !product.trading_disabled)
    .filter((product) => QUOTE_PRIORITY.includes(product.quote_currency))
    .sort((left, right) => {
      const quoteRank = getQuoteRank(left.quote_currency) - getQuoteRank(right.quote_currency);
      if (quoteRank !== 0) {
        return quoteRank;
      }

      return left.display_name.localeCompare(right.display_name);
    });
}

export async function fetchCoinbaseExchangeOverview(productId: string) {
  const [ticker, stats] = await Promise.all([
    fetchExchangeJson<{ price: string; bid: string; ask: string; size: string; time: string }>(
      `/products/${productId}/ticker`,
      { cache: "no-store" }
    ),
    fetchExchangeJson<{ open: string; high: string; low: string; volume: string }>(
      `/products/${productId}/stats`,
      { cache: "no-store" }
    ),
  ]);

  return {
    productId,
    price: Number(ticker.price),
    open24h: Number(stats.open),
    high24h: Number(stats.high),
    low24h: Number(stats.low),
    volume24h: Number(stats.volume),
    bestBid: Number(ticker.bid),
    bestAsk: Number(ticker.ask),
    lastSize: Number(ticker.size),
    time: ticker.time,
  } satisfies MarketTicker;
}

export async function fetchCoinbaseExchangeCandles(
  productId: string,
  timeframe: MarketTimeframe
) {
  const granularity = getTimeframeSeconds(timeframe);
  const candles = await fetchExchangeJson<number[][]>(
    `/products/${productId}/candles?granularity=${granularity}`,
    { cache: "no-store" }
  );

  return candles
    .map<MarketCandle>((entry) => ({
      time: entry[0],
      low: entry[1],
      high: entry[2],
      open: entry[3],
      close: entry[4],
      volume: entry[5],
    }))
    .sort((left, right) => left.time - right.time);
}
