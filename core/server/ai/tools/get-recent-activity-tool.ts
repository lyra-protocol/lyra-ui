import { AiToolDefinition } from "@/core/server/ai/tools/types";

type Args = {
  productId?: string;
  limit?: number;
};

export const getRecentActivityTool: AiToolDefinition<Args> = {
  name: "get_recent_activity",
  description: "Return recent workspace activity for the active market or a specified market.",
  parameters: {
    type: "object",
    properties: {
      productId: {
        type: ["string", "null"],
        description: "Market id. Use null to default to the active market.",
      },
      limit: {
        type: ["number", "null"],
        minimum: 1,
        maximum: 20,
        description: "Maximum items to return. Use null for the default limit.",
      },
    },
    required: ["productId", "limit"],
    additionalProperties: false,
  },
  async execute(args, context) {
    const productId = args.productId || context.selection.activeProductId;
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 8), 1), 20);

    return {
      productId,
      items: context.context.recentActivity
        .filter((item) => !item.productId || item.productId === productId)
        .slice(0, limit),
    };
  },
};
