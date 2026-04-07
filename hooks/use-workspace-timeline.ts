"use client";

import { useMemo } from "react";
import { useRecentRecordActivity } from "@/hooks/use-recent-record-activity";
import { useAiStore } from "@/stores/ai-store";

export type WorkspaceTimelineItem = {
  id: string;
  title: string;
  detail: string | null;
  createdAt: string;
  source: "workspace" | "record" | "ai";
};

export function useWorkspaceTimeline() {
  const { activity } = useRecentRecordActivity();
  const insights = useAiStore((state) => state.insights);

  const timeline = useMemo(() => {
    const aiItems = insights.map((insight) => ({
      id: `ai-${insight.id}`,
      title: insight.prompt,
      detail: insight.content || insight.prompt,
      createdAt: insight.createdAt,
      source: "ai" as const,
    }));

    return [...activity, ...aiItems]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 12);
  }, [activity, insights]);

  return { timeline };
}
