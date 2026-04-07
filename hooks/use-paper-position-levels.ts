"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaperPositionLevelsRequest, PaperWorkspaceContext } from "@/core/paper/types";
import { workspaceContextQueryKey } from "@/core/services/query-keys";
import { updatePaperPositionLevels } from "@/core/services/workspace-api";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";

export function usePaperPositionLevels() {
  const auth = useWorkspaceAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PaperPositionLevelsRequest) => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Connect your wallet to manage paper positions.");
      }
      return updatePaperPositionLevels(accessToken, input);
    },
    onSuccess: (result) => {
      const queryKey = [...workspaceContextQueryKey, auth.userId] as const;
      queryClient.setQueryData<PaperWorkspaceContext | undefined>(queryKey, (current) => {
        if (!current) return current;
        const positions = [result.position, ...current.positions.filter((item) => item.id !== result.position.id)].sort(
          (left, right) => right.updatedAt.localeCompare(left.updatedAt)
        );
        const activity = [result.activity, ...current.activity.filter((item) => item.id !== result.activity.id)]
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .slice(0, 24);
        return { ...current, positions, activity };
      });
    },
  });
}
