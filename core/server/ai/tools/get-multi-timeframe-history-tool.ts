import { MarketTimeframe } from "@/core/market/types";
import { getMultiTimeframeHistorySummary } from "@/core/server/ai/context/market-history-service";
import { AiToolDefinition } from "@/core/server/ai/tools/types";

type Args = {
  productId?: string;
  timeframes?: MarketTimeframe[];
};

export const getMultiTimeframeHistoryTool: AiToolDefinition<Args> = {
  name: "get_multi_timeframe_history",
  description: "Return summarized chart history across one or more supported timeframes (15m, 1h, 4h, 1d).",
  parameters: {
    type: "object",
    properties: {
      productId: {
        type: ["string", "null"],
        description: "Market id. Use null to default to the active market.",
      },
      timeframes: {
        type: ["array", "null"],
        items: { type: "string", enum: ["15m", "1h", "4h", "1d"] },
        description: "List of timeframes to analyze. Use null to default to the standard set.",
      },
    },
    required: ["productId", "timeframes"],
    additionalProperties: false,
  },
  async execute(args, context) {
    return {
      productId: args.productId || context.selection.activeProductId,
      summaries: await getMultiTimeframeHistorySummary(
        args.productId || context.selection.activeProductId,
        args.timeframes && args.timeframes.length > 0 ? args.timeframes : undefined
      ),
    };
  },
};
