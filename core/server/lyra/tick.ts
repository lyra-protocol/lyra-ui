import "server-only";

import { fetchMarketOverviewServer } from "@/core/market/market-server";
import { getLyraAgentConfig } from "@/core/server/lyra/config";
import { getVercelMemoryLessons, getVercelSurvivalSnapshot } from "@/core/server/lyra/store";
import type { LyraAgentEvent, LyraTickResult } from "@/core/server/lyra/types";

type MarketRow = {
  symbol: string;
  mark: number;
  "15m": { trend: "up" | "down" | "flat" };
};

const VERCEL_MARKETS = ["SOL-USD", "BTC-USD", "ETH-USD"] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function makeEvent(event: Omit<LyraAgentEvent, "ts">): LyraAgentEvent {
  return { ...event, ts: nowIso() };
}

function iterationNumber(): number {
  const config = getLyraAgentConfig();
  return Math.max(1, Math.floor(Date.now() / Math.max(config.scanIntervalMs, 1)));
}

function symbolFromProduct(productId: string): string {
  return productId.replace(/-USD$/i, "");
}

function trendFromOpen(mark: number, open24h: number): "up" | "down" | "flat" {
  if (!open24h || Math.abs(mark - open24h) / open24h < 0.001) return "flat";
  return mark > open24h ? "up" : "down";
}

async function fetchMarketRows(): Promise<MarketRow[]> {
  const results = await Promise.allSettled(
    VERCEL_MARKETS.map(async (productId) => {
      const overview = await fetchMarketOverviewServer(productId);
      return {
        symbol: symbolFromProduct(productId),
        mark: overview.price,
        "15m": { trend: trendFromOpen(overview.price, overview.open24h) },
      } satisfies MarketRow;
    }),
  );

  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

function formatMarkets(markets: MarketRow[]): string {
  if (markets.length === 0) return "no markets";
  return markets.map((market) => `${market.symbol} $${market.mark.toLocaleString("en-US")}`).join(" | ");
}

function survivalLine(survival: Awaited<ReturnType<typeof getVercelSurvivalSnapshot>>): string {
  const sign = survival.pnlToday >= 0 ? "+" : "";
  const runway = survival.runwayDays !== null ? `${survival.runwayDays.toFixed(1)}d` : "?";
  return `Survival: ${survival.hitTargetToday ? "✓" : "✗"} pnl ${sign}$${survival.pnlToday.toFixed(2)} | runway ${runway}`;
}

export async function runVercelAgentTick(): Promise<LyraTickResult> {
  const config = getLyraAgentConfig();
  const iteration = iterationNumber();
  const [survival, memories, markets] = await Promise.all([
    getVercelSurvivalSnapshot(),
    getVercelMemoryLessons(15),
    fetchMarketRows(),
  ]);

  const events: LyraAgentEvent[] = [
    makeEvent({ type: "scan", content: `Scan #${iteration} — collecting market data...` }),
    makeEvent({ type: "scan", content: survivalLine(survival), data: { survival } }),
    makeEvent({
      type: "scan",
      content: `Markets: ${formatMarkets(markets)}`,
      data: {
        markets: markets.length,
        positions: [],
        memories,
        accountValue: survival.equityUsd,
        availableMargin: survival.availableMargin,
        withdrawable: survival.withdrawable,
        hlMarginStatus: survival.marginSource,
        hlMarginError: survival.marginError,
      },
    }),
    makeEvent({ type: "tool_result", content: "← get_market_context done", data: { markets } }),
    makeEvent({
      type: "sleep",
      content: `Cycle complete. Next wake can call /api/lyra/tick in ${Math.round(config.scanIntervalMs / 1000)}s.`,
      data: { nextScanAt: new Date(Date.now() + config.scanIntervalMs).toISOString() },
    }),
  ];

  if (markets.length === 0) {
    events.splice(
      1,
      0,
      makeEvent({
        type: "error",
        content: "Market data unavailable in this Vercel tick. The page will retry on the next wake.",
      }),
    );
  }

  return { ok: true, mode: "vercel", iteration, events };
}
