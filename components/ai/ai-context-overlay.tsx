"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { AiSignalCard } from "@/components/workspace/context/ai-signal-card";
import { useAiAlerts } from "@/hooks/use-ai-alerts";
import { usePaperPositions } from "@/hooks/use-paper-positions";
import { useAiTradeEntryStore } from "@/stores/ai-trade-entry-store";
import { useAiStore } from "@/stores/ai-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

const OVERLAY_WINDOW_MS = 60_000;

function isFresh(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < OVERLAY_WINDOW_MS;
}

export function AiContextOverlay() {
  const activeProductId = useWorkspaceStore((state) => state.activeProductId);
  const setActiveProductId = useWorkspaceStore((state) => state.setActiveProductId);
  const setBottomPanelTab = useWorkspaceStore((state) => state.setBottomPanelTab);
  const positions = usePaperPositions();
  const insights = useAiStore((state) => state.insights);
  const markAlertsSeen = useAiStore((state) => state.markAlertsSeen);
  const { alerts } = useAiAlerts();
  const openTradeEntry = useAiTradeEntryStore((state) => state.open);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleInsights = useMemo(
    () =>
      insights
        .filter((insight) => !dismissedIds.includes(insight.id))
        .filter((insight) => insight.source === "trigger" || insight.productId === activeProductId)
        .filter((insight) => insight.status === "streaming" || isFresh(insight.createdAt))
        .slice(0, 1),
    [activeProductId, dismissedIds, insights]
  );

  useEffect(() => {
    const activeAlertIds = alerts.filter((alert) => alert.status !== "dismissed").map((alert) => alert.id);
    if (activeAlertIds.length > 0) {
      markAlertsSeen(activeAlertIds);
    }
  }, [alerts, markAlertsSeen]);

  useEffect(() => {
    const timers = visibleInsights
      .filter((insight) => insight.status !== "streaming")
      .map((insight) =>
        window.setTimeout(() => {
          setDismissedIds((current) => [...new Set([...current, insight.id])]);
        }, 14_000)
      );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [visibleInsights]);

  if (visibleInsights.length === 0) {
    return null;
  }

  const insight = visibleInsights[0];

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-20 w-[360px]">
      <div className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => setDismissedIds((current) => [...new Set([...current, insight.id])])}
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center text-black/34 transition hover:text-black/78"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (insight.productId && insight.productId !== activeProductId) {
              setActiveProductId(insight.productId);
            }
            setBottomPanelTab("ai");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (insight.productId && insight.productId !== activeProductId) {
                setActiveProductId(insight.productId);
              }
              setBottomPanelTab("ai");
            }
          }}
          className="block w-full cursor-pointer text-left"
        >
          <AiSignalCard
            compact
            content={insight.content}
            prompt={insight.source === "trigger" ? "New market signal" : "Live read"}
            signal={insight.signal}
            status={insight.status}
            onEnterTrade={
              insight.signal && !positions.some((position) => position.productId === insight.signal?.productId)
                ? openTradeEntry
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
