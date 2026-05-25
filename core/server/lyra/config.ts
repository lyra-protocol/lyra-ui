import "server-only";

export type LyraAgentMode = "auto" | "proxy" | "vercel";

function readEnv(key: string): string {
  return process.env[key]?.trim() || "";
}

function readNumber(key: string, fallback: number): number {
  const raw = readEnv(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(key: string, fallback: boolean): boolean {
  const raw = readEnv(key).toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, "");
}

function readMode(): LyraAgentMode {
  const raw = readEnv("LYRA_AGENT_MODE").toLowerCase();
  if (raw === "proxy" || raw === "vercel") return raw;
  return "auto";
}

export function getLyraAgentConfig() {
  const mode = readMode();
  const upstreamUrl = normalizeOrigin(readEnv("LYRA_AGENT_URL"));

  return {
    mode,
    upstreamUrl,
    model: readEnv("LYRA_AGENT_MODEL") || readEnv("AZURE_OPENAI_MODEL") || "lyra-serverless",
    testnet: readBoolean("LYRA_HL_TESTNET", true),
    hlAddress: readEnv("LYRA_HL_ADDRESS") || readEnv("LYRA_TESTNET_WALLET_ADDRESS") || null,
    scanIntervalMs: readNumber("LYRA_SCAN_INTERVAL_MS", 120_000),
    maxPositions: readNumber("LYRA_MAX_POSITIONS", 2),
    maxPositionUsd: readNumber("LYRA_MAX_POSITION_USD", 100),
    maxLeverage: readNumber("LYRA_MAX_LEVERAGE", 5),
    computeCostDailyUsd: readNumber("LYRA_COMPUTE_COST_DAILY_USD", 0),
    dailyTargetUsd: readNumber("LYRA_DAILY_TARGET_USD", 5),
    paperEquityUsd: readNumber("LYRA_AGENT_PAPER_EQUITY_USD", 10_000),
    bornAt: readEnv("LYRA_AGENT_BORN_AT") || new Date().toISOString(),
    upstreamTimeoutMs: readNumber("LYRA_AGENT_UPSTREAM_TIMEOUT_MS", 2_500),
  } as const;
}

export function shouldTryAgentProxy(): boolean {
  const config = getLyraAgentConfig();
  return config.mode !== "vercel" && Boolean(config.upstreamUrl);
}
