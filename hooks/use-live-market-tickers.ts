"use client";

import { useEffect, useMemo, useState } from "react";
import { toHyperliquidCoin } from "@/core/market/hyperliquid-browser";
import { MarketTicker } from "@/core/market/types";

const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";

type AllMidsMessage = {
  channel?: string;
  data?: {
    mids?: Record<string, string>;
  };
};

function toTicker(productId: string, price: number): MarketTicker {
  const now = new Date().toISOString();
  return {
    productId,
    price,
    open24h: price,
    high24h: price,
    low24h: price,
    volume24h: 0,
    bestBid: price,
    bestAsk: price,
    lastSize: 0,
    time: now,
  };
}

export function useLiveMarketTickers(productIds: string[]) {
  const [tickers, setTickers] = useState<Record<string, MarketTicker>>({});
  const sortedIds = useMemo(() => [...new Set(productIds.filter(Boolean))].sort(), [productIds]);
  const subscriptionKey = sortedIds.join("|");

  const visibleTickers = useMemo(
    () =>
      Object.fromEntries(
        sortedIds
          .map((id) => [id, tickers[id]] as const)
          .filter((entry): entry is readonly [string, MarketTicker] => Boolean(entry[1]))
      ),
    [sortedIds, tickers]
  );

  useEffect(() => {
    if (!subscriptionKey) {
      return;
    }

    let websocket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const watchedCoins = new Map(sortedIds.map((productId) => [toHyperliquidCoin(productId), productId]));

    const connect = () => {
      websocket = new WebSocket(HYPERLIQUID_WS_URL);

      websocket.onopen = () => {
        websocket?.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } }));
      };

      websocket.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as AllMidsMessage;
        if (message.channel !== "allMids" || !message.data?.mids) {
          return;
        }

        setTickers((current) => {
          const next = { ...current };
          for (const [coin, productId] of watchedCoins.entries()) {
            const price = Number(message.data?.mids?.[coin]);
            if (Number.isFinite(price) && price > 0) {
              next[productId] = {
                ...(current[productId] ?? toTicker(productId, price)),
                productId,
                price,
                bestBid: price,
                bestAsk: price,
                time: new Date().toISOString(),
              };
            }
          }
          return next;
        });
      };

      websocket.onclose = () => {
        if (!stopped) {
          reconnectTimer = setTimeout(connect, 1200);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (websocket?.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ method: "unsubscribe", subscription: { type: "allMids" } }));
      }
      websocket?.close();
    };
  }, [subscriptionKey, sortedIds]);

  return visibleTickers;
}
