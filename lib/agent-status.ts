export type AgentConstraints = {
  maxPositions: number;
  maxPositionUsd: number;
  maxLeverage: number;
};

export type AgentStatus = {
  running: boolean;
  model?: string;
  testnet?: boolean;
  hlAddress?: string | null;
  scanIntervalMs?: number;
  constraints: AgentConstraints;
  economy?: { computeCostDailyUsd: number; dailyTargetUsd: number };
};

/** Agent /status payload — rejects unreachable-agent fallbacks missing constraints. */
export function parseAgentStatus(data: unknown): AgentStatus | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const c = row.constraints;
  if (!c || typeof c !== "object") return null;
  const constraints = c as Record<string, unknown>;
  if (
    typeof constraints.maxPositionUsd !== "number" ||
    typeof constraints.maxPositions !== "number" ||
    typeof constraints.maxLeverage !== "number"
  ) {
    return null;
  }
  return {
    running: row.running === true,
    model: typeof row.model === "string" ? row.model : undefined,
    testnet: row.testnet === true,
    hlAddress: typeof row.hlAddress === "string" ? row.hlAddress : row.hlAddress === null ? null : undefined,
    scanIntervalMs: typeof row.scanIntervalMs === "number" ? row.scanIntervalMs : undefined,
    constraints: {
      maxPositionUsd: constraints.maxPositionUsd,
      maxPositions: constraints.maxPositions,
      maxLeverage: constraints.maxLeverage,
    },
    economy:
      row.economy && typeof row.economy === "object"
        ? (row.economy as AgentStatus["economy"])
        : undefined,
  };
}
