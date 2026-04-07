import {
  ResolvedTerminalCommand,
  TerminalCommandDefinition,
  TerminalExecutionContext,
  TerminalValidationResult,
} from "@/core/terminal/types";

export function validateTerminalCommand(
  definition: TerminalCommandDefinition,
  command: ResolvedTerminalCommand,
  context: TerminalExecutionContext
): TerminalValidationResult {
  return definition.validate(command, context);
}
