import type { ResponseFunctionToolCall } from "openai/resources/responses/responses";
import { getCurrentPositionTool } from "@/core/server/ai/tools/get-current-position-tool";
import { getCurrentTradesTool } from "@/core/server/ai/tools/get-current-trades-tool";
import { getMarketSnapshotTool } from "@/core/server/ai/tools/get-market-snapshot-tool";
import { getMultiTimeframeHistoryTool } from "@/core/server/ai/tools/get-multi-timeframe-history-tool";
import { getRecentActivityTool } from "@/core/server/ai/tools/get-recent-activity-tool";
import { getWorkspaceStateTool } from "@/core/server/ai/tools/get-workspace-state-tool";
import { scanMarketsForSetupsTool } from "@/core/server/ai/tools/scan-markets-for-setups-tool";
import { searchPublicWebTool } from "@/core/server/ai/tools/search-public-web-tool";
import { searchThreadMemoryTool } from "@/core/server/ai/tools/search-thread-memory-tool";
import { AiFunctionTool, AiToolDefinition, AiToolExecutionContext } from "@/core/server/ai/tools/types";

const TOOL_DEFINITIONS = [
  getWorkspaceStateTool as AiToolDefinition<Record<string, unknown>>,
  getMarketSnapshotTool as AiToolDefinition<Record<string, unknown>>,
  getMultiTimeframeHistoryTool as AiToolDefinition<Record<string, unknown>>,
  getRecentActivityTool as AiToolDefinition<Record<string, unknown>>,
  getCurrentPositionTool as AiToolDefinition<Record<string, unknown>>,
  getCurrentTradesTool as AiToolDefinition<Record<string, unknown>>,
  scanMarketsForSetupsTool as AiToolDefinition<Record<string, unknown>>,
  searchPublicWebTool as AiToolDefinition<Record<string, unknown>>,
  searchThreadMemoryTool as AiToolDefinition<Record<string, unknown>>,
];

function buildFunctionTool(tool: AiToolDefinition): AiFunctionTool {
  return {
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: true,
  };
}

function parseToolArguments(raw: string) {
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Model returned invalid tool arguments.");
  }
}

export function getAiFunctionTools() {
  return TOOL_DEFINITIONS.map(buildFunctionTool);
}

export async function executeAiToolCall(
  call: ResponseFunctionToolCall,
  context: AiToolExecutionContext
) {
  const tool = TOOL_DEFINITIONS.find((item) => item.name === call.name);
  if (!tool) {
    throw new Error(`Unknown AI tool: ${call.name}`);
  }

  const args = parseToolArguments(call.arguments);
  const result = await tool.execute(args, context);

  return {
    tool,
    args,
    result,
  };
}
