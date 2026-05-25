import "server-only";

import { getLyraAgentConfig } from "@/core/server/lyra/config";
import type { LyraAgentStatus } from "@/core/server/lyra/types";

export function getVercelAgentStatus(reachable = false): LyraAgentStatus {
  const config = getLyraAgentConfig();

  return {
    running: true,
    model: config.model,
    testnet: config.testnet,
    hlAddress: config.hlAddress,
    scanIntervalMs: config.scanIntervalMs,
    constraints: {
      maxPositions: config.maxPositions,
      maxPositionUsd: config.maxPositionUsd,
      maxLeverage: config.maxLeverage,
    },
    economy: {
      computeCostDailyUsd: config.computeCostDailyUsd,
      dailyTargetUsd: config.dailyTargetUsd,
    },
    mode: "vercel",
    reachable,
  };
}
