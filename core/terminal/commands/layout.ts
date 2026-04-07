import { TerminalCommandDefinition, TerminalExecutionResult } from "@/core/terminal/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

export const layoutCommandDefinitions: TerminalCommandDefinition[] = [
  {
    name: "sidebar",
    aliases: [],
    helpText: "sidebar open | sidebar close",
    resolve(command) {
      return {
        commandName: "sidebar",
        action: `sidebar_${command.args[0] ?? "unknown"}`,
        subcommand: command.args[0],
      };
    },
    validate(command) {
      if (!["open", "close"].includes(command.subcommand ?? "")) {
        return { ok: false, message: "sidebar requires open or close" };
      }
      return { ok: true };
    },
    execute(command): TerminalExecutionResult {
      const workspace = useWorkspaceStore.getState();
      if (command.subcommand === "open") {
        workspace.openLeftSidebar();
      } else {
        workspace.collapseLeftSidebar();
      }
      return {
        status: "success" as const,
        message: command.subcommand === "open" ? "sidebar opened" : "sidebar closed",
        events: [{ type: "layout/changed", detail: { target: "sidebar", state: command.subcommand } }],
      };
    },
  },
  {
    name: "browse",
    aliases: [],
    helpText: "browse open | browse close",
    resolve(command) {
      return {
        commandName: "browse",
        action: `browse_${command.args[0] ?? "unknown"}`,
        subcommand: command.args[0],
      };
    },
    validate(command) {
      if (!["open", "close"].includes(command.subcommand ?? "")) {
        return { ok: false, message: "browse requires open or close" };
      }
      return { ok: true };
    },
    execute(command): TerminalExecutionResult {
      const workspace = useWorkspaceStore.getState();
      if (command.subcommand === "open") {
        workspace.setActiveRailSection("browse");
        workspace.openLeftSidebar();
        workspace.setFocusedRegion("sidebar");
      } else {
        workspace.setActiveRailSection("memory");
        workspace.setFocusedRegion("canvas");
      }
      return {
        status: "success" as const,
        message: command.subcommand === "open" ? "browse opened" : "browse closed",
        events: [
          { type: "layout/changed", detail: { target: "browse", state: command.subcommand } },
          { type: "focus/changed", detail: { region: command.subcommand === "open" ? "sidebar" : "canvas" } },
        ],
      };
    },
  },
  {
    name: "terminal",
    aliases: ["shell"],
    helpText: "terminal expand | terminal collapse",
    resolve(command) {
      return {
        commandName: "terminal",
        action: `terminal_${command.args[0] ?? "unknown"}`,
        subcommand: command.args[0],
      };
    },
    validate(command) {
      if (!["expand", "collapse"].includes(command.subcommand ?? "")) {
        return { ok: false, message: "terminal requires expand or collapse" };
      }
      return { ok: true };
    },
    execute(command, context): TerminalExecutionResult {
      const workspace = useWorkspaceStore.getState();
      if (command.subcommand === "expand") {
        context.expandTerminal();
        workspace.setFocusedRegion("shell");
      } else {
        context.collapseTerminal();
        workspace.setFocusedRegion("canvas");
      }
      return {
        status: "success" as const,
        message: command.subcommand === "expand" ? "terminal expanded" : "terminal collapsed",
        events: [
          { type: command.subcommand === "expand" ? "terminal/expanded" : "terminal/collapsed" },
          { type: "focus/changed", detail: { region: command.subcommand === "expand" ? "shell" : "canvas" } },
        ],
      };
    },
  },
];
