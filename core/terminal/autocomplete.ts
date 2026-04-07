import { TIMEFRAMES } from "@/core/market/timeframes";
import { normalizeTerminalCommand } from "@/core/terminal/normalize";
import { parseTerminalCommand } from "@/core/terminal/parser";
import { TerminalResolutionContext } from "@/core/terminal/types";

const ROOT_COMMANDS = ["help", "open", "switch", "watch", "view", "sidebar", "browse", "terminal", "focus"];

const SUBCOMMANDS: Partial<Record<string, string[]>> = {
  watch: ["add", "remove", "list"],
  view: ["save", "open", "list", "delete"],
  sidebar: ["open", "close"],
  browse: ["open", "close"],
  terminal: ["expand", "collapse"],
  focus: ["chart", "browse", "terminal"],
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function matchPrefix(values: string[], partial: string) {
  const normalized = partial.toLowerCase();
  return unique(values.filter((value) => value.toLowerCase().startsWith(normalized))).slice(0, 8);
}

function matchMarkets(partial: string, context: TerminalResolutionContext) {
  const normalized = partial.trim().toLowerCase();
  return unique(
    context.markets
      .map((market) => market.symbol)
      .filter((symbol) => symbol.toLowerCase().startsWith(normalized))
  ).slice(0, 8);
}

function matchViews(partial: string, context: TerminalResolutionContext) {
  const normalized = partial.trim().toLowerCase();
  return unique(
    context.workspace.savedWorkspaces
      .map((view) => view.name)
      .filter((name) => name.toLowerCase().startsWith(normalized))
  ).slice(0, 8);
}

function getCommonPrefix(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  return values.reduce((prefix, value) => {
    let index = 0;
    while (index < prefix.length && index < value.length && prefix[index] === value[index]) {
      index += 1;
    }
    return prefix.slice(0, index);
  });
}

function replaceToken(input: string, replacement: string) {
  const trailingSpace = /\s$/.test(input);
  const tokens = input.trimStart().split(/\s+/).filter(Boolean);
  const leadingWhitespace = input.match(/^\s*/)?.[0] ?? "";

  if (trailingSpace || tokens.length === 0) {
    return `${leadingWhitespace}${[...tokens, replacement].join(" ")} `;
  }

  tokens[tokens.length - 1] = replacement;
  return `${leadingWhitespace}${tokens.join(" ")}`;
}

export function getTerminalSuggestions(input: string, context: TerminalResolutionContext) {
  const raw = input.trimStart();
  const trailingSpace = /\s$/.test(input);
  const parsed = normalizeTerminalCommand(parseTerminalCommand(raw));

  if (!parsed.command) {
    return ROOT_COMMANDS.slice(0, 6);
  }

  if (parsed.command === "help" || parsed.command === "--help" || parsed.command === "-h") {
    return matchPrefix(ROOT_COMMANDS, parsed.args[0] ?? "");
  }

  if (parsed.tokens.length === 1 && !trailingSpace) {
    return matchPrefix(ROOT_COMMANDS, parsed.command);
  }

  if (parsed.command === "open") {
    if (parsed.args.length === 0 || (parsed.args.length === 1 && !trailingSpace)) {
      return matchMarkets(parsed.args[0] ?? "", context);
    }
    if (parsed.args.length === 1 || (parsed.args.length === 2 && !trailingSpace)) {
      return matchPrefix(
        TIMEFRAMES.map((item) => item.id),
        parsed.args[1] ?? ""
      );
    }
  }

  if (parsed.command === "switch") {
    return matchPrefix(
      TIMEFRAMES.map((item) => item.id),
      parsed.args[0] ?? ""
    );
  }

  if (parsed.command === "watch" || parsed.command === "view" || parsed.command === "sidebar" || parsed.command === "browse" || parsed.command === "terminal" || parsed.command === "focus") {
    const subcommands = SUBCOMMANDS[parsed.command] ?? [];
    if (parsed.args.length === 0 || (parsed.args.length === 1 && !trailingSpace)) {
      return matchPrefix(subcommands, parsed.args[0] ?? "");
    }

    if (parsed.command === "watch" && ["add", "remove"].includes(parsed.args[0] ?? "")) {
      return matchMarkets(parsed.args[1] ?? "", context);
    }

    if (parsed.command === "view" && ["open", "delete"].includes(parsed.args[0] ?? "")) {
      return matchViews(parsed.args.slice(1).join(" "), context);
    }
  }

  return [];
}

export function autocompleteTerminalInput(input: string, context: TerminalResolutionContext) {
  const suggestions = getTerminalSuggestions(input, context);
  if (suggestions.length === 0) {
    return { nextInput: input, suggestions };
  }

  const raw = input.trimStart();
  const parsed = normalizeTerminalCommand(parseTerminalCommand(raw));
  const currentToken = /\s$/.test(input) ? "" : parsed.tokens.at(-1) ?? "";

  if (suggestions.length === 1) {
    return { nextInput: replaceToken(input, suggestions[0]), suggestions };
  }

  const sharedPrefix = getCommonPrefix(suggestions);
  if (sharedPrefix && sharedPrefix.length > currentToken.length) {
    return { nextInput: replaceToken(input, sharedPrefix), suggestions };
  }

  return { nextInput: input, suggestions };
}
