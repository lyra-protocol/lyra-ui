import { getPaperWorkspaceContext } from "@/core/server/services/paper-workspace-service";
import { AiToolDefinition } from "@/core/server/ai/tools/types";

type Args = {
  limit?: number;
};

export const getCurrentTradesTool: AiToolDefinition<Args> = {
  name: "get_current_trades",
  description:
    "Return the user's current open positions and most recent paper trades across the workspace.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: ["number", "null"],
        minimum: 1,
        maximum: 20,
        description: "Maximum recent trades to return. Use null for the default limit.",
      },
    },
    required: ["limit"],
    additionalProperties: false,
  },
  async execute(args, context) {
    const workspace = await getPaperWorkspaceContext(context.identitySeed);
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 8), 1), 20);

    return {
      openPositions: workspace.positions,
      recentTrades: workspace.trades.slice(0, limit),
      cashBalance: workspace.account?.cashBalance ?? null,
      realizedPnl: workspace.account?.realizedPnl ?? null,
    };
  },
};
