"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { WalletState } from "@/lib/painmap";
import { WS_URL } from "@/lib/venue";

type MidSnapshot = { mids: Record<string, string>; connected: boolean; at: number | null };

const EMPTY: MidSnapshot = { mids: {}, connected: false, at: null };
let snapshot = EMPTY;
let socket: WebSocket | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let reconnect: ReturnType<typeof setTimeout> | null = null;
let retry = 0;
const listeners = new Set<() => void>();

function emit(next: MidSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function stopSocket() {
  if (heartbeat) clearInterval(heartbeat);
  if (reconnect) clearTimeout(reconnect);
  heartbeat = null;
  reconnect = null;
  socket?.close();
  socket = null;
}

function connect() {
  if (typeof window === "undefined" || socket || listeners.size === 0) return;
  const ws = new WebSocket(WS_URL);
  socket = ws;

  ws.addEventListener("open", () => {
    retry = 0;
    ws.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } }));
    heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: "ping" }));
    }, 30_000);
    emit({ ...snapshot, connected: true });
  });

  ws.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(String(event.data)) as {
        channel?: string;
        data?: { mids?: Record<string, string> };
      };
      if (message.channel !== "allMids" || !message.data?.mids) return;
      emit({ mids: message.data.mids, connected: true, at: Date.now() });
    } catch {
      // A malformed market message is ignored; the REST snapshot remains authoritative.
    }
  });

  const disconnected = () => {
    if (socket !== ws) return;
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    socket = null;
    emit({ ...snapshot, connected: false });
    if (listeners.size > 0) {
      const delay = Math.min(15_000, 1_000 * 2 ** retry++);
      reconnect = setTimeout(connect, delay);
    }
  };
  ws.addEventListener("close", disconnected);
  ws.addEventListener("error", () => ws.close());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopSocket();
  };
}

function getSnapshot() { return snapshot; }
function getServerSnapshot() { return EMPTY; }

export function useHyperliquidMids(): MidSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Revalues a committed wallet snapshot from live venue mids.
 *
 * REST remains authoritative for entries, fills, fees and position membership.
 * The socket changes only mark-derived fields between those snapshots.
 */
export function useLiveWallet(wallet: WalletState | null): {
  wallet: WalletState | null;
  connected: boolean;
  updatedAt: number | null;
} {
  const stream = useHyperliquidMids();
  const live = useMemo(() => {
    if (!wallet || !stream.at) return wallet;
    let unrealized = 0;
    let notional = 0;
    const positions = wallet.positions.map((position) => {
      const raw = stream.mids[position.asset];
      const mark = Number(raw ?? position.markPx);
      const entry = Number(position.entryPx);
      const size = Number(position.size);
      const pnl = (mark - entry) * size * (position.side === "long" ? 1 : -1);
      unrealized += pnl;
      notional += Math.abs(size * mark);
      return {
        ...position,
        markPx: raw ?? position.markPx,
        unrealizedPnlUsd: pnl,
      };
    });
    const bookedEquity = wallet.equityUsd - wallet.unrealizedPnlUsd;
    const bookedSessionPnl = wallet.sessionPnlUsd - wallet.unrealizedPnlUsd;
    const sessionPnlUsd = bookedSessionPnl + unrealized;
    const sessionStart = wallet.sessionStartEquityUsd ?? 0;
    return {
      ...wallet,
      positions,
      equityUsd: bookedEquity + unrealized,
      notionalUsd: notional,
      unrealizedPnlUsd: unrealized,
      sessionPnlUsd,
      dailyLossUsed: sessionStart > 0 ? Math.max(0, -sessionPnlUsd) / sessionStart : 0,
    };
  }, [wallet, stream.at, stream.mids]);
  return { wallet: live, connected: stream.connected, updatedAt: stream.at };
}