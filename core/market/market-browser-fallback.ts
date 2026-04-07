"use client";

import { getTimeframeSeconds } from "@/core/market/timeframes";
import { CoinbaseProduct, MarketCandle, MarketTicker, MarketTimeframe } from "@/core/market/types";

const COINBASE_REST_URL = "https://api.exchange.coinbase.com";
const KRAKEN_REST_URL = "https://api.kraken.com/0/public";
const ALLOWED_QUOTES = new Set(["USD", "USDC", "USDT", "EUR", "GBP"]);

function normalizeKrakenCode(code: string) {
  if (code === "XBT") return "BTC";
  if (code === "XDG") return "DOGE";
  return code.replace(/^[XZ]/, "");
}

function toKrakenCode(code: string) {
  if (code === "BTC") return "XBT";
  if (code === "DOGE") return "XDG";
  return code;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchCoinbaseProductsDirect() {
  const products = await fetchJson<CoinbaseProduct[]>(`${COINBASE_REST_URL}/products`);

  return products
    .filter((product) => product.status === "online" && !product.trading_disabled)
    .filter((product) => ALLOWED_QUOTES.has(product.quote_currency))
    .sort((left, right) => left.display_name.localeCompare(right.display_name));
}

export async function fetchCoinbaseOverviewDirect(productId: string) {
  const [ticker, stats] = await Promise.all([
    fetchJson<{ price: string; bid: string; ask: string; size: string; time: string }>(
      `${COINBASE_REST_URL}/products/${productId}/ticker`
    ),
    fetchJson<{ open: string; high: string; low: string; volume: string }>(
      `${COINBASE_REST_URL}/products/${productId}/stats`
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

export async function fetchCoinbaseCandlesDirect(
  productId: string,
  timeframe: MarketTimeframe
) {
  const granularity = getTimeframeSeconds(timeframe);
  const candles = await fetchJson<number[][]>(
    `${COINBASE_REST_URL}/products/${productId}/candles?granularity=${granularity}`
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

type KrakenPair = { altname: string; wsname?: string; status?: string };

async function fetchKrakenJson<T>(path: string) {
  const payload = await fetchJson<{ error?: string[]; result: T }>(`${KRAKEN_REST_URL}${path}`);
  if (payload.error && payload.error.length > 0) {
    throw new Error(payload.error.join(", "));
  }

  return payload.result;
}

function toKrakenProductId(pair: KrakenPair) {
  const [base, quote] = (pair.wsname ?? pair.altname).split("/");
  if (!base || !quote) {
    return null;
  }

  const normalizedQuote = normalizeKrakenCode(quote);
  if (!ALLOWED_QUOTES.has(normalizedQuote)) {
    return null;
  }

  return `${normalizeKrakenCode(base)}-${normalizedQuote}`;
}

async function resolveKrakenSymbol(productId: string) {
  const pairs = await fetchKrakenJson<Record<string, KrakenPair>>("/AssetPairs");
  const match = Object.values(pairs).find((pair) => toKrakenProductId(pair) === productId);
  if (match) {
    return match.altname;
  }

  const [base, quote] = productId.split("-");
  return `${toKrakenCode(base)}${toKrakenCode(quote)}`;
}

export async function fetchKrakenProductsDirect() {
  const pairs = await fetchKrakenJson<Record<string, KrakenPair>>("/AssetPairs");

  return Object.values(pairs)
    .filter((pair) => !pair.status || pair.status === "online")
    .map<CoinbaseProduct | null>((pair) => {
      const productId = toKrakenProductId(pair);
      if (!productId) {
        return null;
      }

      const [base_currency, quote_currency] = productId.split("-");
      return {
        id: productId,
        base_currency,
        quote_currency,
        display_name: `${base_currency}/${quote_currency}`,
        status: "online",
        status_message: "",
        post_only: false,
        limit_only: false,
        cancel_only: false,
        trading_disabled: false,
      };
    })
    .filter((pair): pair is CoinbaseProduct => Boolean(pair))
    .sort((left, right) => left.display_name.localeCompare(right.display_name));
}

export async function fetchKrakenOverviewDirect(productId: string) {
  const symbol = await resolveKrakenSymbol(productId);
  const result = await fetchKrakenJson<Record<string, { a: string[]; b: string[]; c: string[]; h: string[]; l: string[]; o: string; v: string[] }>>(
    `/Ticker?pair=${encodeURIComponent(symbol)}`
  );
  const ticker = Object.values(result)[0];

  return {
    productId,
    price: Number(ticker.c[0]),
    open24h: Number(ticker.o),
    high24h: Number(ticker.h[1] ?? ticker.h[0]),
    low24h: Number(ticker.l[1] ?? ticker.l[0]),
    volume24h: Number(ticker.v[1] ?? ticker.v[0]),
    bestBid: Number(ticker.b[0]),
    bestAsk: Number(ticker.a[0]),
    lastSize: Number(ticker.c[1] ?? 0),
    time: new Date().toISOString(),
  } satisfies MarketTicker;
}

export async function fetchKrakenCandlesDirect(productId: string, timeframe: MarketTimeframe) {
  const symbol = await resolveKrakenSymbol(productId);
  const interval = { "15m": 15, "1h": 60, "4h": 240, "1d": 1440 }[timeframe];
  const result = await fetchKrakenJson<Record<string, number[][] | string[][]>>(
    `/OHLC?pair=${encodeURIComponent(symbol)}&interval=${interval}`
  );
  const candleKey = Object.keys(result).find((key) => key !== "last");
  const rows = candleKey ? result[candleKey] : [];

  return rows.map<MarketCandle>((entry) => ({
    time: Number(entry[0]),
    open: Number(entry[1]),
    high: Number(entry[2]),
    low: Number(entry[3]),
    close: Number(entry[4]),
    volume: Number(entry[6] ?? 0),
  }));
}
