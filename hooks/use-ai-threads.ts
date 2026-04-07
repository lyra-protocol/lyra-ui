"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAiThreadRequest,
  fetchAiThreads,
  renameAiThreadRequest,
} from "@/core/services/ai-api";
import { aiThreadsQueryKey } from "@/core/services/query-keys";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { useAiStore } from "@/stores/ai-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function useAiThreads() {
  const auth = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const storeThreads = useAiStore((state) => state.threads);
  const setThreads = useAiStore((state) => state.setThreads);
  const upsertThread = useAiStore((state) => state.upsertThread);
  const setCurrentThreadId = useAiStore((state) => state.setCurrentThreadId);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const activeProductId = useWorkspaceStore((state) => state.activeProductId);
  const activeTimeframe = useWorkspaceStore((state) => state.activeTimeframe);
  const focusedRegion = useWorkspaceStore((state) => state.focusedRegion);

  const identity = {
    walletAddress: auth.walletAddress,
    email: auth.email,
    displayName: auth.displayName,
  };

  const query = useQuery({
    queryKey: [...aiThreadsQueryKey, auth.userId],
    enabled: auth.ready && auth.authenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Unable to verify the current session.");
      }
      const result = await fetchAiThreads(accessToken, identity);
      setThreads(result.threads);
      return result.threads;
    },
  });

  const createThread = useMutation({
    mutationFn: async () => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Unable to verify the current session.");
      }
      return createAiThreadRequest(
        accessToken,
        {
          selection: {
            workspaceId: activeWorkspaceId,
            activeProductId,
            activeTimeframe,
            focusedRegion,
          },
        },
        identity
      );
    },
    onSuccess: async ({ thread }) => {
      upsertThread(thread);
      setCurrentThreadId(thread.id);
      void queryClient.invalidateQueries({ queryKey: [...aiThreadsQueryKey, auth.userId] });
    },
  });

  const renameThread = useMutation({
    mutationFn: async (input: { threadId: string; title: string }) => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Unable to verify the current session.");
      }
      return renameAiThreadRequest(accessToken, input.threadId, input.title, identity);
    },
    onSuccess: async ({ thread }) => {
      upsertThread(thread);
      void queryClient.invalidateQueries({ queryKey: [...aiThreadsQueryKey, auth.userId] });
    },
  });

  return {
    ...query,
    threads: storeThreads,
    createThread: createThread.mutateAsync,
    creatingThread: createThread.isPending,
    renameThread: renameThread.mutateAsync,
    renamingThread: renameThread.isPending,
  };
}
