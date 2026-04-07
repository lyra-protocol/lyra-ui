import "server-only";

import {
  PaperAccount,
  PaperPosition,
  PaperTrade,
  WorkspaceActivityItem,
  WorkspaceIdentity,
} from "@/core/paper/types";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapWorkspaceIdentity(row: Record<string, unknown>): WorkspaceIdentity {
  return {
    id: String(row.id),
    privyUserId: String(row.privy_user_id),
    walletAddress: (row.wallet_address as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    hasSeenPaperBalanceBanner: Boolean(row.has_seen_paper_balance_banner),
    aiOpportunitySettings: {
      enabled: row.ai_opportunity_alerts_enabled !== false,
      minimumConfidence: Math.round(toNumber(row.ai_opportunity_min_confidence) || 82),
      minimumScore: toNumber(row.ai_opportunity_min_score) || 11.5,
      minimumRiskReward: toNumber(row.ai_opportunity_min_rr) || 1.6,
      maximumEntryDistancePercent: toNumber(row.ai_opportunity_max_entry_distance_pct) || 0.85,
      maximumAlertsPerScan: Math.max(1, Math.round(toNumber(row.ai_opportunity_max_alerts_per_scan) || 1)),
    },
  };
}

export function mapPaperAccount(row: Record<string, unknown>): PaperAccount {
  return {
    id: String(row.id),
    currency: String(row.currency),
    startingBalance: toNumber(row.starting_balance),
    cashBalance: toNumber(row.cash_balance),
    realizedPnl: toNumber(row.realized_pnl),
    updatedAt: String(row.updated_at),
  };
}

export function mapPaperPosition(row: Record<string, unknown>): PaperPosition {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    symbol: String(row.symbol),
    direction: row.direction === "short" ? "short" : "long",
    leverage: toNumber(row.leverage ?? 1),
    marginUsed: toNumber(row.margin_used),
    quantity: toNumber(row.quantity),
    entryPrice: toNumber(row.entry_price),
    stopLoss: row.stop_loss == null ? null : toNumber(row.stop_loss),
    takeProfit: row.take_profit == null ? null : toNumber(row.take_profit),
    openedAt: String(row.created_at ?? row.opened_at ?? row.updated_at),
    updatedAt: String(row.updated_at),
  };
}

function normalizeTradeAction(value: unknown): PaperTrade["action"] {
  const action = String(value ?? "").toLowerCase();
  if (action === "close") {
    return "close";
  }
  if (action === "increase") {
    return "increase";
  }
  return "open";
}

function normalizeActivityTitle(row: Record<string, unknown>) {
  const type = String(row.type ?? "");
  const title = String(row.title ?? "");

  if (title === "Paper buy executed" || type === "trade.opened") {
    return "Position opened";
  }
  if (title === "Paper position closed" || type === "trade.closed") {
    return "Position closed";
  }
  if (title === "Paper position reduced" || title === "Position reduced" || type === "position.reduced") {
    return "Position partially reduced";
  }
  if (type === "position.increased") {
    return "Position increased";
  }
  if (type === "position.opened.long") {
    return "Long position opened";
  }
  if (type === "position.opened.short") {
    return "Short position opened";
  }
  if (type === "position.increased.long") {
    return "Long position increased";
  }
  if (type === "position.increased.short") {
    return "Short position increased";
  }
  if (type === "position.levels.updated.stop_loss") {
    return "Stop loss updated";
  }
  if (type === "position.levels.updated.take_profit") {
    return "Take profit updated";
  }

  return title;
}

export function mapPaperTrade(row: Record<string, unknown>): PaperTrade {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    symbol: String(row.symbol),
    action: normalizeTradeAction(row.action ?? row.side),
    quantity: toNumber(row.quantity),
    price: toNumber(row.price),
    notional: toNumber(row.notional),
    realizedPnl: toNumber(row.realized_pnl),
    note: (row.note as string | null) ?? null,
    executedAt: String(row.executed_at),
  };
}

export function mapWorkspaceActivity(row: Record<string, unknown>): WorkspaceActivityItem {
  return {
    id: String(row.id),
    type: String(row.type),
    title: normalizeActivityTitle(row),
    detail: (row.detail as string | null) ?? null,
    productId: (row.product_id as string | null) ?? null,
    source: row.source === "record" ? "record" : "workspace",
    createdAt: String(row.created_at),
  };
}
