import "server-only";

import { fetchHyperliquidProductsServer } from "@/core/market/hyperliquid-server";
import { fetchMarketCandlesServer } from "@/core/market/market-server";
import { assessMarketForAnalysis } from "./analysis-gate";
import { scoreMarketOpportunity } from "./score-market";
import { MarketOpportunity } from "./types";

type ScanArgs = {
  limit?: number;
  candidateCount?: number;
  includeProductId?: string | null;
  excludeProductId?: string | null;
};

const SCAN_CACHE_TTL_MS = 60_000;
const SCAN_CONCURRENCY = 6;
let cachedScan: { expiresAt: number; opportunities: MarketOpportunity[] } | null = null;

function rankCandidates(markets: Awaited<ReturnType<typeof fetchHyperliquidProductsServer>>) {
  return [...markets]
    .filter((market) => market.current_price > 0 && (market.exchange_volume_24h ?? 0) > 250_000)
    .sort((left, right) => (right.exchange_volume_24h ?? 0) - (left.exchange_volume_24h ?? 0));
}

async function mapWithConcurrency<TItem, TResult>(
  items: TItem[],
  limit: number,
  mapper: (item: TItem) => Promise<TResult>
) {
  const results: TResult[] = [];

  for (let index = 0; index < items.length; index += limit) {
    const chunk = items.slice(index, index + limit);
    results.push(...(await Promise.all(chunk.map(mapper))));
  }

  return results;
}

async function buildOpportunityUniverse(candidateCount: number) {
  const markets = rankCandidates(await fetchHyperliquidProductsServer()).slice(0, candidateCount);

  const scored = await mapWithConcurrency(markets, SCAN_CONCURRENCY, async (market) => {
    try {
      const candles1d = await fetchMarketCandlesServer(market.id, "1d");
      const gate = assessMarketForAnalysis(candles1d);
      if (!gate.ready) {
        return null;
      }

      const [candles15m, candles1h, candles4h] = await Promise.all([
        fetchMarketCandlesServer(market.id, "15m"),
        fetchMarketCandlesServer(market.id, "1h"),
        fetchMarketCandlesServer(market.id, "4h"),
      ]);
      const opportunity = scoreMarketOpportunity({
        market,
        candles15m,
        candles1h,
        candles4h,
        candles1d,
        gate,
      });

      if (!opportunity) {
        return null;
      }

      return {
        ...opportunity,
        score: Number(
          (
            opportunity.score +
            gate.confidence * 0.08 +
            (opportunity.readiness.aligned ? 0.45 : -0.65) +
            ((opportunity.readiness.preferredRr ?? 0) >= 2 ? 0.6 : 0) -
            (opportunity.readiness.overextended ? 0.9 : 0)
          ).toFixed(2)
        ),
        confidence: Math.round((opportunity.confidence * 0.68 + gate.confidence * 0.32)),
        reasons: [gate.summary, ...opportunity.reasons],
      } satisfies MarketOpportunity;
    } catch {
      return null;
    }
  });

  return scored
    .filter((item): item is MarketOpportunity => Boolean(item))
    .sort((left, right) => {
      const verdictRank = { trade: 0, watch: 1, skip: 2 };
      const verdictDelta = verdictRank[left.verdict] - verdictRank[right.verdict];
      if (verdictDelta !== 0) {
        return verdictDelta;
      }
      const leftQuality = left.score + (left.readiness.preferredRr ?? 0) * 0.8 - (left.readiness.entryDistancePercent ?? 5) * 0.4;
      const rightQuality =
        right.score + (right.readiness.preferredRr ?? 0) * 0.8 - (right.readiness.entryDistancePercent ?? 5) * 0.4;
      return rightQuality - leftQuality;
    });
}

export async function scanMarketsForSetups(args: ScanArgs = {}) {
  const limit = Math.min(Math.max(args.limit ?? 5, 1), 12);
  const candidateCount = Math.min(Math.max(args.candidateCount ?? 28, limit), 40);
  const useCache = !args.includeProductId && !args.excludeProductId;

  if (useCache && cachedScan && cachedScan.expiresAt > Date.now()) {
    return cachedScan.opportunities.slice(0, limit);
  }

  const opportunities = await buildOpportunityUniverse(candidateCount);
  if (useCache) {
    cachedScan = {
      expiresAt: Date.now() + SCAN_CACHE_TTL_MS,
      opportunities,
    };
  }

  return opportunities
    .filter((item) => item.productId !== args.excludeProductId)
    .sort((left, right) => {
      if (args.includeProductId === left.productId) return -1;
      if (args.includeProductId === right.productId) return 1;
      return right.score - left.score;
    })
    .slice(0, limit);
}
