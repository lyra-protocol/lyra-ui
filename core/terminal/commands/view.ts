import { TerminalCommandDefinition, TerminalExecutionResult } from "@/core/terminal/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

function normalizeViewName(value: string) {
  return value.trim().toLowerCase();
}

export const viewCommandDefinitions: TerminalCommandDefinition[] = [
  {
    name: "view",
    aliases: ["views"],
    helpText: "view save <name> | view open <name> | view list | view delete <name>",
    resolve(command) {
      return {
        commandName: "view",
        action: `view_${command.args[0] ?? "unknown"}`,
        subcommand: command.args[0],
        viewName: command.args.slice(1).join(" ").trim(),
      };
    },
    validate(command, context) {
      if (!["save", "open", "list", "delete"].includes(command.subcommand ?? "")) {
        return { ok: false, message: "view requires save, open, list, or delete" };
      }
      if (command.subcommand === "list") {
        return { ok: true };
      }
      if (!command.viewName) {
        return { ok: false, message: "missing view name" };
      }
      if (command.subcommand === "save" && !context.workspace.activeProductId) {
        return { ok: false, message: "no active market to save" };
      }
      if (
        ["open", "delete"].includes(command.subcommand ?? "") &&
        !context.workspace.savedWorkspaces.some(
          (workspace) => normalizeViewName(workspace.name) === normalizeViewName(command.viewName ?? "")
        )
      ) {
        return { ok: false, message: `unknown view: ${command.viewName}` };
      }
      return { ok: true };
    },
    execute(command, context): TerminalExecutionResult {
      if (command.subcommand === "list") {
        if (context.workspace.savedWorkspaces.length === 0) {
          return { status: "info" as const, message: "no saved views", events: [] };
        }
        return {
          status: "info" as const,
          message: `views: ${context.workspace.savedWorkspaces.map((view) => view.name).join(", ")}`,
          events: [],
        };
      }

      const workspace = useWorkspaceStore.getState();
      const matchingView = workspace.savedWorkspaces.find(
        (view) => normalizeViewName(view.name) === normalizeViewName(command.viewName ?? "")
      );

      if (command.subcommand === "save") {
        const now = new Date().toISOString();
        const nextView = {
          id: matchingView?.id ?? `workspace-${Date.now()}`,
          name: command.viewName ?? "",
          productId: workspace.activeProductId,
          timeframe: workspace.activeTimeframe,
          updatedAt: now,
        };

        useWorkspaceStore.setState((state) => ({
          activeWorkspaceId: nextView.id,
          savedWorkspaces: [nextView, ...state.savedWorkspaces.filter((view) => view.id !== nextView.id)].slice(0, 12),
        }));

        return {
          status: "success" as const,
          message: `saved view ${nextView.name}`,
          productId: nextView.productId,
          timeframe: nextView.timeframe,
          events: [{ type: "view/saved", detail: { name: nextView.name } }],
        };
      }

      if (command.subcommand === "open" && matchingView) {
        workspace.openSavedWorkspace(matchingView.id);
        workspace.setFocusedRegion("canvas");
        return {
          status: "success" as const,
          message: `opened view ${matchingView.name}`,
          productId: matchingView.productId,
          timeframe: matchingView.timeframe,
          events: [
            { type: "view/opened", detail: { name: matchingView.name } },
            { type: "focus/changed", detail: { region: "canvas" } },
          ],
        };
      }

      useWorkspaceStore.setState((state) => ({
        activeWorkspaceId: state.activeWorkspaceId === matchingView?.id ? null : state.activeWorkspaceId,
        savedWorkspaces: state.savedWorkspaces.filter((view) => view.id !== matchingView?.id),
      }));

      return {
        status: "success" as const,
        message: `deleted view ${matchingView?.name ?? command.viewName}`,
        events: [{ type: "view/deleted", detail: { name: matchingView?.name ?? command.viewName } }],
      };
    },
  },
];
