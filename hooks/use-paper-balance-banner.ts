"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaperWorkspaceContext } from "@/core/paper/types";
import { workspaceContextQueryKey } from "@/core/services/query-keys";
import { dismissPaperBalanceBanner } from "@/core/services/workspace-api";
import { usePaperWorkspace } from "@/hooks/use-paper-workspace";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";

export function usePaperBalanceBanner() {
  const auth = useWorkspaceAuth();
  const workspace = usePaperWorkspace();
  const queryClient = useQueryClient();
  const queryKey = [...workspaceContextQueryKey, auth.userId];

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Unable to verify the current session.");
      }

      return dismissPaperBalanceBanner(accessToken);
    },
    onSuccess: async () => {
      queryClient.setQueryData<PaperWorkspaceContext | undefined>(queryKey, (current) =>
        current
          ? {
              ...current,
              identity: {
                ...current.identity,
                hasSeenPaperBalanceBanner: true,
              },
            }
          : current
      );

      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    shouldShow:
      Boolean(workspace.data?.account) && workspace.data?.identity.hasSeenPaperBalanceBanner === false,
    dismiss: () => dismissMutation.mutate(),
    isPending: dismissMutation.isPending,
  } as const;
}
