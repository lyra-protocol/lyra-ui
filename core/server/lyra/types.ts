import "server-only";

export type LyraAgentEventType =
  | "wake"
  | "scan"
  | "thought"
  | "tool_call"
  | "tool_result"
  | "signal"
  | "decision"
  | "execution"
  | "confirmed"
  | "monitoring"
  | "closed"
  | "memory"
  | "sleep"
  | "error";

export type LyraAgentEvent = {
  type: LyraAgentEventType;
  content: string;
  data?: Record<string, unknown>;
  ts: string;
};

export type LyraAgentStatus = {
  running: boolean;
  model?: string;
  testnet?: boolean;
  hlAddress?: string | null;
  scanIntervalMs?: number;
  constraints: {
    maxPositions: number;
    maxPositionUsd: number;
    maxLeverage: number;
  };
  economy?: {
    computeCostDailyUsd: number;
    dailyTargetUsd: number;
  };
  mode?: "proxy" | "vercel";
  reachable?: boolean;
};

export type LyraMemoryLesson = {
  id?: string;
  type: "lesson" | "pattern" | "insight" | "risk_note";
  content: string;
  confidence: number;
  symbol?: string | null;
  createdAt?: string;
};

export type LyraSurvivalSnapshot = {
  bornAt: string;
  ageDays: number;
  realizedPnl: number;
  tradesOpened: number;
  tradesClosed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  date: string;
  pnlToday: number;
  dailyTarget: number;
  computeCostDaily: number;
  netToday: number;
  hitTargetToday: boolean;
  runwayDays: number | null;
  minutesSinceLastTrade: number | null;
  tradesOpenedToday: number;
  currentStreak: number;
  rewardMultiplier: number;
  recentWinRate: number | null;
  avgRecentPnl: number | null;
  equityUsd: number;
  availableMargin: number;
  withdrawable: number;
  marginSource: "ok" | "not_configured" | "fetch_failed";
  marginError: string | null;
};

export type LyraTickResult = {
  ok: boolean;
  mode: "vercel";
  iteration: number;
  events: LyraAgentEvent[];
};
