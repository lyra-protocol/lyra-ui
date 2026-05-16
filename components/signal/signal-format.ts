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
  if (rule === "large_wallet_usd" || rule === "whale_move") return "Whale";
  if (rule === "early_buy_index") return "Early";
  if (rule === "volume_acceleration") return "Volume";
  if (rule === "bonding_migration") return "Graduate";
  if (rule === "new_launch") return "Launch";
  if (rule === "trending_breakout") return "Trending";
  if (rule === "top_gainer") return "Gainer";
  if (rule === "momentum_spike") return "Momentum";
  return rule;
}

export function ruleAccent(rule: SignalAlert["primaryRule"]) {
  if (rule === "large_wallet_usd" || rule === "whale_move") return "text-yellow-400";
  if (rule === "early_buy_index" || rule === "new_launch") return "text-blue-400";
  if (rule === "volume_acceleration" || rule === "trending_breakout") return "text-fuchsia-400";
  if (rule === "bonding_migration" || rule === "top_gainer") return "text-emerald-400";
  if (rule === "momentum_spike") return "text-orange-400";
  return "text-foreground/70";
}

/**
 * Severity score drives row visual weight — bigger USD / whale = brighter.
 * Kept coarse on purpose: 0..3.
 */
export function severityOf(alert: SignalAlert): 0 | 1 | 2 | 3 {
  const usd = alert.event.sizeUsd || 0;
  if (alert.primaryRule === "large_wallet_usd" || alert.primaryRule === "whale_move" || usd >= 50_000) return 3;
  if (usd >= 5_000) return 2;
  if (usd >= 500) return 1;
  return 0;
}

export type ClientSeverity = "info" | "notable" | "alert" | "critical";

/** Coarser bucket used by the card feed. Honors backend severity when present. */
export function severityBucket(alert: SignalAlert): ClientSeverity {
  if (alert.severity) return alert.severity;
  const usd = alert.event.sizeUsd || 0;
  if ((alert.primaryRule === "large_wallet_usd" || alert.primaryRule === "whale_move") && usd >= 50_000) return "critical";
  if ((alert.primaryRule === "large_wallet_usd" || alert.primaryRule === "whale_move") && usd >= 10_000) return "alert";
  if (alert.primaryRule === "large_wallet_usd" || alert.primaryRule === "whale_move") return "notable";
  if (["new_launch", "trending_breakout", "top_gainer", "momentum_spike"].includes(alert.primaryRule)) return alert.score && alert.score >= 85 ? "critical" : "alert";
  if (alert.event.action === "create" && usd >= 500) return "alert";
  if (alert.event.action === "create") return "notable";
  if (usd >= 10_000) return "alert";
  if (usd >= 1_000) return "notable";
  return "info";
}

export function severityLabel(severity: ClientSeverity) {
  if (severity === "critical") return "Critical";
  if (severity === "alert") return "Alert";
  if (severity === "notable") return "Notable";
  return "Info";
}

export function severityAccent(severity: ClientSeverity) {
  if (severity === "critical") return "text-red-400 bg-red-500/10 border-red-500/30";
  if (severity === "alert") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  if (severity === "notable") return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  return "text-foreground/55 bg-foreground/[0.04] border-[var(--line)]";
}

export function severityDot(severity: ClientSeverity) {
  if (severity === "critical") return "bg-red-400";
  if (severity === "alert") return "bg-yellow-400";
  if (severity === "notable") return "bg-blue-400";
  return "bg-foreground/35";
}

export function signalSymbol(alert: SignalAlert) {
  return alert.event.metadata?.pump?.symbol ?? alert.event.metadata?.birdeye?.symbol ?? null;
}

export function signalName(alert: SignalAlert) {
  return alert.event.metadata?.pump?.name ?? alert.event.metadata?.birdeye?.name ?? null;
}
