import "server-only";
import {
  fetchHyperliquidCandlesServer,
  fetchHyperliquidOverviewServer,
  fetchHyperliquidProductsServer,
} from "@/core/market/hyperliquid-server";
import {
  fetchCoinbaseExchangeCandles,
  fetchCoinbaseExchangeOverview,
  fetchCoinbaseExchangeProducts,
} from "@/core/market/coinbase-exchange-server";
import { markProviderUnavailable, shouldSkipProvider } from "@/core/market/provider-health";
import {
  fetchKrakenCandles,
  fetchKrakenOverview,
  fetchKrakenProducts,
} from "@/core/market/kraken-server";
import { MarketTimeframe } from "@/core/market/types";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function fetchMarketProductsServer() {
  try {
    return await fetchHyperliquidProductsServer();
  } catch {}

  if (shouldSkipProvider("coinbase")) {
    return fetchKrakenProducts();
  }

  try {
    return await fetchCoinbaseExchangeProducts();
  } catch (coinbaseError) {
    markProviderUnavailable("coinbase", coinbaseError);
    console.error("Coinbase products failed, falling back to Kraken:", coinbaseError);
    try {
      return await fetchKrakenProducts();
    } catch (krakenError) {
      throw new Error(
        `Products unavailable. Coinbase: ${toErrorMessage(coinbaseError)}. Kraken: ${toErrorMessage(
          krakenError
        )}.`
      );
    }
  }
}

export async function fetchMarketOverviewServer(productId: string) {
  try {
    return await fetchHyperliquidOverviewServer(productId);
  } catch {}

  if (shouldSkipProvider("coinbase")) {
    return fetchKrakenOverview(productId);
  }

  try {
    return await fetchCoinbaseExchangeOverview(productId);
  } catch (coinbaseError) {
    markProviderUnavailable("coinbase", coinbaseError);
    console.error(`Coinbase overview failed for ${productId}, falling back to Kraken:`, coinbaseError);
    try {
      return await fetchKrakenOverview(productId);
    } catch (krakenError) {
      throw new Error(
        `Overview unavailable for ${productId}. Coinbase: ${toErrorMessage(
          coinbaseError
        )}. Kraken: ${toErrorMessage(krakenError)}.`
      );
    }
  }
}

export async function fetchMarketCandlesServer(
  productId: string,
  timeframe: MarketTimeframe
) {
  try {
    return await fetchHyperliquidCandlesServer(productId, timeframe);
  } catch {}

  if (shouldSkipProvider("coinbase")) {
    return fetchKrakenCandles(productId, timeframe);
  }

  try {
    return await fetchCoinbaseExchangeCandles(productId, timeframe);
  } catch (coinbaseError) {
    markProviderUnavailable("coinbase", coinbaseError);
    console.error(
      `Coinbase candles failed for ${productId} ${timeframe}, falling back to Kraken:`,
      coinbaseError
    );
    try {
      return await fetchKrakenCandles(productId, timeframe);
    } catch (krakenError) {
      throw new Error(
        `Candles unavailable for ${productId} ${timeframe}. Coinbase: ${toErrorMessage(
          coinbaseError
        )}. Kraken: ${toErrorMessage(krakenError)}.`
      );
    }
  }
}
