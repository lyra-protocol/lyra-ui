"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAiThreadMessages } from "@/core/services/ai-api";
import { aiThreadMessagesQueryKey } from "@/core/services/query-keys";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";

export function useAiThreadMessages(threadId: string | null) {
  const auth = useWorkspaceAuth();

  return useQuery({
    queryKey: [...aiThreadMessagesQueryKey, auth.userId, threadId],
    enabled: auth.ready && auth.authenticated && Boolean(threadId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken || !threadId) {
        throw new Error("Unable to verify the current session.");
      }
      return fetchAiThreadMessages(accessToken, threadId, {
        walletAddress: auth.walletAddress,
        email: auth.email,
        displayName: auth.displayName,
      });
    },
  });
}
