/**
 * Reading Lyra's permanent record.
 *
 * The record lives on Arweave, written through Irys by @lyra-protocol/record.
 * It is fetched here with plain HTTP against public endpoints — the same
 * requests documented in that package's VERIFY.md — so nothing on this page
 * depends on a server we control.
 *
 * Note the honest limitation, which the UI surfaces rather than hides: Irys
 * indexes uploads to GraphQL slowly, measured in hours. A trade written moments
 * ago is readable from the gateway but will not appear in a tag search yet.
 */

export const GRAPHQL_URL = "https://arweave.mainnet.irys.xyz/graphql";
export const GATEWAY_URL = "https://gateway.irys.xyz";
export const APP_NAME = "lyra-record";

export type Trade = {
  schema_version: number;
  owner: string;
  venue: string;
  venue_address: string;
  pair: string;
  side: "long" | "short";
  entry_price: string;
  exit_price: string;
  size: string;
  pnl: string;
  fees: string;
  open_timestamp: number;
  close_timestamp: number;
  venue_open_id: string;
  venue_close_id: string;
  strategy_id: string;
  sequence: number;
};

export type RecordEntry = {
  arweaveId: string;
  uploadedAt: number;
  trade: Trade;
};

/** Every recorded trade for an owner, oldest sequence first. */
export async function fetchRecord(owner: string): Promise<RecordEntry[]> {
  const query = `query ($tags: [TagFilter!], $first: Int!) {
    transactions(tags: $tags, first: $first, order: ASC) {
      edges { node { id timestamp receipt { timestamp } } }
    }
  }`;

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        tags: [
          { name: "App-Name", values: [APP_NAME] },
          { name: "Owner", values: [owner] },
        ],
        first: 100,
      },
    }),
  });
  if (!res.ok) return [];

  const body = (await res.json()) as {
    data?: { transactions?: { edges: { node: { id: string; timestamp: number; receipt?: { timestamp: number } } }[] } };
  };
  const edges = body.data?.transactions?.edges ?? [];

  const entries = await Promise.all(
    edges.map(async (e) => {
      try {
        const doc = await fetch(`${GATEWAY_URL}/${e.node.id}`).then((r) => r.json());
        return {
          arweaveId: e.node.id,
          uploadedAt: e.node.receipt?.timestamp ?? e.node.timestamp,
          trade: doc.trade as Trade,
        };
      } catch {
        return null;
      }
    }),
  );

  return entries
    .filter((e): e is RecordEntry => e !== null && e.trade !== undefined)
    .sort((a, b) => a.trade.sequence - b.trade.sequence);
}

/**
 * Stats recomputed here from the raw trades, never taken on trust.
 *
 * Every figure shown on the terminal is derived in the browser from records the
 * visitor can fetch themselves. Nothing is served pre-aggregated.
 */
export function deriveStats(entries: RecordEntry[]) {
  const trades = entries.map((e) => e.trade);
  const wins = trades.filter((t) => Number(t.pnl) > 0);
  const losses = trades.filter((t) => Number(t.pnl) < 0);
  const pnl = trades.reduce((s, t) => s + Number(t.pnl), 0);
  const fees = trades.reduce((s, t) => s + Number(t.fees), 0);

  let peak = 0;
  let equity = 0;
  let maxDrawdown = 0;
  for (const t of trades) {
    equity += Number(t.pnl);
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  return {
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    pnl,
    fees,
    maxDrawdown,
    avgReturn: trades.length ? pnl / trades.length : 0,
  };
}

/** Sequence gaps: how omission becomes visible. */
export function findGaps(entries: RecordEntry[]): number[] {
  if (entries.length === 0) return [];
  const seen = new Set(entries.map((e) => e.trade.sequence));
  const max = Math.max(...seen);
  const gaps: number[] = [];
  for (let i = 0; i <= max; i++) if (!seen.has(i)) gaps.push(i);
  return gaps;
}
