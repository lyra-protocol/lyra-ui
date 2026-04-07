import { TerminalCommandDefinition, TerminalExecutionResult } from "@/core/terminal/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

export const focusCommandDefinitions: TerminalCommandDefinition[] = [
  {
    name: "focus",
    aliases: [],
    helpText: "focus chart | focus browse | focus terminal",
    resolve(command) {
      return {
        commandName: "focus",
        action: `focus_${command.args[0] ?? "unknown"}`,
        subcommand: command.args[0],
      };
    },
    validate(command) {
      if (!["chart", "browse", "terminal"].includes(command.subcommand ?? "")) {
        return { ok: false, message: "focus requires chart, browse, or terminal" };
      }
      return { ok: true };
    },
    execute(command, context): TerminalExecutionResult {
      const workspace = useWorkspaceStore.getState();
      if (command.subcommand === "chart") {
        workspace.setFocusedRegion("canvas");
      }
      if (command.subcommand === "browse") {
        workspace.openLeftSidebar();
        workspace.setActiveRailSection("browse");
        workspace.setFocusedRegion("sidebar");
      }
      if (command.subcommand === "terminal") {
        context.expandTerminal();
        workspace.setFocusedRegion("shell");
      }
      const region = command.subcommand === "chart" ? "canvas" : command.subcommand === "browse" ? "sidebar" : "shell";
      return {
        status: "success" as const,
        message: `focused ${command.subcommand}`,
        events: [{ type: "focus/changed", detail: { region } }],
      };
    },
  },
];
