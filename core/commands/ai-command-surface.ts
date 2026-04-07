import { getDisplaySymbol } from "@/core/market/display";
import { useWorkspaceStore } from "@/stores/workspace-store";

export type AiCommandSurfaceAction = {
  id: string;
  slash: string;
  label: string;
  description: string;
  prompt: string;
};

export function getAiCommandSurfaceActions() {
  const workspace = useWorkspaceStore.getState();
  const activeSymbol = workspace.activeProductId
    ? getDisplaySymbol(workspace.activeProductId)
    : "the current market";
  const timeframe = workspace.activeTimeframe;

  return [
    {
      id: "ai-analyze",
      slash: "/analyze",
      label: "Analyze market",
      description: `Review ${activeSymbol} on ${timeframe} using current workspace context.`,
      prompt: `Analyze ${activeSymbol} on ${timeframe}. Focus on the current market structure, recent movement, and what matters now in this workspace.`,
    },
    {
      id: "ai-move",
      slash: "/move",
      label: "Explain recent move",
      description: `Explain what changed recently in ${activeSymbol}.`,
      prompt: `Explain the recent price movement in ${activeSymbol} on ${timeframe}. Keep it concise and grounded in current market context.`,
    },
    {
      id: "ai-position",
      slash: "/position",
      label: "Evaluate position",
      description: "Review the current position, risk, and what deserves attention.",
      prompt: `Evaluate my current position in ${activeSymbol} on ${timeframe}. Use my workspace context and highlight the main risk and implication.`,
    },
    {
      id: "ai-activity",
      slash: "/activity",
      label: "Summarize activity",
      description: "Summarize recent trades and workspace activity.",
      prompt: `Summarize my recent workspace activity and recent trades for ${activeSymbol}. Keep it short and actionable.`,
    },
  ] satisfies AiCommandSurfaceAction[];
}
