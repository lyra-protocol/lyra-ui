import { fetchMarketOverviewServer, fetchMarketProductsServer } from "@/core/market/market-server";
import { AiToolDefinition } from "@/core/server/ai/tools/types";

type Args = {
  productId?: string;
};

export const getMarketSnapshotTool: AiToolDefinition<Args> = {
  name: "get_market_snapshot",
  description: "Return the latest snapshot for a market including price, 24h range, volume, and symbol metadata.",
  parameters: {
    type: "object",
    properties: {
      productId: {
        type: ["string", "null"],
        description: "Market id such as BTC-USD. Use null to default to the active market.",
      },
    },
    required: ["productId"],
    additionalProperties: false,
  },
  async execute(args, context) {
    const productId = args.productId || context.selection.activeProductId;
    const [overview, products] = await Promise.all([
      fetchMarketOverviewServer(productId),
      fetchMarketProductsServer().catch(() => []),
    ]);
    const market = products.find((item) => item.id === productId);

    return {
      productId,
      symbol: market ? `${market.base_currency}/${market.quote_currency}` : context.context.market.symbol,
      name: market?.display_name ?? context.context.market.name,
      overview,
    };
  },
};
