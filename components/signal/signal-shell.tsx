"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Filter, Flame, Pause, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SignalAlert,
  SignalSourceId,
} from "@/core/signal/signal-types";
import { useLyraSignalFeed } from "@/hooks/use-lyra-signal-feed";
import { BulkTopBar } from "@/components/workspace/bulk/bulk-top-bar";

type SourceFilter = "all" | SignalSourceId;
type ActionFilter = "all" | "buy" | "sell" | "create" | "migrate";

function timeAgo(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatToken(token: string, metadataSymbol?: string) {
  if (metadataSymbol) return metadataSymbol.toUpperCase();
  if (!token) return "?";
  if (token.length <= 8) return token;
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

function formatWallet(wallet: string) {
  if (!wallet) return "?";
  if (wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

function ruleBadgeClass(rule: SignalAlert["primaryRule"]) {
  switch (rule) {
    case "large_wallet_usd":
      return "bg-yellow-500/15 text-yellow-400";
    case "early_buy_index":
      return "bg-blue-500/15 text-blue-400";
    case "volume_acceleration":
      return "bg-fuchsia-500/15 text-fuchsia-400";
    default:
      return "bg-foreground/10 text-foreground/75";
  }
}

function sourceLabel(source: SignalSourceId) {
  if (source === "pump") return "pump.fun";
  if (source === "dexscreener") return "dexscreener";
  return source;
}

function StatusDot({ status }: { status: ReturnType<typeof useLyraSignalFeed>["status"] }) {
  const base = "inline-block h-2 w-2 rounded-full";
  if (status === "open")
    return <span className={cn(base, "bg-[var(--positive)] animate-pulse")} />;
  if (status === "connecting" || status === "reconnecting")
    return <span className={cn(base, "bg-yellow-400 animate-pulse")} />;
  if (status === "error")
    return <span className={cn(base, "bg-[var(--negative)]")} />;
  if (status === "disabled")
    return <span className={cn(base, "bg-foreground/25")} />;
  return <span className={cn(base, "bg-foreground/40")} />;
}

export function SignalShell() {
  const { alerts, status, wsUrl, lastError } = useLyraSignalFeed();

  const [source, setSource] = useState<SourceFilter>("all");
  const [action, setAction] = useState<ActionFilter>("all");
  const [minUsd, setMinUsd] = useState(0);
  const [paused, setPaused] = useState(false);
  const [frozenAlerts, setFrozenAlerts] = useState<SignalAlert[] | null>(null);

  const feed = useMemo(() => (paused && frozenAlerts ? frozenAlerts : alerts), [
    paused,
    frozenAlerts,
    alerts,
  ]);

  const filtered = useMemo(() => {
    return feed.filter((alert) => {
      if (source !== "all" && alert.event.source !== source) return false;
      if (action !== "all" && alert.event.action !== action) return false;
      if (minUsd > 0 && alert.event.sizeUsd < minUsd) return false;
      return true;
    });
  }, [feed, source, action, minUsd]);

  const onTogglePause = () => {
    setPaused((prev) => {
      const next = !prev;
      setFrozenAlerts(next ? alerts.slice() : null);
      return next;
    });
  };

  const stats = useMemo(() => {
    const buys = alerts.filter((a) => a.event.action === "buy").length;
    const sells = alerts.filter((a) => a.event.action === "sell").length;
    const creates = alerts.filter((a) => a.event.action === "create").length;
    const usd = alerts.reduce((sum, a) => sum + (a.event.sizeUsd || 0), 0);
    return { buys, sells, creates, usd, count: alerts.length };
  }, [alerts]);

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <BulkTopBar />

      <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Flame className="h-4 w-4 text-yellow-400" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45">
              Lyra Signal
            </p>
            <h1 className="text-[16px] font-semibold text-foreground/90">
              Live whale + early-buy feed
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1">
            <StatusDot status={status} />
            <span className="text-foreground/75">
              {status === "open"
                ? "Live"
                : status === "connecting"
                  ? "Connecting"
                  : status === "reconnecting"
                    ? "Reconnecting"
                    : status === "error"
                      ? "Error"
                      : status === "disabled"
                        ? "Configure NEXT_PUBLIC_LYRA_SIGNAL_URL"
                        : "Idle"}
            </span>
          </div>
          <button
            type="button"
            onClick={onTogglePause}
            className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 text-foreground/75 transition hover:text-foreground"
          >
            {paused ? (
              <>
                <Play className="h-3.5 w-3.5" /> Resume
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            )}
          </button>
          <Link
            href="/terminal"
            className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 text-foreground/75 transition hover:text-foreground"
          >
            Open terminal
          </Link>
        </div>
      </header>

      {/* Compact stat strip */}
      <div className="grid grid-cols-2 border-b border-[var(--line)] bg-[var(--panel)] sm:grid-cols-5">
        <Stat label="Alerts" value={stats.count.toLocaleString()} />
        <Stat label="Buys" value={stats.buys.toLocaleString()} accent="text-[var(--positive)]" />
        <Stat label="Sells" value={stats.sells.toLocaleString()} accent="text-[var(--negative)]" />
        <Stat label="Creates" value={stats.creates.toLocaleString()} />
        <Stat label="USD (in feed)" value={formatUsd(stats.usd)} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[11px]">
        <Filter className="h-3.5 w-3.5 text-foreground/45" />
        <Segmented
          label="Source"
          value={source}
          onChange={(v) => setSource(v as SourceFilter)}
          options={[
            { id: "all", label: "All" },
            { id: "pump", label: "pump.fun" },
            { id: "dexscreener", label: "dexscreener" },
            { id: "gmgn", label: "gmgn" },
          ]}
        />
        <Segmented
          label="Action"
          value={action}
          onChange={(v) => setAction(v as ActionFilter)}
          options={[
            { id: "all", label: "All" },
            { id: "buy", label: "Buy" },
            { id: "sell", label: "Sell" },
            { id: "create", label: "Create" },
            { id: "migrate", label: "Migrate" },
          ]}
        />
        <div className="flex items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 text-foreground/70">
          <span>Min</span>
          <input
            value={minUsd || ""}
            placeholder="USD"
            inputMode="decimal"
            onChange={(event) => {
              const value = Number(event.target.value.replace(/,/g, ""));
              setMinUsd(Number.isFinite(value) && value > 0 ? value : 0);
            }}
            className="w-20 bg-transparent text-[11px] text-foreground outline-none placeholder:text-foreground/35"
          />
        </div>
        <div className="ml-auto flex items-center gap-3 text-foreground/45">
          <Activity className="h-3.5 w-3.5" />
          <span>{filtered.length.toLocaleString()} shown</span>
        </div>
      </div>

      {/* Feed */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {status === "disabled" ? (
          <EmptyState
            title="Signal backend not configured"
            message="Set NEXT_PUBLIC_LYRA_SIGNAL_URL (your Railway WebSocket URL) to start the feed."
            subtle={lastError ?? undefined}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={status === "open" ? "Waiting for the next alert" : "Connecting to the signal bus"}
            message={
              status === "open"
                ? "No alerts match the current filters yet. The feed updates in real time."
                : wsUrl
                  ? `Trying ${wsUrl}`
                  : "Configure the Railway URL to start streaming."
            }
            subtle={lastError ?? undefined}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="grid shrink-0 grid-cols-[90px_80px_110px_1fr_130px_120px] border-b border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-[9px] uppercase tracking-wider text-foreground/40">
              <span>Time</span>
              <span>Action</span>
              <span>Size</span>
              <span>Sentence</span>
              <span>Token / Wallet</span>
              <span className="text-right">Source</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filtered.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="border-r border-[var(--line)] px-4 py-2 last:border-r-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-foreground/40">{label}</p>
      <p className={cn("text-[14px] font-semibold tabular-nums text-foreground/90", accent)}>
        {value}
      </p>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="flex items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-1 py-0.5">
      <span className="px-1.5 text-[10px] uppercase tracking-wider text-foreground/40">
        {label}
      </span>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-[4px] px-2 py-0.5 text-[11px] transition",
            option.id === value
              ? "bg-foreground text-background"
              : "text-foreground/60 hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AlertRow({ alert }: { alert: SignalAlert }) {
  const { event } = alert;
  const isBuy = event.action === "buy";
  const isSell = event.action === "sell";
  const actionClass = isBuy
    ? "text-[var(--positive)]"
    : isSell
      ? "text-[var(--negative)]"
      : "text-foreground/75";
  const symbol = event.metadata?.pump?.symbol;
  return (
    <div className="grid grid-cols-[90px_80px_110px_1fr_130px_120px] items-center gap-3 border-b border-[var(--line)] px-4 py-2 text-[12px] transition hover:bg-foreground/[0.03]">
      <span className="text-[10px] text-foreground/50">
        {timeAgo(alert.createdAt)}
      </span>
      <span className={cn("text-[11px] uppercase tracking-wider", actionClass)}>
        {event.action}
      </span>
      <span className="tabular-nums text-foreground/85">
        {formatUsd(event.sizeUsd)}
      </span>
      <span className="truncate text-foreground/80">
        <span
          className={cn(
            "mr-2 inline-flex h-5 items-center rounded-[4px] px-1.5 text-[9px] uppercase tracking-wider",
            ruleBadgeClass(alert.primaryRule)
          )}
        >
          {alert.primaryRule.replace(/_/g, " ")}
        </span>
        {alert.sentence}
      </span>
      <span className="flex flex-col text-[10px]">
        <span className="font-medium text-foreground/85">
          {formatToken(event.token, symbol)}
        </span>
        <span className="text-foreground/45">by {formatWallet(event.wallet)}</span>
      </span>
      <span className="text-right text-[10px] text-foreground/55">
        {sourceLabel(event.source)}
      </span>
    </div>
  );
}

function EmptyState({
  title,
  message,
  subtle,
}: {
  title: string;
  message: string;
  subtle?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
      <RefreshCw className="h-4 w-4 animate-spin text-foreground/35" />
      <p className="text-[14px] font-medium text-foreground/80">{title}</p>
      <p className="max-w-md text-[12px] text-foreground/55">{message}</p>
      {subtle ? (
        <p className="max-w-md text-[10px] text-[var(--negative)]/80">{subtle}</p>
      ) : null}
    </div>
  );
}
