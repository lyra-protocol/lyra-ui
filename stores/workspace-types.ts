import { MarketTimeframe } from "@/core/market/types";

export type RailSection = "memory" | "browse";
export type WorkspaceRegion = "sidebar" | "canvas" | "context" | "shell";
export type WorkspaceMode = "guest" | "paper" | "wallet";
export type MarketDataSource = "hyperliquid" | "binance";

export type SavedWorkspaceState = {
  id: string;
  name: string;
  productId: string;
  timeframe: MarketTimeframe;
  updatedAt: string;
};
