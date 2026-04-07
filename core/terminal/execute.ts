import {
  ResolvedTerminalCommand,
  TerminalCommandDefinition,
  TerminalExecutionContext,
  TerminalExecutionResult,
} from "@/core/terminal/types";

export function executeResolvedTerminalCommand(
  definition: TerminalCommandDefinition,
  command: ResolvedTerminalCommand,
  context: TerminalExecutionContext
): TerminalExecutionResult {
  return definition.execute(command, context);
}
