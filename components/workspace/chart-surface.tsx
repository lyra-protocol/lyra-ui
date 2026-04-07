"use client";

import { useMemo } from "react";
import { AiContextOverlay } from "@/components/ai/ai-context-overlay";
import { LiveMarketChart } from "@/components/workspace/live-market-chart";
import { PositionChartOverlay } from "@/components/workspace/position-chart-overlay";
import { getChartTradePosition } from "@/core/paper/chart-position";
import { usePaperPositions } from "@/hooks/use-paper-positions";
import { usePaperTradeDraftStore } from "@/stores/paper-trade-draft-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function ChartSurface() {
  const { activeProductId, activeTimeframe, activeMarketSnapshot } = useWorkspaceStore();
  const positions = usePaperPositions();
  const draft = usePaperTradeDraftStore((state) => state.drafts[activeProductId] ?? null);
  const activePosition = useMemo(
    () => positions.find((position) => position.productId === activeProductId) ?? null,
    [activeProductId, positions]
  );
  const chartPosition = useMemo(
    () => getChartTradePosition({ productId: activeProductId, activePosition, draft }),
    [activePosition, activeProductId, draft]
  );

  return (
    <div className="relative min-h-0 flex-1 bg-background">
      <LiveMarketChart
        productId={activeProductId}
        timeframe={activeTimeframe}
        snapshot={activeMarketSnapshot}
        activePosition={chartPosition}
      />
      <PositionChartOverlay
        symbol={chartPosition?.symbol ?? activeProductId}
        position={chartPosition}
        currentPrice={activeMarketSnapshot?.price ?? 0}
      />
      <AiContextOverlay />
    </div>
  );
}
