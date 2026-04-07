import { getDisplaySymbol } from "@/core/market/display";
import { useWorkspaceStore } from "@/stores/workspace-store";

export type CommandPaletteAction = {
  id: string;
  label: string;
  description: string;
  command: string;
};

export function getCommandPaletteActions() {
  const workspace = useWorkspaceStore.getState();
  const activeSymbol = workspace.activeProductId
    ? getDisplaySymbol(workspace.activeProductId)
    : null;

  return [
    ...(activeSymbol
      ? [
          {
            id: "open-active",
            label: `Open ${activeSymbol}`,
            description: "Open the active market on the chart canvas.",
            command: `open ${activeSymbol} ${workspace.activeTimeframe}`,
          },
          {
            id: "watch-active",
            label: `Watch ${activeSymbol}`,
            description: "Add the active market to workspace memory.",
            command: `watch add ${activeSymbol}`,
          },
        ]
      : []),
    {
      id: "switch-4h",
      label: "Switch to 4h",
      description: "Change the active timeframe.",
      command: "switch 4h",
    },
    {
      id: "view-list",
      label: "List saved views",
      description: "Inspect saved workspace states.",
      command: "view list",
    },
    {
      id: "browse-open",
      label: "Open browse",
      description: "Open the browse rail in the sidebar.",
      command: "browse open",
    },
    {
      id: "terminal-expand",
      label: "Expand terminal",
      description: "Open the Lyra terminal drawer.",
      command: "terminal expand",
    },
    {
      id: "focus-chart",
      label: "Focus chart",
      description: "Move attention back to the market canvas.",
      command: "focus chart",
    },
  ] satisfies CommandPaletteAction[];
}
