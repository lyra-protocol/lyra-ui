import "server-only";
import { CoinbaseProduct, MarketCandle, MarketTicker, MarketTimeframe } from "@/core/market/types";

const KRAKEN_REST_URL = "https://api.kraken.com/0/public";
const ALLOWED_QUOTES = new Set(["USD", "USDC", "USDT", "EUR", "GBP"]);

type FetchOptions = {
  cache?: RequestCache;
  revalidate?: number;
};

type KrakenAssetPair = {
  altname: string;
  wsname?: string;
  status?: string;
};

type KrakenTicker = {
  a: string[];
  b: string[];
  c: string[];
  h: string[];
  l: string[];
  o: string;
  v: string[];
};

const KRAKEN_CODE_MAP: Record<string, string> = {
  BTC: "XBT",
  DOGE: "XDG",
};

function normalizeKrakenCode(code: string) {
  if (code === "XBT") return "BTC";
  if (code === "XDG") return "DOGE";
  return code.replace(/^[XZ]/, "");
}

function toKrakenCode(code: string) {
  return KRAKEN_CODE_MAP[code] ?? code;
}

async function fetchKrakenJson<T>(path: string, options?: FetchOptions) {
  const response = await fetch(`${KRAKEN_REST_URL}${path}`, {
    cache: options?.cache,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Kraken request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { error?: string[]; result: T };
  if (payload.error && payload.error.length > 0) {
    throw new Error(`Kraken request failed: ${payload.error.join(", ")}`);
  }

  return payload.result;
}

async function getKrakenPairs() {
  return fetchKrakenJson<Record<string, KrakenAssetPair>>("/AssetPairs", { revalidate: 300 });
}

function toProductId(pair: KrakenAssetPair) {
  const [base, quote] = (pair.wsname ?? pair.altname).split("/");
  if (!base || !quote) {
    return null;
  }

  const normalizedBase = normalizeKrakenCode(base);
  const normalizedQuote = normalizeKrakenCode(quote);
  if (!ALLOWED_QUOTES.has(normalizedQuote)) {
    return null;
  }

  return `${normalizedBase}-${normalizedQuote}`;
}

async function resolveKrakenSymbol(productId: string) {
  const pairs = await getKrakenPairs();

  const match = Object.values(pairs).find((pair) => {
    if (pair.status && pair.status !== "online") {
      return false;
    }

    return toProductId(pair) === productId;
  });

  if (!match) {
    const [base, quote] = productId.split("-");
    if (!base || !quote) {
      throw new Error(`Unsupported product: ${productId}`);
    }

    return `${toKrakenCode(base)}${toKrakenCode(quote)}`;
  }

  return match.altname;
}

export async function fetchKrakenProducts() {
  const pairs = await getKrakenPairs();

  return Object.values(pairs)
    .filter((pair) => !pair.status || pair.status === "online")
    .map<CoinbaseProduct | null>((pair) => {
      const productId = toProductId(pair);
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

export async function fetchKrakenOverview(productId: string) {
  const symbol = await resolveKrakenSymbol(productId);
  const result = await fetchKrakenJson<Record<string, KrakenTicker>>(
    `/Ticker?pair=${encodeURIComponent(symbol)}`,
    { cache: "no-store" }
  );
  const ticker = Object.values(result)[0];
  if (!ticker) {
    throw new Error(`No ticker found for ${productId}`);
  }

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

export async function fetchKrakenCandles(productId: string, timeframe: MarketTimeframe) {
  const symbol = await resolveKrakenSymbol(productId);
  const interval = { "15m": 15, "1h": 60, "4h": 240, "1d": 1440 }[timeframe];
  const result = await fetchKrakenJson<Record<string, Array<string[] | number[][]>>>(
    `/OHLC?pair=${encodeURIComponent(symbol)}&interval=${interval}`,
    { cache: "no-store" }
  );
  const candleKey = Object.keys(result).find((key) => key !== "last");
  const rows = candleKey ? (result[candleKey] as number[][] | string[][]) : [];

  return rows.map<MarketCandle>((entry) => ({
    time: Number(entry[0]),
    open: Number(entry[1]),
    high: Number(entry[2]),
    low: Number(entry[3]),
    close: Number(entry[4]),
    volume: Number(entry[6] ?? 0),
  }));
}
