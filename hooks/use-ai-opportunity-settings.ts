"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOpportunitySettings, PaperWorkspaceContext } from "@/core/paper/types";
import { updateAiOpportunitySettingsRequest } from "@/core/services/ai-api";
import { workspaceContextQueryKey } from "@/core/services/query-keys";
import { usePaperWorkspace } from "@/hooks/use-paper-workspace";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";

export function useAiOpportunitySettings() {
  const auth = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const workspace = usePaperWorkspace();
  const settings = workspace.data?.identity.aiOpportunitySettings ?? null;

  const mutation = useMutation({
    mutationFn: async (input: Partial<AiOpportunitySettings>) => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Unable to verify the current session.");
      }
      return updateAiOpportunitySettingsRequest(accessToken, input, {
        walletAddress: auth.walletAddress,
        email: auth.email,
        displayName: auth.displayName,
      });
    },
    onSuccess: ({ settings: nextSettings }) => {
      queryClient.setQueryData<PaperWorkspaceContext | undefined>([...workspaceContextQueryKey, auth.userId], (current) =>
        current
          ? {
              ...current,
              identity: {
                ...current.identity,
                aiOpportunitySettings: nextSettings,
              },
            }
          : current
      );
    },
  });

  return {
    settings,
    ready: Boolean(settings),
    saving: mutation.isPending,
    saveSettings: mutation.mutateAsync,
  };
}
