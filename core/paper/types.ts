export type WorkspaceIdentity = {
  id: string;
  privyUserId: string;
  walletAddress: string | null;
  email: string | null;
  displayName: string | null;
  hasSeenPaperBalanceBanner: boolean;
  aiOpportunitySettings: AiOpportunitySettings;
};

export type AiOpportunitySettings = {
  enabled: boolean;
  minimumConfidence: number;
  minimumScore: number;
  minimumRiskReward: number;
  maximumEntryDistancePercent: number;
  maximumAlertsPerScan: number;
};

export type PaperAccount = {
  id: string;
  currency: string;
  startingBalance: number;
  cashBalance: number;
  realizedPnl: number;
  updatedAt: string;
};

export type PaperPosition = {
  id: string;
  productId: string;
  symbol: string;
  direction: PaperPositionDirection;
  leverage: number;
  marginUsed: number;
  quantity: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string;
  updatedAt: string;
};

export type PaperPositionDirection = "long" | "short";

export type PaperTradeAction = "open" | "increase" | "close";

export type PaperTrade = {
  id: string;
  productId: string;
  symbol: string;
  action: PaperTradeAction;
  quantity: number;
  price: number;
  notional: number;
  realizedPnl: number;
  note: string | null;
  executedAt: string;
};

export type WorkspaceActivitySource = "workspace" | "record";

export type WorkspaceActivityItem = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  productId: string | null;
  source: WorkspaceActivitySource;
  createdAt: string;
};

export type RecordSyncStatus = "pending" | "connected";

export type PaperTradingCapabilities = {
  maxLeverage: number;
};

export type PaperWorkspaceContext = {
  identity: WorkspaceIdentity;
  account: PaperAccount;
  positions: PaperPosition[];
  trades: PaperTrade[];
  activity: WorkspaceActivityItem[];
  recordSyncStatus: RecordSyncStatus;
  capabilities: PaperTradingCapabilities;
};

type PaperTradeBaseRequest = {
  productId: string;
  symbol: string;
  price: number;
  note?: string;
  direction?: PaperPositionDirection;
  leverage?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export type OpenPaperPositionRequest = PaperTradeBaseRequest & {
  action: "open";
  notional: number;
};

export type IncreasePaperPositionRequest = PaperTradeBaseRequest & {
  action: "increase";
  notional: number;
};

export type ClosePaperPositionRequest = PaperTradeBaseRequest & {
  action: "close";
  quantity: number;
};

export type PaperTradeRequest =
  | OpenPaperPositionRequest
  | IncreasePaperPositionRequest
  | ClosePaperPositionRequest;

export type PaperTradeMutationResult = {
  account: PaperAccount;
  position: PaperPosition | null;
  trade: PaperTrade;
  activity: WorkspaceActivityItem;
};

export type PaperPositionLevelsRequest = {
  productId: string;
  stopLoss: number | null;
  takeProfit: number | null;
  note?: string;
};

export type PaperPositionLevelsMutationResult = {
  position: PaperPosition;
  activity: WorkspaceActivityItem;
};
