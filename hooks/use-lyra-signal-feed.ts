"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  SignalAlert,
  SignalConnectionStatus,
  SignalStreamEvent,
} from "@/core/signal/signal-types";

const FEED_PATH = "/feed";
const DEFAULT_SIGNAL_URL = "wss://lyra-signal-production.up.railway.app";

function resolveWsUrl(httpOrWsUrl: string | undefined): string | null {
  if (!httpOrWsUrl) return null;
  const trimmed = httpOrWsUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed.endsWith(FEED_PATH) ? trimmed : `${trimmed}${FEED_PATH}`;
  }
  if (trimmed.startsWith("http://")) {
    return `${trimmed.replace(/^http:\/\//, "ws://")}${FEED_PATH}`;
  }
  if (trimmed.startsWith("https://")) {
    return `${trimmed.replace(/^https:\/\//, "wss://")}${FEED_PATH}`;
  }
  return `wss://${trimmed}${FEED_PATH}`;
}

export type UseLyraSignalFeedOptions = {
  /** Maximum number of alerts to keep in memory. */
  bufferSize?: number;
  /** Reconnect delay (ms) after a closed/errored socket. */
  reconnectDelayMs?: number;
  /** Heartbeat interval (ms) to keep the socket alive behind proxies. */
  heartbeatIntervalMs?: number;
};

export function useLyraSignalFeed(options: UseLyraSignalFeedOptions = {}) {
  const bufferSize = options.bufferSize ?? 400;
  const reconnectDelayMs = options.reconnectDelayMs ?? 1200;
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 25_000;

  const rawUrl = process.env.NEXT_PUBLIC_LYRA_SIGNAL_URL || DEFAULT_SIGNAL_URL;
  const wsUrl = useMemo(() => resolveWsUrl(rawUrl), [rawUrl]);

  const [alerts, setAlerts] = useState<SignalAlert[]>([]);
  const [status, setStatus] = useState<SignalConnectionStatus>(
    wsUrl ? "idle" : "disabled"
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!wsUrl) {
      setStatus("disabled");
      return;
    }
    stoppedRef.current = false;

    const connect = () => {
      if (stoppedRef.current) return;
      setStatus((prev) => (prev === "open" ? "open" : "connecting"));
      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
        setStatus("error");
        scheduleReconnect();
        return;
      }
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        setLastError(null);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          try {
            ws.send(JSON.stringify({ type: "ping" }));
          } catch {
            // ignore — next close will reconnect
          }
        }, heartbeatIntervalMs);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as SignalStreamEvent;
          if (msg.type === "ready") {
            setConnectionId(msg.connectionId);
            return;
          }
          if (msg.type === "alert") {
            setAlerts((prev) => {
              const next = [msg.payload, ...prev];
              return next.length > bufferSize ? next.slice(0, bufferSize) : next;
            });
            return;
          }
          // pong: ignore
        } catch {
          // malformed frame; ignore
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setLastError("WebSocket error");
      };

      ws.onclose = () => {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        if (stoppedRef.current) return;
        setStatus("reconnecting");
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      reconnectRef.current = setTimeout(connect, reconnectDelayMs);
    };

    connect();

    return () => {
      stoppedRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }
    };
  }, [wsUrl, bufferSize, reconnectDelayMs, heartbeatIntervalMs]);

  const sendPing = () => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  };

  return {
    alerts,
    status,
    connectionId,
    lastError,
    wsUrl,
    sendPing,
  };
}
