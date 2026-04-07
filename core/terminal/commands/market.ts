import { isMarketTimeframe } from "@/core/market/timeframes";
import { resolveMarketTarget } from "@/core/terminal/market-resolver";
import {
  ResolvedTerminalCommand,
  TerminalCommandDefinition,
  TerminalExecutionContext,
  TerminalExecutionResult,
} from "@/core/terminal/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

function openMarket(
  command: ResolvedTerminalCommand,
  context: TerminalExecutionContext
): TerminalExecutionResult {
  const timeframe = command.timeframe ?? context.workspace.activeTimeframe;
  const productId = command.market?.id ?? "";
  const workspace = useWorkspaceStore.getState();

  workspace.setActiveProductId(productId);
  workspace.setActiveTimeframe(timeframe);
  workspace.setFocusedRegion("canvas");

  return {
    status: "success" as const,
    message: `opened ${command.market?.symbol ?? productId} on ${timeframe}`,
    productId,
    timeframe,
    events: [
      { type: "market/opened", detail: { productId } },
      { type: "timeframe/changed", detail: { timeframe } },
      { type: "focus/changed", detail: { region: "canvas" } },
    ],
  };
}

export const marketCommandDefinitions: TerminalCommandDefinition[] = [
  {
    name: "open",
    aliases: ["chart"],
    helpText: "open <symbol> [timeframe]",
    resolve(command, context) {
      return {
        commandName: "open",
        action: "open_market",
        rawTarget: command.args[0],
        rawTimeframe: command.args[1],
        market: command.args[0] ? (resolveMarketTarget(command.args[0], context.markets) ?? undefined) : undefined,
        timeframe: command.args[1] && isMarketTimeframe(command.args[1]) ? command.args[1] : undefined,
      };
    },
    validate(command) {
      if (!command.rawTarget) {
        return { ok: false, message: "missing market symbol" };
      }
      if (!command.market) {
        return { ok: false, message: `unknown symbol: ${command.rawTarget}` };
      }
      if (command.rawTimeframe && !command.timeframe) {
        return { ok: false, message: `unsupported timeframe: ${command.rawTimeframe}` };
      }
      return { ok: true };
    },
    execute: openMarket,
  },
  {
    name: "switch",
    aliases: ["timeframe", "tf"],
    helpText: "switch <timeframe>",
    resolve(command) {
      return {
        commandName: "switch",
        action: "switch_timeframe",
        rawTimeframe: command.args[0],
        timeframe: command.args[0] && isMarketTimeframe(command.args[0]) ? command.args[0] : undefined,
      };
    },
    validate(command) {
      if (!command.rawTimeframe) {
        return { ok: false, message: "missing timeframe" };
      }
      if (!command.timeframe) {
        return { ok: false, message: `unsupported timeframe: ${command.rawTimeframe}` };
      }
      return { ok: true };
    },
    execute(command): TerminalExecutionResult {
      const workspace = useWorkspaceStore.getState();
      const timeframe = command.timeframe ?? workspace.activeTimeframe;

      workspace.setActiveTimeframe(timeframe);
      workspace.setFocusedRegion("canvas");

      return {
        status: "success" as const,
        message: `switched timeframe to ${timeframe}`,
        timeframe,
        events: [
          { type: "timeframe/changed", detail: { timeframe } },
          { type: "focus/changed", detail: { region: "canvas" } },
        ],
      };
    },
  },
];
