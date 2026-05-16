export type SignalSourceId = "pump" | "dexscreener" | "gmgn" | "birdeye";

export type SignalTradeAction = "buy" | "sell" | "create" | "migrate" | "unknown";

export type SignalRuleId =
  | "large_wallet_usd"
  | "early_buy_index"
  | "volume_acceleration"
  | "bonding_migration"
  | "new_launch"
  | "trending_breakout"
  | "whale_move"
  | "top_gainer"
  | "momentum_spike";

export type SignalSeverity = "info" | "notable" | "alert" | "critical";

export interface SignalEvent {
  token: string;
  wallet: string;
  action: SignalTradeAction;
  sizeUsd: number;
  timestampMs: number;
  source: SignalSourceId;
  dedupeKey?: string;
  metadata?: {
    pump?: {
      marketCapSol?: number;
      vSolInBondingCurve?: number;
      vTokensInBondingCurve?: number;
      initialBuyTokens?: number;
      name?: string;
      symbol?: string;
      pool?: string;
      txType?: string;
    };
    birdeye?: {
      signalType?: SignalRuleId;
      symbol?: string;
      name?: string;
      logoURI?: string;
      liquidityUsd?: number;
      marketCapUsd?: number;
      holderCount?: number;
      priceUsd?: number;
      safetyScore?: number;
      volume1hUsd?: number;
      volume1hChangePercent?: number;
      price1hChangePercent?: number;
      price24hChangePercent?: number;
      gainPercent?: number;
      priceImpactPercent?: number;
      volumeSurgeMultiple?: number;
      traderPnlUsd?: number;
      note?: string;
      birdeyeUrl?: string;
      chartUrl?: string;
    };
  };
}

export interface SignalAlert {
  id: string;
  event: SignalEvent;
  primaryRule: SignalRuleId;
  /** Optional — older backends may omit; derive on-client when missing. */
  severity?: SignalSeverity;
  /** Optional numeric score (0-100). */
  score?: number;
  sentence: string;
  createdAt: string;
}

export type SignalStreamEvent =
  | { type: "ready"; connectionId: string }
  | { type: "alert"; payload: SignalAlert }
  | { type: "pong" };

export type SignalConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "error"
  | "disabled";
