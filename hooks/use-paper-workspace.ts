"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPaperWorkspaceContext } from "@/core/services/workspace-api";
import { workspaceContextQueryKey } from "@/core/services/query-keys";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";

export function usePaperWorkspace() {
  const auth = useWorkspaceAuth();

  return useQuery({
    queryKey: [...workspaceContextQueryKey, auth.userId],
    enabled: auth.ready && auth.authenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Unable to verify the current session.");
      }
      return fetchPaperWorkspaceContext(accessToken, {
        walletAddress: auth.walletAddress,
        email: auth.email,
        displayName: auth.displayName,
      });
    },
  });
}
