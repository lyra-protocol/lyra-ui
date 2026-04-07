import { focusCommandDefinitions } from "@/core/terminal/commands/focus";
import { layoutCommandDefinitions } from "@/core/terminal/commands/layout";
import { marketCommandDefinitions } from "@/core/terminal/commands/market";
import { viewCommandDefinitions } from "@/core/terminal/commands/view";
import { watchCommandDefinitions } from "@/core/terminal/commands/watch";
import { TerminalCommandDefinition } from "@/core/terminal/types";

export const terminalCommandRegistry: TerminalCommandDefinition[] = [
  ...marketCommandDefinitions,
  ...watchCommandDefinitions,
  ...viewCommandDefinitions,
  ...layoutCommandDefinitions,
  ...focusCommandDefinitions,
];

export function findTerminalCommandDefinition(name: string) {
  const normalized = name.trim().toLowerCase();
  return terminalCommandRegistry.find(
    (definition) =>
      definition.name === normalized || definition.aliases.some((alias) => alias === normalized)
  );
}
