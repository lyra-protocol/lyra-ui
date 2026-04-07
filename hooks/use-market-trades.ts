"use client";

import { useEffect, useMemo, useState } from "react";
import { toHyperliquidCoin } from "@/core/market/hyperliquid-browser";
import { MarketTrade } from "@/core/market/types";

const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";

type HyperliquidTradeMessage = {
  channel?: string;
  data?: Array<{
    coin: string;
    side: "A" | "B";
    px: string;
    sz: string;
    time: number;
    tid: number;
  }>;
};

function toMarketTrade(productId: string, trade: NonNullable<HyperliquidTradeMessage["data"]>[number]) {
  return {
    id: `${trade.time}-${trade.tid}`,
    productId,
    side: trade.side === "B" ? "buy" : "sell",
    price: Number(trade.px),
    size: Number(trade.sz),
    time: trade.time,
  } satisfies MarketTrade;
}

export function useMarketTrades(productId: string) {
  const [state, setState] = useState<{ coin: string; trades: MarketTrade[] }>({
    coin: "",
    trades: [],
  });
  const coin = useMemo(() => (productId ? toHyperliquidCoin(productId) : ""), [productId]);
  const trades = useMemo(
    () => (state.coin === coin ? state.trades : []),
    [coin, state.coin, state.trades]
  );

  useEffect(() => {
    if (!coin) {
      return;
    }

    let websocket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      websocket = new WebSocket(HYPERLIQUID_WS_URL);

      websocket.onopen = () => {
        websocket?.send(
          JSON.stringify({
            method: "subscribe",
            subscription: { type: "trades", coin },
          })
        );
      };

      websocket.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as HyperliquidTradeMessage;
        if (message.channel !== "trades" || !Array.isArray(message.data)) {
          return;
        }

        const incoming = message.data.map((trade) => toMarketTrade(productId, trade));
        setState((current) => {
          const uniqueTrades = new Map<string, MarketTrade>();
          const currentTrades = current.coin === coin ? current.trades : [];

          for (const trade of [...incoming, ...currentTrades]) {
            uniqueTrades.set(trade.id, trade);
          }

          return {
            coin,
            trades: [...uniqueTrades.values()]
              .sort((left, right) => right.time - left.time)
              .slice(0, 30),
          };
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
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (websocket?.readyState === WebSocket.OPEN) {
        websocket.send(
          JSON.stringify({
            method: "unsubscribe",
            subscription: { type: "trades", coin },
          })
        );
      }

      websocket?.close();
    };
  }, [coin, productId]);

  return trades;
}
