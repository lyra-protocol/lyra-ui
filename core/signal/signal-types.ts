export type SignalSourceId = "pump" | "dexscreener" | "gmgn";

export type SignalTradeAction = "buy" | "sell" | "create" | "migrate" | "unknown";

export type SignalRuleId =
  | "large_wallet_usd"
  | "early_buy_index"
  | "volume_acceleration";

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
  };
}

export interface SignalAlert {
  id: string;
  event: SignalEvent;
  primaryRule: SignalRuleId;
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
