import {
  CoinbaseTickerMessage,
  MarketTicker,
} from "@/core/market/types";
export const EXCHANGE_WS_URL = "wss://ws-feed.exchange.coinbase.com";

export function mapCoinbaseTickerMessage(message: CoinbaseTickerMessage) {
  if (!message.price || !message.time || !message.product_id) {
    return null;
  }

  return {
    productId: message.product_id,
    price: Number(message.price),
    open24h: Number(message.open_24h ?? 0),
    high24h: Number(message.high_24h ?? 0),
    low24h: Number(message.low_24h ?? 0),
    volume24h: Number(message.volume_24h ?? 0),
    bestBid: Number(message.best_bid ?? 0),
    bestAsk: Number(message.best_ask ?? 0),
    lastSize: Number(message.last_size ?? 0),
    time: message.time,
  } satisfies MarketTicker;
}

export function normalizeProductId(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return normalized;
  }

  return normalized.includes("-") ? normalized : `${normalized}-USD`;
}
