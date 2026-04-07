export type TradingPlanLeg = {
  entry: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  leverage: number | null;
};

export type ParsedTradingPlan = {
  market: string | null;
  resistance: string | null;
  support: string | null;
  status: string | null;
  noTrade: string | null;
  long: TradingPlanLeg;
  short: TradingPlanLeg;
};

function emptyLeg(): TradingPlanLeg {
  return { entry: null, stopLoss: null, takeProfit: null, leverage: null };
}

function parseLeverage(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*x/i);
  const parsed = Number(match?.[1] ?? value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function parseLevel(value: string | null) {
  if (!value) return null;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  const parsed = Number(match?.[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTradingPlan(content: string): ParsedTradingPlan | null {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed: ParsedTradingPlan = {
    market: null,
    resistance: null,
    support: null,
    status: null,
    noTrade: null,
    long: emptyLeg(),
    short: emptyLeg(),
  };
  let activeLeg: "long" | "short" | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper === "LONG:") {
      activeLeg = "long";
      continue;
    }
    if (upper === "SHORT:") {
      activeLeg = "short";
      continue;
    }

    const match = line.match(/^([A-Za-z /]+):\s*(.+)?$/);
    if (!match) continue;
    const label = match[1].trim().toLowerCase();
    const value = match[2]?.trim() ?? "";

    if (label === "market") parsed.market = value || null;
    else if (label === "resistance") parsed.resistance = value || null;
    else if (label === "support") parsed.support = value || null;
    else if (label === "status") parsed.status = value || null;
    else if (label === "no trade") parsed.noTrade = value || null;
    else if (activeLeg === "long" && label === "entry") parsed.long.entry = value || null;
    else if (activeLeg === "long" && label === "sl") parsed.long.stopLoss = value || null;
    else if (activeLeg === "long" && label === "tp") parsed.long.takeProfit = value || null;
    else if (activeLeg === "long" && label === "leverage") parsed.long.leverage = parseLeverage(value);
    else if (activeLeg === "short" && label === "entry") parsed.short.entry = value || null;
    else if (activeLeg === "short" && label === "sl") parsed.short.stopLoss = value || null;
    else if (activeLeg === "short" && label === "tp") parsed.short.takeProfit = value || null;
    else if (activeLeg === "short" && label === "leverage") parsed.short.leverage = parseLeverage(value);
  }

  return parsed.market || parsed.status || parsed.noTrade || parsed.long.entry || parsed.short.entry ? parsed : null;
}

export function getTradeDraftDefaults(
  content: string,
  bias: "long" | "short" | "neutral"
) {
  const plan = parseTradingPlan(content);
  const activeLeg = bias === "short" ? plan?.short ?? null : bias === "long" ? plan?.long ?? null : null;

  return {
    stopLoss: parseLevel(activeLeg?.stopLoss ?? null),
    takeProfit: parseLevel(activeLeg?.takeProfit ?? null),
    leverage: activeLeg?.leverage ?? null,
  };
}
