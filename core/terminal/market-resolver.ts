import { MarketDirectoryItem } from "@/core/market/types";

function normalizeAlias(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getAliases(market: MarketDirectoryItem) {
  const values = [
    market.id,
    market.symbol,
    market.base_currency,
    market.provider_coin,
    market.display_name,
    market.name,
    `${market.symbol}USD`,
    `${market.symbol}USDT`,
  ];

  return new Set(values.map(normalizeAlias).filter(Boolean));
}

export function resolveMarketTarget(
  input: string,
  markets: MarketDirectoryItem[]
): MarketDirectoryItem | null {
  const target = normalizeAlias(input);
  if (!target) {
    return null;
  }

  return markets.find((market) => getAliases(market).has(target)) ?? null;
}
