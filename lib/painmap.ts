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

const BASE = process.env.NEXT_PUBLIC_LYRA_API ?? "";

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

export type ActivityResponse = {
  available: boolean;
  decisions: {
    id: string;
    at: number;
    asset: string;
    action: string;
    conviction: number;
    losingSide: string;
    hypothesis: string;
    reasoning: string;
    reasoningId: string | null;
  }[];
};

async function get<T>(path: string): Promise<T> {
  if (!BASE) throw new Error("NEXT_PUBLIC_LYRA_API is not configured");
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`collector returned ${res.status}`);
  return (await res.json()) as T;
}

export const fetchPainMap = (asset: string) => get<PainMap>(`/api/painmap?asset=${asset}`);
export const fetchActivity = () => get<ActivityResponse>("/api/activity?limit=25");
