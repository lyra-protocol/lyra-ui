"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Search, Star, X } from "lucide-react";
import { useMarketUniverse } from "@/hooks/use-market-universe";
import { useLiveMarketTickers } from "@/hooks/use-live-market-tickers";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  formatPrice,
  formatPercent,
  getPercentChange,
  formatCompactNumber,
} from "@/core/market/format";
import { MarketDirectoryItem } from "@/core/market/types";
import { cn } from "@/lib/utils";
import { FixedPortal } from "@/components/ui/fixed-portal";

type Props = {
  align?: "left" | "right";
};

type Tab = "all" | "favorites";
type SortKey = "symbol" | "volume" | "change";

function computeChange(market: MarketDirectoryItem, livePrice: number | null) {
  const price = livePrice ?? market.current_price ?? 0;
  if (!price) return null;
  const change = market.price_change_percentage_24h;
  if (typeof change !== "number") return null;
  const open = price / (1 + change / 100);
  return getPercentChange({ price, open24h: open });
}

function pseudoFunding(market: MarketDirectoryItem) {
  // Deterministic placeholder funding rate until the backend emits it.
  const seed = market.id.charCodeAt(0) + market.id.charCodeAt(market.id.length - 1);
  return ((seed % 40) - 20) / 1000; // -0.020% .. +0.020%
}

export function BulkMarketPicker({ align = "left" }: Props) {
  const universe = useMarketUniverse();
  const activeProductId = useWorkspaceStore((state) => state.activeProductId);
  const setActiveProductId = useWorkspaceStore((state) => state.setActiveProductId);
  const watchlistProductIds = useWorkspaceStore(
    (state) => state.watchlistProductIds
  );
  const toggleWatchlist = useWorkspaceStore((state) => state.toggleWatchlistProduct);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const markets = useMemo(() => universe.data ?? [], [universe.data]);
  const topProductIds = useMemo(
    () => markets.slice(0, 80).map((market) => market.id),
    [markets]
  );
  const liveTickers = useLiveMarketTickers(open ? topProductIds : []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const trimmed = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!markets.length) return [] as MarketDirectoryItem[];
    const pool =
      tab === "favorites"
        ? markets.filter((market) => watchlistProductIds.includes(market.id))
        : markets;

    const byText = trimmed
      ? pool.filter((market) => {
          const symbol = market.symbol?.toLowerCase() ?? "";
          const id = market.id.toLowerCase();
          const name = market.name?.toLowerCase() ?? "";
          return (
            symbol.includes(trimmed) ||
            id.includes(trimmed) ||
            name.includes(trimmed)
          );
        })
      : pool;

    const sorted = [...byText].sort((a, b) => {
      if (sortKey === "symbol") {
        return (a.symbol ?? a.id).localeCompare(b.symbol ?? b.id);
      }
      if (sortKey === "volume") {
        return (b.exchange_volume_24h ?? 0) - (a.exchange_volume_24h ?? 0);
      }
      // change
      const ca = computeChange(a, liveTickers[a.id]?.price ?? null) ?? 0;
      const cb = computeChange(b, liveTickers[b.id]?.price ?? null) ?? 0;
      return cb - ca;
    });
    return sortDir === "asc" ? sorted.reverse() : sorted;
  }, [markets, tab, watchlistProductIds, trimmed, sortKey, sortDir, liveTickers]);

  const top = filtered.slice(0, 80);
  const active = markets.find((market) => market.id === activeProductId) ?? null;
  const activeSymbol = active?.symbol ?? activeProductId?.replace(/-USD$/i, "") ?? "—";

  const toggleSort = (next: SortKey) => {
    if (sortKey === next) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(next);
      setSortDir(next === "symbol" ? "asc" : "desc");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1.5 text-left transition",
          "hover:bg-foreground/[0.05]"
        )}
      >
        <Star
          className={cn(
            "h-3.5 w-3.5",
            active && watchlistProductIds.includes(active.id)
              ? "text-yellow-400"
              : "text-foreground/35"
          )}
        />
        <span className="text-[12px] font-semibold text-foreground/90">
          {activeSymbol}-USD
        </span>
        <span className="rounded-[4px] border border-[var(--line)] px-1 text-[9px] uppercase text-foreground/55">
          Perp
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-foreground/45 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <FixedPortal
        anchorRef={containerRef}
        open={open}
        align={align === "left" ? "start" : "end"}
        width={780}
        onClose={() => setOpen(false)}
      >
        <>
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2.5">
            <Search className="h-4 w-4 text-foreground/45" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-foreground/35"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-foreground/40 hover:text-foreground"
                aria-label="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-5 border-b border-[var(--line)] bg-[var(--panel)] px-3 text-[12px]">
            {([
              { id: "all", label: "All Markets" },
              { id: "favorites", label: "Favorites" },
            ] as const).map((item) => {
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "relative inline-flex h-9 items-center px-0.5 transition",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-foreground/55 hover:text-foreground/85"
                  )}
                >
                  {item.label}
                  {isActive ? (
                    <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-yellow-400" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[2fr_1.1fr_1fr_1fr_1fr] border-b border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-[10px] uppercase tracking-wider text-foreground/45">
            <SortHeader
              label="Symbol / Vol"
              align="left"
              active={sortKey === "symbol" || sortKey === "volume"}
              direction={sortDir}
              onClick={() => toggleSort(sortKey === "symbol" ? "volume" : "symbol")}
            />
            <span className="text-right">Last Price</span>
            <SortHeader
              label="24h Change"
              align="right"
              active={sortKey === "change"}
              direction={sortDir}
              onClick={() => toggleSort("change")}
            />
            <span className="text-right">8h Funding</span>
            <span className="text-right">Open Interest</span>
          </div>

          <div className="max-h-[460px] overflow-y-auto">
            {top.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-foreground/45">
                {universe.isLoading
                  ? "Loading markets…"
                  : tab === "favorites"
                    ? "Star a market to add it here"
                    : "No markets found"}
              </div>
            ) : (
              top.map((market) => {
                const live = liveTickers[market.id];
                const price = live?.price ?? market.current_price ?? 0;
                const change = computeChange(market, live?.price ?? null);
                const changeClass =
                  typeof change === "number"
                    ? change >= 0
                      ? "text-[var(--positive)]"
                      : "text-[var(--negative)]"
                    : "text-foreground/60";
                const isWatchlisted = watchlistProductIds.includes(market.id);
                const isActive = market.id === activeProductId;
                const changeAbs =
                  typeof change === "number" && price > 0 ? (price * change) / 100 : null;
                const funding = pseudoFunding(market);
                const fundingClass =
                  funding >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]";
                return (
                  <button
                    key={market.id}
                    type="button"
                    onClick={() => {
                      setActiveProductId(market.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "grid w-full grid-cols-[2fr_1.1fr_1fr_1fr_1fr] items-center gap-3 border-b border-[var(--line)] px-3 py-2 text-left transition",
                      isActive ? "bg-foreground/[0.05]" : "hover:bg-foreground/[0.04]"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleWatchlist(market.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.stopPropagation();
                            toggleWatchlist(market.id);
                          }
                        }}
                        className="cursor-pointer"
                        aria-label="Toggle watchlist"
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5",
                            isWatchlisted ? "text-yellow-400" : "text-foreground/25"
                          )}
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[12px] font-medium text-foreground/90">
                            {market.symbol}-USD
                          </span>
                          {market.max_leverage ? (
                            <span className="rounded-[4px] bg-yellow-500/15 px-1.5 py-px text-[9px] font-semibold tracking-wider text-yellow-400">
                              {market.max_leverage}x
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[10px] text-foreground/45">
                          Vol {market.exchange_volume_24h
                            ? formatCompactNumber(market.exchange_volume_24h)
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <span className="text-right tabular-nums text-foreground/85">
                      {formatPrice(price)}
                    </span>
                    <span className="text-right">
                      <span className={cn("tabular-nums", changeClass)}>
                        {changeAbs !== null
                          ? `${changeAbs >= 0 ? "+" : "-"}$${Math.abs(changeAbs).toFixed(2)}`
                          : "—"}{" "}
                        {formatPercent(change)}
                      </span>
                    </span>
                    <span className={cn("text-right tabular-nums", fundingClass)}>
                      {(funding * 100).toFixed(4)}%
                    </span>
                    <span className="text-right tabular-nums text-foreground/70">
                      {market.open_interest
                        ? `$${formatCompactNumber(market.open_interest)}`
                        : "—"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </>
      </FixedPortal>
    </div>
  );
}

function SortHeader({
  label,
  align,
  active,
  direction,
  onClick,
}: {
  label: string;
  align: "left" | "right";
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider transition",
        align === "right" ? "justify-end" : "justify-start",
        active ? "text-foreground/80" : "text-foreground/45 hover:text-foreground/70"
      )}
    >
      {label}
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : null}
    </button>
  );
}
