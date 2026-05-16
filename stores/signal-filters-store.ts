import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SignalAlert, SignalSourceId } from "@/core/signal/signal-types";

export type SignalRule = SignalAlert["primaryRule"];
export type SignalAction =
  | "buy"
  | "sell"
  | "create"
  | "migrate"
  | "unknown";

/** High-level rail — narrows the card feed without opening the filter popover. */
export type SignalFeedLane =
  | "all"
  | "launches"
  | "whales"
  | "early_cluster"
  | "surge"
  | "graduate";

type SignalFiltersState = {
  rules: SignalRule[]; // empty = all
  actions: SignalAction[]; // empty = all
  sources: SignalSourceId[]; // empty = all
  minUsd: number; // 0 = no min
  query: string;
  paused: boolean;
  feedLane: SignalFeedLane;
  setRules: (next: SignalRule[]) => void;
  toggleRule: (rule: SignalRule) => void;
  setActions: (next: SignalAction[]) => void;
  toggleAction: (action: SignalAction) => void;
  setSources: (next: SignalSourceId[]) => void;
  toggleSource: (source: SignalSourceId) => void;
  setMinUsd: (value: number) => void;
  setQuery: (value: string) => void;
  togglePaused: () => void;
  setFeedLane: (lane: SignalFeedLane) => void;
  reset: () => void;
};

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export const useSignalFiltersStore = create<SignalFiltersState>()(
  persist(
    (set) => ({
      rules: [],
      actions: [],
      sources: [],
      minUsd: 0,
      query: "",
      paused: false,
      feedLane: "all",
      setRules: (rules) => set({ rules }),
      toggleRule: (rule) => set((state) => ({ rules: toggleIn(state.rules, rule) })),
      setActions: (actions) => set({ actions }),
      toggleAction: (action) => set((state) => ({ actions: toggleIn(state.actions, action) })),
      setSources: (sources) => set({ sources }),
      toggleSource: (source) => set((state) => ({ sources: toggleIn(state.sources, source) })),
      setMinUsd: (value) => set({ minUsd: Math.max(0, Math.floor(value)) }),
      setQuery: (value) => set({ query: value }),
      togglePaused: () => set((state) => ({ paused: !state.paused })),
      setFeedLane: (feedLane) => set({ feedLane }),
      reset: () =>
        set({
          rules: [],
          actions: [],
          sources: [],
          minUsd: 0,
          query: "",
          paused: false,
          feedLane: "all",
        }),
    }),
    { name: "lyra-signal-filters", version: 2 }
  )
);

export function countActiveFilters(filters: SignalFiltersState): number {
  let n = 0;
  if (filters.rules.length) n += 1;
  if (filters.actions.length) n += 1;
  if (filters.sources.length) n += 1;
  if (filters.minUsd > 0) n += 1;
  if (filters.query.trim()) n += 1;
  return n;
}

export function applyFeedLane(
  alerts: SignalAlert[],
  lane: SignalFeedLane,
): SignalAlert[] {
  if (lane === "all") return alerts;
  if (lane === "launches") {
    return alerts.filter((a) => a.event.action === "create" || a.primaryRule === "new_launch");
  }
  if (lane === "whales") {
    return alerts.filter((a) => a.primaryRule === "large_wallet_usd" || a.primaryRule === "whale_move");
  }
  if (lane === "early_cluster") {
    return alerts.filter(
      (a) => a.primaryRule === "early_buy_index" && a.event.action === "buy",
    );
  }
  if (lane === "surge") {
    return alerts.filter((a) => a.primaryRule === "volume_acceleration" || a.primaryRule === "trending_breakout" || a.primaryRule === "momentum_spike" || a.primaryRule === "top_gainer");
  }
  if (lane === "graduate") {
    return alerts.filter(
      (a) =>
        a.primaryRule === "bonding_migration" || a.event.action === "migrate",
    );
  }
  return alerts;
}

export function applyFilters(
  alerts: SignalAlert[],
  filters: SignalFiltersState
): SignalAlert[] {
  const trimmed = filters.query.trim().toLowerCase();
  return alerts.filter((alert) => {
    if (filters.rules.length && !filters.rules.includes(alert.primaryRule)) return false;
    if (filters.actions.length && !filters.actions.includes(alert.event.action as SignalAction))
      return false;
    if (filters.sources.length && !filters.sources.includes(alert.event.source)) return false;
    if (filters.minUsd > 0 && alert.event.sizeUsd < filters.minUsd) return false;
    if (trimmed) {
      const symbol = (alert.event.metadata?.pump?.symbol ?? alert.event.metadata?.birdeye?.symbol)?.toLowerCase() ?? "";
      const name = (alert.event.metadata?.pump?.name ?? alert.event.metadata?.birdeye?.name)?.toLowerCase() ?? "";
      const token = alert.event.token.toLowerCase();
      const wallet = alert.event.wallet.toLowerCase();
      if (
        !symbol.includes(trimmed) &&
        !name.includes(trimmed) &&
        !token.includes(trimmed) &&
        !wallet.includes(trimmed) &&
        !alert.sentence.toLowerCase().includes(trimmed)
      ) {
        return false;
      }
    }
    return true;
  });
}
