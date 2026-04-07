import { MarketDirectoryItem } from "@/core/market/types";
import { PaperAccount, PaperPosition } from "@/core/paper/types";

function resolveMarketPrice(position: PaperPosition, markets: MarketDirectoryItem[]) {
  return markets.find((market) => market.id === position.productId)?.current_price ?? position.entryPrice;
}

function getUnrealizedAtPrice(position: PaperPosition, price: number) {
  return position.direction === "short"
    ? (position.entryPrice - price) * position.quantity
    : (price - position.entryPrice) * position.quantity;
}

function getPositionEquityValueAtPrice(position: PaperPosition, price: number) {
  return position.marginUsed + getUnrealizedAtPrice(position, price);
}

export function getPositionCurrentPrice(position: PaperPosition, markets: MarketDirectoryItem[]) {
  return resolveMarketPrice(position, markets);
}

export function getPositionMarketValue(position: PaperPosition, markets: MarketDirectoryItem[]) {
  return getPositionEquityValueAtPrice(position, resolveMarketPrice(position, markets));
}

export function getPositionUnrealizedPnl(position: PaperPosition, markets: MarketDirectoryItem[]) {
  return getUnrealizedAtPrice(position, resolveMarketPrice(position, markets));
}

export function getPositionUnrealizedPnlAtPrice(position: PaperPosition, price: number) {
  return getUnrealizedAtPrice(position, price);
}

export function getPaperAccountEquity(
  account: PaperAccount | null,
  positions: PaperPosition[],
  markets: MarketDirectoryItem[]
) {
  if (!account) {
    return 0;
  }

  return positions.reduce(
    (total, position) => total + getPositionMarketValue(position, markets),
    account.cashBalance
  );
}

export function getPaperAccountUnrealizedPnl(
  positions: PaperPosition[],
  markets: MarketDirectoryItem[]
) {
  return positions.reduce(
    (total, position) => total + getPositionUnrealizedPnl(position, markets),
    0
  );
}
