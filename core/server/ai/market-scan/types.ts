export type MarketOpportunityBias = "long" | "short" | "neutral";
export type MarketOpportunityVerdict = "trade" | "watch" | "skip";
export type MarketOpportunitySetup = "continuation" | "pullback" | "breakdown" | "bounce" | "none";
export type MarketStructureState = "bullish" | "bearish" | "range";

export type MarketOpportunityPlan = {
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  leverage: number | null;
  rr: number | null;
  executable: boolean;
  condition: string;
};

export type MarketOpportunityElements = {
  trend: number;
  location: number;
  structure: number;
  riskReward: number;
  liquidity: number;
  volatility: number;
  penalty: number;
};

export type MarketOpportunityRegime = {
  stance: string;
  gateConfidence: number;
  change90d: number;
  change14d: number;
  range90d: number;
  positionInRange90d: number;
  compressionRatio: number;
};

export type MarketOpportunityReadiness = {
  preferredDirection: Exclude<MarketOpportunityBias, "neutral"> | null;
  preferredRr: number | null;
  entryDistancePercent: number | null;
  aligned: boolean;
  overextended: boolean;
};

export type MarketOpportunity = {
  productId: string;
  symbol: string;
  name: string;
  price: number;
  score: number;
  confidence: number;
  marketState: MarketStructureState;
  bias: MarketOpportunityBias;
  verdict: MarketOpportunityVerdict;
  setup: MarketOpportunitySetup;
  support: number | null;
  resistance: number | null;
  trigger: string;
  invalidation: string;
  reasons: string[];
  longPlan: MarketOpportunityPlan;
  shortPlan: MarketOpportunityPlan;
  elements: MarketOpportunityElements;
  regime: MarketOpportunityRegime;
  readiness: MarketOpportunityReadiness;
  metrics: {
    change15m: number;
    change1h: number;
    change4h: number;
    change1d: number;
    range15m: number;
    range1h: number;
    range4h: number;
    range1d: number;
    positionInRange15m: number;
    positionInRange4h: number;
    positionInRange1d: number;
    volume24h: number;
  };
};
