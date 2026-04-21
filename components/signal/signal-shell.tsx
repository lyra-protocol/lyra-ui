"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BellRing,
  Flame,
  Pause,
  Play,
  RefreshCw,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SignalAlert, SignalSourceId } from "@/core/signal/signal-types";
import { useLyraSignalFeed } from "@/hooks/use-lyra-signal-feed";
import { BulkTopBar } from "@/components/workspace/bulk/bulk-top-bar";

type ConnectionStatus = ReturnType<typeof useLyraSignalFeed>["status"];

type SourceFilter = "all" | SignalSourceId;
type ActionFilter = "all" | "buy" | "sell" | "create" | "migrate" | "unknown";

function timeAgo(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
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

function ruleLabel(rule: SignalAlert["primaryRule"]) {
  if (rule === "large_wallet_usd") return "Whale";
  if (rule === "early_buy_index") return "Early buy";
  if (rule === "volume_acceleration") return "Volume surge";
  return rule;
}

function ruleBadgeClass(rule: SignalAlert["primaryRule"]) {
  if (rule === "large_wallet_usd") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/25";
  if (rule === "early_buy_index") return "bg-blue-500/15 text-blue-400 border-blue-500/25";
  if (rule === "volume_acceleration") return "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25";
  return "bg-foreground/10 text-foreground/75 border-[var(--line)]";
}

function sourceLabel(source: SignalSourceId) {
  if (source === "pump") return "pump.fun";
  return source;
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const base = "inline-block h-2 w-2 rounded-full";
  if (status === "open") return <span className={cn(base, "bg-[var(--positive)] animate-pulse")} />;
  if (status === "connecting" || status === "reconnecting")
    return <span className={cn(base, "bg-yellow-400 animate-pulse")} />;
  if (status === "error") return <span className={cn(base, "bg-[var(--negative)]")} />;
  if (status === "disabled") return <span className={cn(base, "bg-foreground/25")} />;
  return <span className={cn(base, "bg-foreground/40")} />;
}

function StatusLabel({ status, wsUrl }: { status: ConnectionStatus; wsUrl: string | null }) {
  if (status === "open") return "Live · streaming";
  if (status === "connecting") return wsUrl ? "Connecting…" : "Starting…";
  if (status === "reconnecting") return "Reconnecting…";
  if (status === "error") return "Connection error";
  if (status === "disabled") return "Signal URL not set";
  return "Idle";
}

export function SignalShell() {
  const { alerts, status, wsUrl, lastError, connectionId } = useLyraSignalFeed();

  const [source, setSource] = useState<SourceFilter>("all");
  const [action, setAction] = useState<ActionFilter>("all");
  const [minUsd, setMinUsd] = useState(0);
  const [rule, setRule] = useState<"all" | SignalAlert["primaryRule"]>("all");
  const [paused, setPaused] = useState(false);
  const [frozenAlerts, setFrozenAlerts] = useState<SignalAlert[] | null>(null);

  // Re-render the time-ago labels once per second.
  const [, setClock] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setClock((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const feed = useMemo(() => (paused && frozenAlerts ? frozenAlerts : alerts), [
    paused,
    frozenAlerts,
    alerts,
  ]);

  const filtered = useMemo(() => {
    return feed.filter((alert) => {
      if (source !== "all" && alert.event.source !== source) return false;
      if (action !== "all" && alert.event.action !== action) return false;
      if (rule !== "all" && alert.primaryRule !== rule) return false;
      if (minUsd > 0 && alert.event.sizeUsd < minUsd) return false;
      return true;
    });
  }, [feed, source, action, rule, minUsd]);

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
    const rulesSet = new Set(alerts.map((a) => a.primaryRule));
    return { buys, sells, creates, usd, count: alerts.length, rulesSet };
  }, [alerts]);

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <BulkTopBar />

      <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--line-strong)] bg-[var(--panel-2)]">
            <Flame className="h-4 w-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45">
              Lyra Signal · live
            </p>
            <h1 className="text-[15px] font-semibold text-foreground/95">
              Whale, early-buy and volume alerts
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1">
            <StatusDot status={status} />
            <span className="text-foreground/75">
              <StatusLabel status={status} wsUrl={wsUrl} />
            </span>
            {connectionId ? (
              <span
                className="font-mono text-[10px] text-foreground/40"
                title={`Connection ID: ${connectionId}`}
              >
                · {connectionId.slice(0, 6)}
              </span>
            ) : null}
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
            Terminal
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-2 border-b border-[var(--line)] bg-[var(--panel)] sm:grid-cols-5">
        <StatTile label="Alerts" value={stats.count.toLocaleString()} icon={BellRing} />
        <StatTile
          label="Buys"
          value={stats.buys.toLocaleString()}
          accent="text-[var(--positive)]"
        />
        <StatTile
          label="Sells"
          value={stats.sells.toLocaleString()}
          accent="text-[var(--negative)]"
        />
        <StatTile label="Creates" value={stats.creates.toLocaleString()} />
        <StatTile
          label="USD (window)"
          value={formatUsd(stats.usd)}
          icon={TrendingUp}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[11px]">
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
            { id: "unknown", label: "Other" },
          ]}
        />
        <Segmented
          label="Rule"
          value={rule}
          onChange={(v) => setRule(v as typeof rule)}
          options={[
            { id: "all", label: "All" },
            { id: "large_wallet_usd", label: "Whale" },
            { id: "early_buy_index", label: "Early buy" },
            { id: "volume_acceleration", label: "Volume" },
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
        <div className="ml-auto flex items-center gap-2 text-foreground/45">
          <Activity className="h-3.5 w-3.5" />
          <span>{filtered.length.toLocaleString()} shown</span>
          {paused ? (
            <span className="rounded-[4px] bg-yellow-500/15 px-1.5 py-0.5 text-[10px] text-yellow-400">
              Paused
            </span>
          ) : null}
        </div>
      </div>

      {/* Feed */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {status === "disabled" ? (
          <EmptyState
            title="Signal endpoint not configured"
            message="Set NEXT_PUBLIC_LYRA_SIGNAL_URL to your Lyra Signal Railway URL."
            subtle={lastError ?? undefined}
          />
        ) : filtered.length === 0 && status !== "open" ? (
          <EmptyState
            title="Connecting to the signal bus"
            message={
              wsUrl
                ? `Trying ${wsUrl.replace(/^wss?:\/\//, "")}`
                : "Configure the Signal URL to start streaming."
            }
            subtle={lastError ?? undefined}
          />
        ) : filtered.length === 0 ? (
          <QuietFeed />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[var(--line)]">
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

function StatTile({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  accent?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between border-r border-[var(--line)] px-4 py-3 last:border-r-0">
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">
          {label}
        </p>
        <p className={cn("text-[15px] font-semibold tabular-nums text-foreground/90", accent)}>
          {value}
        </p>
      </div>
      {Icon ? <Icon className="h-4 w-4 text-foreground/30" /> : null}
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
  const ActionIcon = isBuy ? TrendingUp : isSell ? TrendingUp : Zap;
  const actionClass = isBuy
    ? "text-[var(--positive)]"
    : isSell
      ? "text-[var(--negative)]"
      : "text-foreground/75";
  const symbol = event.metadata?.pump?.symbol;
  const name = event.metadata?.pump?.name;
  return (
    <div className="flex items-start gap-4 px-4 py-3 transition hover:bg-foreground/[0.03]">
      <div
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border",
          ruleBadgeClass(alert.primaryRule)
        )}
        title={ruleLabel(alert.primaryRule)}
      >
        <ActionIcon
          className={cn(
            "h-4 w-4",
            isSell ? "rotate-180" : "",
            actionClass
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={cn(
              "rounded-[4px] border px-1.5 py-px text-[9px] uppercase tracking-wider",
              ruleBadgeClass(alert.primaryRule)
            )}
          >
            {ruleLabel(alert.primaryRule)}
          </span>
          <span className={cn("text-[11px] uppercase tracking-wider", actionClass)}>
            {event.action}
          </span>
          <span className="tabular-nums text-foreground/90">
            {formatUsd(event.sizeUsd)}
          </span>
          <span className="text-foreground/25">·</span>
          <span className="font-medium text-foreground/85">
            {formatToken(event.token, symbol)}
          </span>
          {name ? (
            <span className="truncate text-foreground/50">{name}</span>
          ) : null}
          <span className="ml-auto inline-flex items-center gap-2 text-[10px] text-foreground/45">
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-3 w-3" /> {formatWallet(event.wallet)}
            </span>
            <span>{timeAgo(alert.createdAt)} ago</span>
            <span>· {sourceLabel(event.source)}</span>
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-[1.5] text-foreground/70">
          {alert.sentence}
        </p>
        {renderPumpMetaChips(event)}
      </div>
    </div>
  );
}

function renderPumpMetaChips(event: SignalAlert["event"]) {
  const pump = event.metadata?.pump;
  if (!pump) return null;
  const chips: Array<{ label: string; value: string }> = [];
  if (typeof pump.marketCapSol === "number" && pump.marketCapSol > 0) {
    chips.push({
      label: "MCap",
      value: `${pump.marketCapSol.toFixed(1)} SOL`,
    });
  }
  if (typeof pump.vSolInBondingCurve === "number" && pump.vSolInBondingCurve > 0) {
    chips.push({
      label: "LP",
      value: `${pump.vSolInBondingCurve.toFixed(1)} SOL`,
    });
  }
  if (typeof pump.initialBuyTokens === "number" && pump.initialBuyTokens > 0) {
    chips.push({
      label: "Init",
      value: `${Math.round(pump.initialBuyTokens).toLocaleString()}`,
    });
  }
  if (!chips.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.5 text-[10px] text-foreground/65"
        >
          <span className="text-foreground/40">{chip.label}</span>
          <span className="tabular-nums text-foreground/85">{chip.value}</span>
        </span>
      ))}
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

function QuietFeed() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-[11px] text-foreground/55">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] animate-pulse" />
        Connected · quiet upstream. Alerts stream here the moment a rule fires.
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex animate-pulse items-center gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-3"
          >
            <div className="h-7 w-7 rounded-[6px] bg-foreground/[0.08]" />
            <div className="flex-1 space-y-2">
              <div className="h-2 w-2/3 rounded bg-foreground/[0.08]" />
              <div className="h-2 w-1/2 rounded bg-foreground/[0.05]" />
            </div>
            <div className="h-2 w-10 rounded bg-foreground/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}
