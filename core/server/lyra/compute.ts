import "server-only";

export function getVercelComputeStats() {
  return {
    buckets: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    totalCycles: 0,
    totalTurns: 0,
    inputCostPerM: 0,
    outputCostPerM: 0,
    mode: "vercel",
  };
}
