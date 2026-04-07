import { scanMarketsForSetups } from "@/core/server/ai/market-scan/scan-service";
import { AiToolDefinition } from "@/core/server/ai/tools/types";

type Args = {
  limit: number | null;
  candidateCount: number | null;
  excludeProductId: string | null;
  includeActiveMarket: boolean | null;
};

export const scanMarketsForSetupsTool: AiToolDefinition<Args> = {
  name: "scan_markets_for_setups",
  description:
    "Scan the liquid market universe, score structured setups, and return the best trade, watch, or skip candidates with directional plans.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: ["number", "null"],
        description: "Maximum number of ranked markets to return. Use null for default.",
      },
      candidateCount: {
        type: ["number", "null"],
        description: "How many liquid markets to inspect before ranking. Use null for default.",
      },
      excludeProductId: {
        type: ["string", "null"],
        description: "Optional market id to exclude, such as BTC-USD.",
      },
      includeActiveMarket: {
        type: ["boolean", "null"],
        description: "Whether to always include the active market in the scan set.",
      },
    },
    required: ["limit", "candidateCount", "excludeProductId", "includeActiveMarket"],
    additionalProperties: false,
  },
  async execute(args, context) {
    const opportunities = await scanMarketsForSetups({
      limit: args.limit ?? 5,
      candidateCount: args.candidateCount ?? 28,
      excludeProductId: args.excludeProductId ?? null,
      includeProductId: args.includeActiveMarket ? context.selection.activeProductId : null,
    });

    return {
      scannedAt: new Date().toISOString(),
      opportunities,
    };
  },
};
