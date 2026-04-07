import { ParsedTerminalCommand } from "@/core/terminal/types";

export function parseTerminalCommand(raw: string): ParsedTerminalCommand {
  const value = raw.trim();
  const tokens = value.split(/\s+/).filter(Boolean);

  return {
    raw,
    tokens,
    command: tokens[0] ?? "",
    args: tokens.slice(1),
  };
}
