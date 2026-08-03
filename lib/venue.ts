/**
 * Hyperliquid public data, read straight from the browser.
 *
 * No backend, no API key, no account. Every number on this site comes from a
 * source the visitor can query themselves — which is the whole point of the
 * terminal (REBUILD-MEMO.md §6: a stranger verifies the record without asking
 * permission).
 *
 * Values are kept as the venue's own strings wherever they are displayed.
 * Parsing to a float happens only for sorting and layout, never for anything
 * shown as a figure.
 */

export const INFO_URL = "https://api.hyperliquid.xyz/info";
export const WS_URL = "wss://api.hyperliquid.xyz/ws";

/** The universe, selected for decorrelation rather than popularity (DESIGN §3.4). */
export const UNIVERSE = ["BTC", "ETH", "HYPE", "SOL", "PAXG", "KAITO", "XRP", "DOGE"];

export type AssetSnapshot = {
  coin: string;
  markPx: string;
  midPx: string | null;
  funding: string;
  openInterest: string;
  dayNtlVlm: string;
  prevDayPx: string;
};

async function info<T>(body: unknown): Promise<T> {
  const res = await fetch(INFO_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid returned ${res.status}`);
  return (await res.json()) as T;
}

/** Mark price, funding, open interest and volume for the whole universe. */
export async function fetchUniverse(): Promise<AssetSnapshot[]> {
  const [meta, ctxs] = await info<[{ universe: { name: string }[] }, Record<string, string>[]]>({
    type: "metaAndAssetCtxs",
  });

  const out: AssetSnapshot[] = [];
  meta.universe.forEach((u, i) => {
    if (!UNIVERSE.includes(u.name)) return;
    const c = ctxs[i];
    if (!c) return;
    out.push({
      coin: u.name,
      markPx: c.markPx ?? "0",
      midPx: c.midPx ?? null,
      funding: c.funding ?? "0",
      openInterest: c.openInterest ?? "0",
      dayNtlVlm: c.dayNtlVlm ?? "0",
      prevDayPx: c.prevDayPx ?? "0",
    });
  });
  return out.sort((a, b) => UNIVERSE.indexOf(a.coin) - UNIVERSE.indexOf(b.coin));
}

/** Percentage change over 24h, computed from the venue's own two figures. */
export function dayChange(a: AssetSnapshot): number {
  const now = Number(a.markPx);
  const prev = Number(a.prevDayPx);
  if (!prev || !Number.isFinite(now) || !Number.isFinite(prev)) return 0;
  return ((now - prev) / prev) * 100;
}

/** Funding is published per-hour as a decimal. Annualised for readability. */
export function fundingAnnualPct(a: AssetSnapshot): number {
  const f = Number(a.funding);
  return Number.isFinite(f) ? f * 24 * 365 * 100 : 0;
}

export function formatUsd(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

/** Price formatting that keeps the venue's own precision rather than imposing ours. */
export function formatPx(px: string): string {
  const n = Number(px);
  if (!Number.isFinite(n)) return px;
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(5);
}
