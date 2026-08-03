/**
 * Reading the Pain Map from Lyra's collector.
 *
 * Unlike the trade record, this is NOT trustless. It is reconstructed from a
 * dataset only this project holds, because Hyperliquid serves no position
 * history and it can only be built by observing continuously.
 *
 * The UI states that plainly rather than presenting every panel as equally
 * verifiable. Anyone can check a trade without us; nobody can check the Pain Map
 * without running their own collector for as long as we have.
 */

// Same-origin: the request goes to this app, which proxies it server-side.
const BASE = "/api/lyra";

export type ForcedLevel = {
  pctFromMid: number;
  notionalUsd: number;
  positions: number;
  direction: "forced_sells" | "forced_buys";
};

export type PainMap = {
  coin: string;
  midPx: string;
  positionsEnumerated: number;
  longs: { count: number; notionalUsd: number; unrealizedPnlUsd: number };
  shorts: { count: number; notionalUsd: number; unrealizedPnlUsd: number };
  aggregateUnrealizedPnlUsd: number;
  losingSide: "longs" | "shorts" | "neither";
  meanLeverage: number;
  forcedLevels: ForcedLevel[];
  concentration: number;
  coverage: { fraction: number | null; staleCount: number };
};

export type Decision = {
    id: string;
    at: number;
    asset: string;
    action: string;
    conviction: number;
    losingSide: string;
    forcedOrdersAre: string;
    hypothesis: string;
    reasoning: string;
  reasoningId: string | null;
};

export type ActivityResponse = {
  available: boolean;
  decisions: Decision[];
};

async function get<T>(path: string): Promise<T> {
  
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`collector returned ${res.status}`);
  return (await res.json()) as T;
}

export const fetchPainMap = (asset: string) => get<PainMap>(`/painmap?asset=${asset}`);
export const fetchActivity = () => get<ActivityResponse>("/activity?limit=40");
export const fetchTrades = () => get<TradesResponse>("/trades?limit=40");

/** A closed trade. What a decision was actually worth. */
export type Trade = {
  asset: string;
  side: "long" | "short";
  size: string;
  entryPx: string;
  exitPx: string;
  /** Gross, before fees. Kept separate so net can be checked, not trusted. */
  pnlUsd: number;
  feesUsd: number;
  netUsd: number;
  openedAt: number;
  closedAt: number;
  heldMs: number;
  reasoningId: string | null;
  recordId: string | null;
};

export type TradesResponse = {
  trades: Trade[];
  realisedUsd: number;
  feesUsd: number;
  netUsd: number;
  wins: number;
  losses: number;
};

export type WalletState = {
  trading: boolean;
  equityUsd: number;
  notionalUsd: number;
  unrealizedPnlUsd: number;
  sessionPnlUsd: number;
  openPositions: number;
  /** Fraction of session-start equity lost today. The 7% breaker measures this. */
  dailyLossUsed: number;
  positions: {
    asset: string;
    side: "long" | "short";
    size: string;
    entryPx: string;
    stopPx: string | null;
    markPx: string;
    openedAt: number;
    /** Loss if the stop fills. The figure a trader reads before PnL. */
    riskUsd: number | null;
    unrealizedPnlUsd: number;
  }[];
};

export const fetchWallet = () => get<WalletState>("/wallet");
