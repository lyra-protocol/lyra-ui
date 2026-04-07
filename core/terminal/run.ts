import { resolveTerminalHelp } from "@/core/terminal/help";
import { formatTerminalOutput } from "@/core/terminal/format";
import { normalizeTerminalCommand } from "@/core/terminal/normalize";
import { parseTerminalCommand } from "@/core/terminal/parser";
import { executeResolvedTerminalCommand } from "@/core/terminal/execute";
import { resolveTerminalCommand } from "@/core/terminal/resolve";
import { validateTerminalCommand } from "@/core/terminal/validate";
import { TerminalExecutionResult } from "@/core/terminal/types";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useMarketCatalogStore } from "@/stores/market-catalog-store";
import { useWorkspaceEventStore } from "@/stores/workspace-event-store";

function buildError(message: string): TerminalExecutionResult {
  return { status: "error", message, events: [] };
}

export function runTerminalCommand(input: string, controls: {
  expandTerminal: () => void;
  collapseTerminal: () => void;
}) {
  const parsed = parseTerminalCommand(input);
  if (!parsed.command) {
    return buildError("type a command to continue");
  }

  const normalized = normalizeTerminalCommand(parsed);
  const workspace = useWorkspaceStore.getState();
  const markets = useMarketCatalogStore.getState().markets;
  const resolutionContext = {
    markets,
    workspace: {
      activeProductId: workspace.activeProductId,
      activeTimeframe: workspace.activeTimeframe,
      activeRailSection: workspace.activeRailSection,
      focusedRegion: workspace.focusedRegion,
      dataSource: workspace.dataSource,
      mode: workspace.mode,
      leftSidebarCollapsed: workspace.leftSidebarCollapsed,
      savedWorkspaces: workspace.savedWorkspaces,
      watchlistProductIds: workspace.watchlistProductIds,
      recentProductIds: workspace.recentProductIds,
    },
  };
  const helpResult = resolveTerminalHelp(normalized, resolutionContext);
  if (helpResult) {
    return formatTerminalOutput(helpResult);
  }

  const resolved = resolveTerminalCommand(normalized, resolutionContext);
  if (!resolved.ok) {
    return buildError(`${resolved.message}\nType help to see available commands.`);
  }

  const executionContext = {
    ...resolutionContext,
    expandTerminal: controls.expandTerminal,
    collapseTerminal: controls.collapseTerminal,
  };
  const validation = validateTerminalCommand(
    resolved.definition,
    resolved.command,
    executionContext
  );
  if (!validation.ok) {
    return buildError(validation.message);
  }

  const result = executeResolvedTerminalCommand(
    resolved.definition,
    resolved.command,
    executionContext
  );

  if (result.events.length > 0) {
    useWorkspaceEventStore.getState().emit(result.events);
  }

  return formatTerminalOutput(result);
}
