"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  SignalAlert,
  SignalConnectionStatus,
  SignalStreamEvent,
} from "@/core/signal/signal-types";
import {
  loadCachedAlerts,
  upsertAlerts,
} from "@/core/signal/signal-cache";

const FEED_PATH = "/feed";
const DEFAULT_SIGNAL_URL = "";
/** Coalesce rapid WS frames so React + IndexedDB do not thrash on hot markets. */
const FLUSH_MS = 72;

function mergeById(
  incoming: SignalAlert[],
  existing: SignalAlert[],
  bufferSize: number,
): SignalAlert[] {
  if (!incoming.length) return existing;
  const byId = new Map<string, SignalAlert>();
  for (const item of existing) byId.set(item.id, item);
  for (const item of incoming) byId.set(item.id, item);
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return merged.length > bufferSize ? merged.slice(0, bufferSize) : merged;
}


async function fetchRecentAlerts(limit: number): Promise<SignalAlert[]> {
  try {
    const res = await fetch(`/api/signals/recent?limit=${limit}`, { cache: "no-store" });
    const json = (await res.json()) as { signals?: SignalAlert[] };
    return Array.isArray(json.signals) ? json.signals : [];
  } catch {
    return [];
  }
}

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
  const [hydrated, setHydrated] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);
  const pendingRef = useRef<SignalAlert[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferSizeRef = useRef(bufferSize);

  useEffect(() => {
    bufferSizeRef.current = bufferSize;
  }, [bufferSize]);

  // Hydrate from IndexedDB and the worker's recent endpoint so first load is not empty.
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCachedAlerts(), fetchRecentAlerts(Math.min(bufferSize, 20))])
      .then(([cached, recent]) => {
        if (cancelled) return;
        const initial = mergeById(recent, cached, bufferSize);
        if (initial.length) setAlerts((prev) => mergeById(initial, prev, bufferSize));
        if (recent.length) void upsertAlerts(recent);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [bufferSize]);

  const flushPending = () => {
    flushTimerRef.current = null;
    const batch = pendingRef.current;
    pendingRef.current = [];
    if (!batch.length) return;
    const cap = bufferSizeRef.current;
    setAlerts((prev) => mergeById(batch, prev, cap));
    void upsertAlerts(batch);
  };

  const scheduleFlush = () => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = setTimeout(flushPending, FLUSH_MS);
  };

  useEffect(() => {
    if (!wsUrl) return;
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
            pendingRef.current.push(msg.payload);
            scheduleFlush();
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
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingRef.current = [];
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
    hydrated,
  };
}
