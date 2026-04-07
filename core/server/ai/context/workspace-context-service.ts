import "server-only";

import { AiContextPacket, AiWorkspaceSelection } from "@/core/ai/types";
import { fetchMarketOverviewServer, fetchMarketProductsServer } from "@/core/market/market-server";
import { WorkspaceIdentitySeedInput } from "@/core/server/services/workspace-user-service";
import { getPaperWorkspaceContext } from "@/core/server/services/paper-workspace-service";

function resolveMarketName(productId: string, markets: Awaited<ReturnType<typeof fetchMarketProductsServer>>) {
  const market = markets.find((item) => item.id === productId);
  if (!market) {
    return { symbol: productId, name: null };
  }

  return {
    symbol: `${market.base_currency}/${market.quote_currency}`,
    name: market.display_name ?? null,
  };
}

export async function loadAiWorkspaceContext(
  identity: WorkspaceIdentitySeedInput,
  selection: AiWorkspaceSelection
): Promise<AiContextPacket> {
  const [workspace, marketOverview, marketDirectory] = await Promise.all([
    getPaperWorkspaceContext(identity),
    fetchMarketOverviewServer(selection.activeProductId).catch(() => null),
    fetchMarketProductsServer().catch(() => []),
  ]);

  const marketDetails = resolveMarketName(selection.activeProductId, marketDirectory);
  const activePosition =
    workspace.positions.find((position) => position.productId === selection.activeProductId) ?? null;

  return {
    selection,
    identity: workspace.identity,
    account: workspace.account
      ? {
          currency: workspace.account.currency,
          cashBalance: workspace.account.cashBalance,
          startingBalance: workspace.account.startingBalance,
          realizedPnl: workspace.account.realizedPnl,
        }
      : null,
    activePosition,
    openPositions: workspace.positions.slice(0, 12),
    market: {
      productId: selection.activeProductId,
      symbol: marketDetails.symbol,
      name: marketDetails.name,
      price: marketOverview?.price ?? null,
      open24h: marketOverview?.open24h ?? null,
      high24h: marketOverview?.high24h ?? null,
      low24h: marketOverview?.low24h ?? null,
      volume24h: marketOverview?.volume24h ?? null,
    },
    recentTrades: workspace.trades.slice(0, 8),
    recentActivity: workspace.activity
      .filter((entry) => !entry.productId || entry.productId === selection.activeProductId)
      .slice(0, 8),
    recordSyncStatus: workspace.recordSyncStatus,
  };
}
