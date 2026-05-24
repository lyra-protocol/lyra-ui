"use client";

import { useEffect, useRef, useState } from "react";
import { toHyperliquidCoin } from "@/core/market/hyperliquid-browser";
import { closeWebSocket } from "@/lib/close-websocket";

const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";

export type LiveTrade = {
  id: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  timestampMs: number;
};

type TradesMessage = {
  channel?: string;
  data?: Array<{
    coin?: string;
    px?: string;
    sz?: string;
    side?: "B" | "A" | "S"; // Hyperliquid uses B (buy) / A (ask/sell)
    time?: number;
    tid?: number;
  }>;
};

export function useLiveMarketTrades(productId: string | null, limit = 50) {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const coin = productId ? toHyperliquidCoin(productId) : null;
  const activeCoinRef = useRef<string | null>(null);

  useEffect(() => {
    if (!coin) {
      setTrades([]);
      return;
    }
    activeCoinRef.current = coin;
    setTrades([]);

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
        let message: TradesMessage;
        try {
          message = JSON.parse(String(event.data)) as TradesMessage;
        } catch {
          return;
        }
        if (message.channel !== "trades" || !Array.isArray(message.data)) return;
        if (activeCoinRef.current !== coin) return;

        const incoming = message.data
          .map((trade): LiveTrade | null => {
            const price = Number(trade.px);
            const size = Number(trade.sz);
            if (!Number.isFinite(price) || !Number.isFinite(size)) return null;
            const side: LiveTrade["side"] = trade.side === "B" ? "buy" : "sell";
            return {
              id: String(trade.tid ?? `${trade.time ?? Date.now()}-${price}-${size}`),
              price,
              size,
              side,
              timestampMs: typeof trade.time === "number" ? trade.time : Date.now(),
            };
          })
          .filter(Boolean) as LiveTrade[];

        if (!incoming.length) return;

        setTrades((previous) => {
          const byId = new Map(previous.map((trade) => [trade.id, trade]));
          for (const trade of incoming) byId.set(trade.id, trade);
          const merged = Array.from(byId.values()).sort(
            (a, b) => b.timestampMs - a.timestampMs
          );
          return merged.slice(0, limit);
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
      closeWebSocket(websocket);
      websocket = null;
    };
  }, [coin, limit]);

  return trades;
}
