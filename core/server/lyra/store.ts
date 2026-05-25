import "server-only";

import { getLyraAgentConfig } from "@/core/server/lyra/config";
import type { LyraMemoryLesson, LyraSurvivalSnapshot } from "@/core/server/lyra/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

type SurvivalRow = Record<string, unknown>;
type LessonRow = Record<string, unknown>;

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function ageDaysSince(iso: string): number {
  const start = new Date(iso).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, (Date.now() - start) / 86_400_000);
}

function rewardMultiplier(streak: number): number {
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.25;
  if (streak >= 1) return 1.1;
  if (streak === 0) return 1;
  if (streak >= -2) return 0.8;
  if (streak >= -4) return 0.65;
  return 0.5;
}

async function loadSurvivalRow(): Promise<SurvivalRow | null> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("lyra_agent_survival")
      .select("*")
      .eq("id", "lyra")
      .maybeSingle<SurvivalRow>();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getVercelSurvivalSnapshot(): Promise<LyraSurvivalSnapshot> {
  const config = getLyraAgentConfig();
  const row = await loadSurvivalRow();
  const bornAt = stringValue(row?.born_at) ?? config.bornAt;
  const date = stringValue(row?.today_date) ?? todayUtc();
  const todayStartEquity = numberValue(row?.today_start_equity, config.paperEquityUsd);
  const equityUsd = config.paperEquityUsd;
  const pnlToday = equityUsd - todayStartEquity;
  const tradesClosed = numberValue(row?.trades_closed);
  const wins = numberValue(row?.wins);
  const losses = numberValue(row?.losses);
  const currentStreak = numberValue(row?.current_streak);
  const lastTradeOpenedAt = stringValue(row?.last_trade_opened_at);

  return {
    bornAt,
    ageDays: ageDaysSince(bornAt),
    realizedPnl: numberValue(row?.realized_pnl),
    tradesOpened: numberValue(row?.trades_opened),
    tradesClosed,
    wins,
    losses,
    winRate: tradesClosed > 0 ? wins / tradesClosed : null,
    date,
    pnlToday,
    dailyTarget: config.dailyTargetUsd,
    computeCostDaily: config.computeCostDailyUsd,
    netToday: pnlToday - config.computeCostDailyUsd,
    hitTargetToday: pnlToday >= config.dailyTargetUsd,
    runwayDays: config.computeCostDailyUsd > 0 ? equityUsd / config.computeCostDailyUsd : null,
    minutesSinceLastTrade: lastTradeOpenedAt
      ? Math.max(0, (Date.now() - new Date(lastTradeOpenedAt).getTime()) / 60_000)
      : null,
    tradesOpenedToday: numberValue(row?.trades_opened_today),
    currentStreak,
    rewardMultiplier: rewardMultiplier(currentStreak),
    recentWinRate: null,
    avgRecentPnl: null,
    equityUsd,
    availableMargin: equityUsd,
    withdrawable: equityUsd,
    marginSource: "not_configured",
    marginError: "Execution signer is not configured in this deployment.",
  };
}

function mapLesson(row: LessonRow): LyraMemoryLesson | null {
  const content = stringValue(row.content);
  const type = stringValue(row.type);
  if (!content || !type) return null;
  if (!["lesson", "pattern", "insight", "risk_note"].includes(type)) return null;

  return {
    id: stringValue(row.id) ?? undefined,
    type: type as LyraMemoryLesson["type"],
    content,
    confidence: numberValue(row.confidence, 0.5),
    symbol: stringValue(row.symbol),
    createdAt: stringValue(row.created_at) ?? undefined,
  };
}

export async function getVercelMemoryLessons(limit = 20): Promise<LyraMemoryLesson[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("lyra_agent_lessons")
      .select("id,type,content,confidence,symbol,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return defaultMemoryLessons();
    return (data ?? []).map(mapLesson).filter((item): item is LyraMemoryLesson => Boolean(item));
  } catch {
    return defaultMemoryLessons();
  }
}

function defaultMemoryLessons(): LyraMemoryLesson[] {
  return [
    {
      type: "risk_note",
      content: "Lyra is monitoring market conditions.",
      confidence: 0.95,
      createdAt: new Date().toISOString(),
    },
  ];
}
