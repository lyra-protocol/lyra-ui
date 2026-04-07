import { findTerminalCommandDefinition } from "@/core/terminal/registry";
import {
  NormalizedTerminalCommand,
  ResolvedTerminalCommand,
  TerminalCommandDefinition,
  TerminalResolutionContext,
} from "@/core/terminal/types";

export type TerminalResolutionResult =
  | { ok: true; definition: TerminalCommandDefinition; command: ResolvedTerminalCommand }
  | { ok: false; message: string };

export function resolveTerminalCommand(
  command: NormalizedTerminalCommand,
  context: TerminalResolutionContext
): TerminalResolutionResult {
  const definition = findTerminalCommandDefinition(command.command);
  if (!definition) {
    return { ok: false, message: `unknown command: ${command.command}` };
  }

  const resolved = definition.resolve(command, context);
  if (!resolved) {
    return { ok: false, message: `unable to resolve command: ${command.command}` };
  }

  return { ok: true, definition, command: resolved };
}
