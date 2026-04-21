"use client";

import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
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
  applyFilters,
  useSignalFiltersStore,
} from "@/stores/signal-filters-store";
import { SignalFilterPopover } from "@/components/signal/signal-filter-popover";
import { SignalActiveChips } from "@/components/signal/signal-active-chips";
import { SignalTapeRow } from "@/components/signal/signal-tape-row";
import { SignalDetailsPanel } from "@/components/signal/signal-details-panel";
import { formatUsd, timeAgo } from "@/components/signal/signal-format";

type ConnectionStatus = ReturnType<typeof useLyraSignalFeed>["status"];

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

export function SignalShell() {
  const { alerts, status, wsUrl, lastError, connectionId } = useLyraSignalFeed();
  const filters = useSignalFiltersStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoscroll, setAutoscroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [, forceTickerUpdate] = useState(0);

  // Re-render relative times once per second.
  useEffect(() => {
    const interval = setInterval(() => forceTickerUpdate((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const visible = useMemo(() => {
    const filtered = applyFilters(alerts, filters);
    return filters.paused ? filtered.slice() : filtered;
  }, [alerts, filters]);

  const selected = useMemo(
    () => visible.find((alert) => alert.id === selectedId) ?? visible[0] ?? null,
    [visible, selectedId]
  );

  const stats = useMemo(() => {
    const usd = alerts.reduce((sum, alert) => sum + (alert.event.sizeUsd || 0), 0);
    const lastIso = alerts[0]?.createdAt;
    const lastLabel = lastIso ? `${timeAgo(lastIso)} ago` : "—";
    return { total: alerts.length, shown: visible.length, usd, lastLabel };
  }, [alerts, visible]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    setAutoscroll(node.scrollTop < 8);
  }, []);

  const jumpLatest = useCallback(() => {
    setAutoscroll(true);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Keyboard: `/` focuses search; arrows move selection when search isn't focused.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const editing = tag === "input" || tag === "textarea";
      if (!editing && event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (editing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (visible.length === 0) return;
        event.preventDefault();
        const activeId = selected?.id ?? visible[0].id;
        const index = visible.findIndex((alert) => alert.id === activeId);
        const next = event.key === "ArrowDown" ? index + 1 : index - 1;
        const clamped = Math.max(0, Math.min(visible.length - 1, next));
        setSelectedId(visible[clamped]?.id ?? null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, visible]);

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      filters.setQuery("");
      (event.currentTarget as HTMLInputElement).blur();
    }
  };

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <BulkTopBar />

      {/* Command bar */}
      <section className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-foreground/45">
            Lyra Signal
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2 py-0.5 text-[11px] text-foreground/75"
            title={lastError ?? wsUrl ?? undefined}
          >
            <StatusDot status={status} />
            {statusText(status)}
            {connectionId ? (
              <span className="font-mono text-[10px] text-foreground/40">
                · {connectionId.slice(0, 6)}
              </span>
            ) : null}
          </span>
        </div>

        <SignalFilterPopover alerts={alerts} />

        <div className="flex h-8 flex-1 items-center gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2">
          <Search className="h-3.5 w-3.5 text-foreground/45" />
          <input
            ref={searchRef}
            value={filters.query}
            onChange={(event) => filters.setQuery(event.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search token, wallet, symbol, or sentence (/)"
            className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-foreground/35"
          />
          {filters.query ? (
            <button
              type="button"
              onClick={() => filters.setQuery("")}
              className="text-foreground/45 transition hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={filters.togglePaused}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-[6px] border px-2.5 text-[11px] transition",
            filters.paused
              ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
              : "border-[var(--line)] bg-[var(--panel-2)] text-foreground/75 hover:text-foreground"
          )}
          title={filters.paused ? "Resume tape" : "Pause tape"}
        >
          {filters.paused ? (
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
          className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-[11px] text-foreground/75 transition hover:text-foreground"
        >
          Terminal <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* Active filters */}
      <SignalActiveChips />

      {/* Stat strip */}
      <div className="grid grid-cols-2 border-b border-[var(--line)] bg-[var(--panel)] sm:grid-cols-4">
        <StatTile label="Buffer" value={stats.total.toLocaleString()} />
        <StatTile label="Matches" value={stats.shown.toLocaleString()} />
        <StatTile label="USD streamed" value={formatUsd(stats.usd)} />
        <StatTile label="Last alert" value={stats.lastLabel} />
      </div>

      {/* Tape + details */}
      <section className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid shrink-0 grid-cols-[64px_28px_1fr_90px_100px_44px] gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-4 py-1.5 text-[9px] uppercase tracking-[0.16em] text-foreground/40">
            <span>Time</span>
            <span />
            <span>Rule · Token · Note</span>
            <span className="text-right">Notional</span>
            <span className="text-right">Wallet</span>
            <span className="text-right">Source</span>
          </div>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            {status === "disabled" ? (
              <EmptyState
                title="Signal endpoint not configured"
                message="Set NEXT_PUBLIC_LYRA_SIGNAL_URL to the Lyra Signal URL."
                subtle={lastError ?? undefined}
              />
            ) : visible.length === 0 ? (
              alerts.length > 0 ? (
                <EmptyFilters onReset={() => filters.reset()} />
              ) : status === "open" ? (
                <QuietFeed />
              ) : (
                <EmptyState
                  title="Connecting to the signal bus"
                  message={
                    wsUrl
                      ? `Trying ${wsUrl.replace(/^wss?:\/\//, "")}`
                      : "Configure the Signal URL to start streaming."
                  }
                  subtle={lastError ?? undefined}
                />
              )
            ) : (
              <>
                {visible.map((alert) => (
                  <SignalTapeRow
                    key={alert.id}
                    alert={alert}
                    active={selected?.id === alert.id}
                    onSelect={() => setSelectedId(alert.id)}
                  />
                ))}
                <div className="h-8" />
              </>
            )}
          </div>

          {!autoscroll && visible.length > 0 ? (
            <button
              type="button"
              onClick={jumpLatest}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] bg-[var(--panel)]/90 px-3 py-1 text-[11px] text-foreground/85 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur transition hover:text-foreground"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Jump to latest
            </button>
          ) : null}
        </div>

        <div className="hidden w-[340px] shrink-0 lg:flex">
          <SignalDetailsPanel alert={selected as SignalAlert | null} />
        </div>
      </section>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-r border-[var(--line)] px-4 py-2 last:border-r-0">
      <span className="text-[10px] uppercase tracking-[0.16em] text-foreground/40">
        {label}
      </span>
      <span className="font-mono text-[12px] tabular-nums text-foreground/90">
        {value}
      </span>
    </div>
  );
}

function QuietFeed() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
      <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1 text-[11px] text-foreground/70">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] animate-pulse" />
        Connected · quiet upstream
      </div>
      <p className="mt-3 max-w-md text-[12px] text-foreground/45">
        No rule has fired yet. The tape updates the moment a wallet crosses the
        active thresholds upstream.
      </p>
    </div>
  );
}

function EmptyFilters({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
      <p className="text-[13px] font-medium text-foreground/80">
        No alerts match these filters.
      </p>
      <p className="mt-1 max-w-md text-[11px] text-foreground/45">
        Loosen a filter to let the stream through.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 inline-flex items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1 text-[11px] text-foreground/75 transition hover:text-foreground"
      >
        <X className="h-3 w-3" />
        Clear filters
      </button>
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
      <p className="text-[13px] font-medium text-foreground/80">{title}</p>
      <p className="max-w-md text-[11px] text-foreground/55">{message}</p>
      {subtle ? (
        <p className="max-w-md text-[10px] text-[var(--negative)]/80">{subtle}</p>
      ) : null}
    </div>
  );
}
