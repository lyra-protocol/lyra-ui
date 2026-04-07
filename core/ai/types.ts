import { MarketTimeframe } from "@/core/market/types";
import {
  PaperAccount,
  PaperPosition,
  PaperTrade,
  WorkspaceActivityItem,
  WorkspaceIdentity,
} from "@/core/paper/types";

export type AiWorkspaceSelection = {
  workspaceId?: string | null;
  activeProductId: string;
  activeTimeframe: MarketTimeframe;
  focusedRegion?: string | null;
};

export type AiChatRequest = {
  threadId?: string | null;
  message: string;
  selection: AiWorkspaceSelection;
  stream?: boolean;
};

export type AiThreadRole = "user" | "assistant" | "tool";

export type AiThread = {
  id: string;
  workspaceUserId: string;
  workspaceId: string;
  title: string;
  titleSource: "system" | "ai" | "user";
  lastMessagePreview: string | null;
  activeProductId: string;
  activeTimeframe: MarketTimeframe;
  lastResponseId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type AiMessage = {
  id: string;
  threadId: string;
  role: AiThreadRole;
  content: string;
  toolName: string | null;
  toolCallId: string | null;
  metadata: JsonObject | null;
  createdAt: string;
};

export type AiContextPacket = {
  selection: AiWorkspaceSelection;
  identity: WorkspaceIdentity;
  account: Pick<PaperAccount, "currency" | "cashBalance" | "startingBalance" | "realizedPnl"> | null;
  activePosition: PaperPosition | null;
  openPositions: PaperPosition[];
  market: {
    productId: string;
    symbol: string;
    name: string | null;
    price: number | null;
    open24h: number | null;
    high24h: number | null;
    low24h: number | null;
    volume24h: number | null;
  };
  recentTrades: PaperTrade[];
  recentActivity: WorkspaceActivityItem[];
  recordSyncStatus: "pending" | "connected";
};

export type AiResearchSource = "azure_foundry_web_search" | "azure_ai_search" | "disabled";

export type AiResearchResult = {
  source: AiResearchSource;
  enabled: boolean;
  query: string;
  summary: string;
  citations: Array<{
    title: string;
    url?: string;
    snippet?: string;
  }>;
};

export type AiAlert = {
  id: string;
  workspaceUserId: string;
  type: string;
  title: string;
  body: string;
  productId: string | null;
  status: "pending" | "sent" | "dismissed";
  contextPacket: JsonObject;
  createdAt: string;
  acknowledgedAt: string | null;
};

export type AiTriggerSignal = {
  type: "price_move" | "volatility_spike" | "position_risk" | "market_opportunity";
  productId: string;
  timeframe: MarketTimeframe;
  summary: string;
  metrics: JsonObject;
};

export type AiTriggerDecision = {
  shouldNotify: boolean;
  severity: "low" | "medium" | "high";
  title: string;
  body: string;
  rationale: string;
};
