import { AiToolDefinition } from "@/core/server/ai/tools/types";

export const getWorkspaceStateTool: AiToolDefinition = {
  name: "get_workspace_state",
  description: "Return current Lyra workspace context including account state, active market, active position, recent trades, and recent activity.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
  async execute(_, context) {
    return {
      selection: context.context.selection,
      account: context.context.account,
      market: context.context.market,
      activePosition: context.context.activePosition,
      openPositions: context.context.openPositions,
      recentTrades: context.context.recentTrades,
      recentActivity: context.context.recentActivity,
      recordSyncStatus: context.context.recordSyncStatus,
    };
  },
};
