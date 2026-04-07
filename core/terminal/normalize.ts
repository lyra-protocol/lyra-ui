import { NormalizedTerminalCommand, ParsedTerminalCommand } from "@/core/terminal/types";

const TIMEFRAME_ALIASES: Record<string, string> = {
  "15min": "15m",
  "15mins": "15m",
  "15minute": "15m",
  "15minutes": "15m",
  "1hr": "1h",
  "1hour": "1h",
  "1hours": "1h",
  "4hr": "4h",
  "4hour": "4h",
  "4hours": "4h",
  day: "1d",
  daily: "1d",
  "1day": "1d",
  "1days": "1d",
};

function normalizeToken(token: string) {
  const lowered = token.trim().toLowerCase();
  return TIMEFRAME_ALIASES[lowered] ?? lowered;
}

export function normalizeTerminalCommand(
  command: ParsedTerminalCommand
): NormalizedTerminalCommand {
  return {
    ...command,
    command: normalizeToken(command.command),
    args: command.args.map(normalizeToken),
  };
}
