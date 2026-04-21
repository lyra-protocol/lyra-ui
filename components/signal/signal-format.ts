import type { SignalAlert } from "@/core/signal/signal-types";

export function timeAgo(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function timestampLabel(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(2)}`;
}

export function formatToken(token: string, symbol?: string | null) {
  if (symbol) return symbol.toUpperCase();
  if (!token) return "?";
  if (token.length <= 8) return token;
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

export function formatWallet(wallet: string) {
  if (!wallet) return "?";
  if (wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

export function ruleLabel(rule: SignalAlert["primaryRule"]) {
  if (rule === "large_wallet_usd") return "Whale";
  if (rule === "early_buy_index") return "Early";
  if (rule === "volume_acceleration") return "Volume";
  return rule;
}

export function ruleAccent(rule: SignalAlert["primaryRule"]) {
  if (rule === "large_wallet_usd") return "text-yellow-400";
  if (rule === "early_buy_index") return "text-blue-400";
  if (rule === "volume_acceleration") return "text-fuchsia-400";
  return "text-foreground/70";
}

/**
 * Severity score drives row visual weight — bigger USD / whale = brighter.
 * Kept coarse on purpose: 0..3.
 */
export function severityOf(alert: SignalAlert): 0 | 1 | 2 | 3 {
  const usd = alert.event.sizeUsd || 0;
  if (alert.primaryRule === "large_wallet_usd" || usd >= 50_000) return 3;
  if (usd >= 5_000) return 2;
  if (usd >= 500) return 1;
  return 0;
}
