import { getPaperWorkspaceContext } from "@/core/server/services/paper-workspace-service";
import { AiToolDefinition } from "@/core/server/ai/tools/types";

type Args = {
  productId?: string;
};

export const getCurrentPositionTool: AiToolDefinition<Args> = {
  name: "get_current_position",
  description: "Return the current open position for the active market or a specified market.",
  parameters: {
    type: "object",
    properties: {
      productId: {
        type: ["string", "null"],
        description: "Market id. Use null to default to the active market.",
      },
    },
    required: ["productId"],
    additionalProperties: false,
  },
  async execute(args, context) {
    const productId = args.productId || context.selection.activeProductId;
    const workspace = await getPaperWorkspaceContext(context.identitySeed);

    return {
      productId,
      position: workspace.positions.find((item) => item.productId === productId) ?? null,
    };
  },
};
