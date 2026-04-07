import { resolveMarketTarget } from "@/core/terminal/market-resolver";
import { TerminalCommandDefinition, TerminalExecutionResult } from "@/core/terminal/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

function listWatchlist(markets: Parameters<typeof resolveMarketTarget>[1]): TerminalExecutionResult {
  const workspace = useWorkspaceStore.getState();

  if (workspace.watchlistProductIds.length === 0) {
    return { status: "info" as const, message: "watchlist is empty", events: [] };
  }

  const labels = workspace.watchlistProductIds.map((productId) => {
    const market = markets.find((entry) => entry.id === productId);
    return market?.symbol ?? productId;
  });

  return {
    status: "info" as const,
    message: `watchlist: ${labels.join(", ")}`,
    events: [],
  };
}

export const watchCommandDefinitions: TerminalCommandDefinition[] = [
  {
    name: "watch",
    aliases: ["watchlist"],
    helpText: "watch add <symbol> | watch remove <symbol> | watch list",
    resolve(command, context) {
      const subcommand = command.args[0];
      const target = command.args[1];

      return {
        commandName: "watch",
        action: `watch_${subcommand ?? "unknown"}`,
        subcommand,
        rawTarget: target,
        market: target ? (resolveMarketTarget(target, context.markets) ?? undefined) : undefined,
      };
    },
    validate(command) {
      if (!["add", "remove", "list"].includes(command.subcommand ?? "")) {
        return { ok: false, message: "watch requires add, remove, or list" };
      }
      if (command.subcommand === "list") {
        return { ok: true };
      }
      if (!command.rawTarget) {
        return { ok: false, message: "missing market symbol" };
      }
      if (!command.market) {
        return { ok: false, message: `unknown symbol: ${command.rawTarget}` };
      }
      return { ok: true };
    },
    execute(command, context): TerminalExecutionResult {
      if (command.subcommand === "list") {
        return listWatchlist(context.markets);
      }

      const productId = command.market?.id ?? "";
      const symbol = command.market?.symbol ?? productId;
      const workspace = useWorkspaceStore.getState();
      const hasMarket = workspace.watchlistProductIds.includes(productId);

      if (command.subcommand === "add" && hasMarket) {
        return { status: "info" as const, message: `${symbol} is already in watchlist`, events: [] };
      }
      if (command.subcommand === "remove" && !hasMarket) {
        return { status: "info" as const, message: `${symbol} is not in watchlist`, events: [] };
      }

      useWorkspaceStore.setState((state) => ({
        watchlistProductIds:
          command.subcommand === "add"
            ? [productId, ...state.watchlistProductIds].slice(0, 24)
            : state.watchlistProductIds.filter((id) => id !== productId),
      }));

      return {
        status: "success" as const,
        message: `${command.subcommand === "add" ? "added" : "removed"} ${symbol} ${
          command.subcommand === "add" ? "to" : "from"
        } watchlist`,
        productId,
        events: [
          {
            type: "watchlist/updated",
            detail: { action: command.subcommand ?? "", productId },
          },
        ],
      };
    },
  },
];
