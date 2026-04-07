import { findTerminalCommandDefinition, terminalCommandRegistry } from "@/core/terminal/registry";
import {
  NormalizedTerminalCommand,
  TerminalExecutionResult,
  TerminalResolutionContext,
} from "@/core/terminal/types";

const HELP_SUMMARIES: Record<string, { summary: string; examples: string[] }> = {
  open: {
    summary: "Open a live market on the chart surface.",
    examples: ["open btc", "open eth 4h"],
  },
  switch: {
    summary: "Change the active timeframe.",
    examples: ["switch 15m", "switch 1d"],
  },
  watch: {
    summary: "Manage markets in workspace memory.",
    examples: ["watch add btc", "watch list"],
  },
  view: {
    summary: "Save, open, list, or delete workspace views.",
    examples: ["view save analyst", "view open analyst"],
  },
  sidebar: {
    summary: "Open or close the workspace sidebar.",
    examples: ["sidebar open", "sidebar close"],
  },
  browse: {
    summary: "Open or close the market browser mode.",
    examples: ["browse open", "browse close"],
  },
  terminal: {
    summary: "Expand or collapse the terminal surface.",
    examples: ["terminal expand", "terminal collapse"],
  },
  focus: {
    summary: "Move attention between core workspace regions.",
    examples: ["focus chart", "focus terminal"],
  },
};

function buildGeneralHelp(context: TerminalResolutionContext) {
  const examples = [
    "open btc 4h",
    "switch 15m",
    "watch add eth",
    "view save analyst",
    "browse open",
    "focus terminal",
  ];
  const commandLines = terminalCommandRegistry.map((definition) => `- ${definition.helpText}`);
  const marketHint = context.markets.length > 0 ? `Live markets loaded: ${context.markets.length}` : "Loading live markets";

  return [
    "Lyra terminal controls the workspace.",
    "",
    ...commandLines,
    "",
    `Examples: ${examples.join(" · ")}`,
    `${marketHint}. Press Tab to complete commands and market symbols.`,
    "Use Cmd/Ctrl + K or / for contextual intelligence.",
  ].join("\n");
}

function buildCommandHelp(commandName: string) {
  const definition = findTerminalCommandDefinition(commandName);
  if (!definition) {
    return `unknown help topic: ${commandName}\nType help to see available commands.`;
  }

  const details = HELP_SUMMARIES[definition.name];
  const lines = [definition.helpText];
  if (details?.summary) {
    lines.push(details.summary);
  }
  if (details?.examples.length) {
    lines.push(`Examples: ${details.examples.join(" · ")}`);
  }
  return lines.join("\n");
}

export function resolveTerminalHelp(
  command: NormalizedTerminalCommand,
  context: TerminalResolutionContext
): TerminalExecutionResult | null {
  const wantsGenericHelp = ["help", "--help", "-h"].includes(command.command);
  const wantsCommandHelp = ["--help", "-h"].includes(command.args.at(-1) ?? "");

  if (!wantsGenericHelp && !wantsCommandHelp) {
    return null;
  }

  const topic = wantsGenericHelp ? command.args[0] : command.command;

  return {
    status: "info",
    message: topic ? buildCommandHelp(topic) : buildGeneralHelp(context),
    events: [],
  };
}
