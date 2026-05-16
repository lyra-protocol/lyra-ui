"use client";

import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  ExternalLink,
  Pause,
  Play,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SignalAlert } from "@/core/signal/signal-types";
import { useLyraSignalFeed } from "@/hooks/use-lyra-signal-feed";
import { BulkTopBar } from "@/components/workspace/bulk/bulk-top-bar";
import {
  applyFeedLane,
  applyFilters,
  useSignalFiltersStore,
} from "@/stores/signal-filters-store";
import { SignalFilterPopover } from "@/components/signal/signal-filter-popover";
import { SignalActiveChips } from "@/components/signal/signal-active-chips";
import { SignalCard } from "@/components/signal/signal-card";
import { SignalLaneTabs } from "@/components/signal/signal-lane-tabs";
import { SignalDetailsPanel } from "@/components/signal/signal-details-panel";
import {
  formatUsd,
  severityBucket,
  timeAgo,
} from "@/components/signal/signal-format";

type ConnectionStatus = ReturnType<typeof useLyraSignalFeed>["status"];

const DUST_FILTER_KEY = "lyra-signal-include-dust";

function StatusDot({ status }: { status: ConnectionStatus }) {
  const base = "inline-block h-2 w-2 rounded-full";
  if (status === "open")
    return <span className={cn(base, "bg-[var(--positive)] animate-pulse")} />;
  if (status === "connecting" || status === "reconnecting")
    return <span className={cn(base, "bg-yellow-400 animate-pulse")} />;
  if (status === "error") return <span className={cn(base, "bg-[var(--negative)]")} />;
  if (status === "disabled") return <span className={cn(base, "bg-foreground/25")} />;
  return <span className={cn(base, "bg-foreground/40")} />;
}

function statusText(status: ConnectionStatus) {
  if (status === "open") return "Live";
  if (status === "connecting") return "Connecting";
  if (status === "reconnecting") return "Reconnecting";
  if (status === "error") return "Error";
  if (status === "disabled") return "Disabled";
  return "Idle";
}

function isHeartbeat(alert: SignalAlert) {
  return alert.event.metadata?.pump?.txType === "heartbeat";
}

export function SignalShell() {
  const { alerts, status, wsUrl, lastError, connectionId, hydrated } =
    useLyraSignalFeed();
  const filters = useSignalFiltersStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoscroll, setAutoscroll] = useState(true);
  const [includeDust, setIncludeDust] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(DUST_FILTER_KEY);
      if (stored === "1") setIncludeDust(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DUST_FILTER_KEY, includeDust ? "1" : "0");
  }, [includeDust]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Telegram bot URL for the header badge
  useEffect(() => {
    let cancelled = false;
    fetch("/api/telegram/bot")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { url?: string } | null) => {
        if (!cancelled && json?.url) setTelegramUrl(json.url);
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  const rawAlerts = useMemo(
    () => alerts.filter((alert) => !isHeartbeat(alert)),
    [alerts],
  );

  const filtered = useMemo(() => applyFilters(rawAlerts, filters), [rawAlerts, filters]);
  const laneScoped = useMemo(
    () => applyFeedLane(filtered, filters.feedLane),
    [filtered, filters.feedLane],
  );
  const visible = useMemo(() => {
    if (includeDust) return laneScoped;
    return laneScoped.filter((alert) => severityBucket(alert) !== "info");
  }, [laneScoped, includeDust]);

  const selected = useMemo(
    () => visible.find((alert) => alert.id === selectedId) ?? visible[0] ?? null,
    [visible, selectedId],
  );

  const lastHeartbeat = useMemo(() => {
    for (const alert of alerts) {
      if (isHeartbeat(alert)) return alert;
    }
    return null;
  }, [alerts]);

  const stats = useMemo(() => {
    const usd = visible.reduce((sum, a) => sum + (a.event.sizeUsd || 0), 0);
    const lastIso = visible[0]?.createdAt ?? rawAlerts[0]?.createdAt;
    return {
      buffered: rawAlerts.length,
      shown: visible.length,
      usd,
      last: lastIso ? `${timeAgo(lastIso)}` : "—",
    };
  }, [rawAlerts, visible]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    setAutoscroll(node.scrollTop < 8);
  }, []);

  const jumpLatest = useCallback(() => {
    setAutoscroll(true);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const editing = tag === "input" || tag === "textarea";
      if (!editing && e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (editing) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!visible.length) return;
        e.preventDefault();
        const activeId = selected?.id ?? visible[0].id;
        const index = visible.findIndex((a) => a.id === activeId);
        const next = e.key === "ArrowDown" ? index + 1 : index - 1;
        const clamped = Math.max(0, Math.min(visible.length - 1, next));
        setSelectedId(visible[clamped]?.id ?? null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, visible]);

  const handleSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      filters.setQuery("");
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <BulkTopBar />

      {/* ── Command bar ──────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-1.5">
        {/* Status */}
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1 text-[11px] text-foreground/75"
          title={lastError ?? wsUrl ?? undefined}
        >
          <StatusDot status={status} />
          <span className="hidden sm:inline">{statusText(status)}</span>
          {connectionId && (
            <span className="hidden font-mono text-[10px] text-foreground/35 sm:inline">
              · {connectionId.slice(0, 6)}
            </span>
          )}
        </span>

        <div className="mx-1 hidden h-4 w-px bg-[var(--line)] sm:block" />

        <SignalFilterPopover alerts={rawAlerts} />

        {/* Dust toggle */}
        <button
          type="button"
          onClick={() => setIncludeDust((v) => !v)}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[10px] transition",
            includeDust
              ? "border-foreground/20 bg-foreground/[0.08] text-foreground"
              : "border-[var(--line)] text-foreground/50 hover:text-foreground",
          )}
          title={includeDust ? "Hide low-severity events" : "Show all events"}
        >
          {includeDust ? "All signals" : "Notable+"}
        </button>

        {/* Search */}
        <div className="flex h-7 flex-1 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3">
          <Search className="h-3 w-3 shrink-0 text-foreground/35" />
          <input
            ref={searchRef}
            value={filters.query}
            onChange={(e) => filters.setQuery(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search token, wallet, symbol… (/)"
            className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-foreground/30"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => filters.setQuery("")}
              className="text-foreground/40 transition hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Pause */}
        <button
          type="button"
          onClick={filters.togglePaused}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[10px] transition",
            filters.paused
              ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
              : "border-[var(--line)] text-foreground/60 hover:text-foreground",
          )}
          title={filters.paused ? "Resume stream" : "Pause stream"}
        >
          {filters.paused ? (
            <><Play className="h-3 w-3" /><span className="hidden sm:inline">Resume</span></>
          ) : (
            <><Pause className="h-3 w-3" /><span className="hidden sm:inline">Pause</span></>
          )}
        </button>

        {/* Telegram badge (inline) */}
        {telegramUrl && (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--line)] px-2.5 text-[10px] text-foreground/55 transition hover:text-foreground"
            title="Subscribe on Telegram"
          >
            <Bot className="h-3 w-3" />
            <span className="hidden sm:inline">Telegram</span>
          </a>
        )}

        {/* Terminal link */}
        <Link
          href="/terminal"
          className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--line)] px-2.5 text-[10px] text-foreground/55 transition hover:text-foreground"
        >
          <span className="hidden sm:inline">Terminal</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {/* ── Lane tabs ────────────────────────────────────────────────── */}
      <SignalLaneTabs active={filters.feedLane} onChange={filters.setFeedLane} />

      {/* ── Active filter chips ──────────────────────────────────────── */}
      <SignalActiveChips />

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-4 border-b border-[var(--line)] bg-[var(--panel)]">
        <StatCell label="Buffered" value={stats.buffered.toLocaleString()} />
        <StatCell label="In view" value={stats.shown.toLocaleString()} />
        <StatCell label="Notional" value={formatUsd(stats.usd)} />
        <StatCell label="Last signal" value={stats.last} />
      </div>

      {/* ── Main: feed + inspector ─────────────────────────────────────── */}
      <section className="relative flex min-h-0 flex-1">
        {/* Feed */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
          >
            {!hydrated && alerts.length === 0 ? (
              <FeedSkeleton />
            ) : status === "disabled" ? (
              <EmptyState
                title="Signal endpoint not configured"
                message="Set NEXT_PUBLIC_LYRA_SIGNAL_URL to point to a running lyra-signal instance."
                subtle={lastError ?? undefined}
              />
            ) : visible.length === 0 ? (
              rawAlerts.length > 0 ? (
                <EmptyFilters
                  onReset={() => { filters.reset(); setIncludeDust(false); }}
                  onShowDust={() => setIncludeDust(true)}
                  showDustHint={!includeDust && filtered.length > 0}
                />
              ) : status === "open" ? (
                <QuietFeed />
              ) : (
                <EmptyState
                  title="Connecting…"
                  message={wsUrl ? `Trying ${wsUrl.replace(/^wss?:\/\//, "")}` : "Configure the signal URL to start streaming."}
                  subtle={lastError ?? undefined}
                />
              )
            ) : (
              <div className="flex flex-col gap-1.5">
                {visible.map((alert) => (
                  <SignalCard
                    key={alert.id}
                    alert={alert}
                    active={selected?.id === alert.id}
                    onSelect={() => setSelectedId(alert.id)}
                    now={now}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Jump-to-latest pill */}
          {!autoscroll && visible.length > 0 && (
            <button
              type="button"
              onClick={jumpLatest}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--panel)]/90 px-3 py-1 text-[11px] text-foreground/80 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur transition hover:text-foreground"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Jump to latest
            </button>
          )}

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-[var(--line)] bg-[var(--panel)] px-4 py-1.5 text-[10px] text-foreground/40">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "open" ? "bg-[var(--positive)] animate-pulse" : "bg-foreground/25",
              )} />
              Pipeline {status === "open" ? "live" : statusText(status).toLowerCase()}
            </span>
            <span className="font-mono">
              {rawAlerts.length > 0
                ? `last signal ${timeAgo(rawAlerts[0].createdAt)} ago`
                : lastHeartbeat
                  ? `last heartbeat ${timeAgo(lastHeartbeat.createdAt)} ago`
                  : "waiting for first event"}
            </span>
          </div>
        </div>

        {/* Inspector panel */}
        <div className="hidden w-[360px] shrink-0 lg:flex">
          <SignalDetailsPanel alert={selected} />
        </div>
      </section>
    </main>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-r border-[var(--line)] px-3 py-1.5 last:border-r-0">
      <span className="text-[9px] uppercase tracking-[0.16em] text-foreground/35">{label}</span>
      <span className="font-mono text-[11px] tabular-nums text-foreground/80">{value}</span>
    </div>
  );
}

function QuietFeed() {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[11px] text-foreground/60">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] animate-pulse" />
        Connected · waiting for a signal
      </span>
      <p className="max-w-[320px] text-[11px] text-foreground/35">
        Lyra Signal filters for large prints, early buys, launches, and surges.
        Low-severity events are suppressed unless you toggle "All signals" above.
      </p>
    </div>
  );
}

function EmptyFilters({
  onReset,
  onShowDust,
  showDustHint,
}: {
  onReset: () => void;
  onShowDust: () => void;
  showDustHint: boolean;
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center">
      <p className="text-[13px] font-medium text-foreground/75">No alerts match these filters</p>
      <p className="max-w-[300px] text-[11px] text-foreground/40">
        {showDustHint
          ? 'Some lower-severity events are hidden. Toggle "All signals" to see every match.'
          : "Try loosening a filter to let the stream through."}
      </p>
      <div className="flex gap-2">
        {showDustHint && (
          <button
            type="button"
            onClick={onShowDust}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1 text-[11px] text-foreground/65 transition hover:text-foreground"
          >
            All signals
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1 text-[11px] text-foreground/65 transition hover:text-foreground"
        >
          <X className="h-3 w-3" /> Reset filters
        </button>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse flex-col gap-2 overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--panel)] px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-12 rounded-full bg-foreground/[0.08]" />
            <span className="h-3 w-10 rounded-full bg-foreground/[0.1]" />
            <span className="h-3 flex-1 rounded-full bg-foreground/[0.06]" />
            <span className="h-3 w-14 rounded-full bg-foreground/[0.08]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-8 rounded-full bg-foreground/[0.05]" />
            <span className="h-2.5 w-16 rounded-full bg-foreground/[0.04]" />
          </div>
        </div>
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
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
      <p className="text-[13px] font-medium text-foreground/75">{title}</p>
      <p className="max-w-[360px] text-[11px] text-foreground/45">{message}</p>
      {subtle && (
        <p className="max-w-[360px] text-[10px] text-[var(--negative)]/70">{subtle}</p>
      )}
    </div>
  );
}
