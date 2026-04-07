"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { streamLyraAiChat } from "@/core/services/ai-api";
import { aiThreadMessagesQueryKey, aiThreadsQueryKey } from "@/core/services/query-keys";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { useAiStore } from "@/stores/ai-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

function normalizePrompt(input: string) {
  return input.startsWith("/") ? input.slice(1).trim() : input.trim();
}

export function useAiCommandSubmission() {
  const auth = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const currentThreadId = useAiStore((state) => state.currentThreadId);
  const beginInsight = useAiStore((state) => state.beginInsight);
  const assignInsightThread = useAiStore((state) => state.assignInsightThread);
  const appendInsightDelta = useAiStore((state) => state.appendInsightDelta);
  const completeInsight = useAiStore((state) => state.completeInsight);
  const failInsight = useAiStore((state) => state.failInsight);
  const upsertThread = useAiStore((state) => state.upsertThread);
  const setCurrentThreadId = useAiStore((state) => state.setCurrentThreadId);

  const submitAiCommand = useCallback(
    async (rawPrompt: string) => {
      const prompt = normalizePrompt(rawPrompt);
      if (!prompt) {
        return null;
      }

      const workspace = useWorkspaceStore.getState();
      const insightId = beginInsight({
        prompt,
        productId: workspace.activeProductId,
        timeframe: workspace.activeTimeframe,
        threadId: currentThreadId,
      });
      if (currentThreadId) {
        const thread = useAiStore.getState().threads.find((item) => item.id === currentThreadId);
        if (thread) {
          upsertThread({
            ...thread,
            lastMessagePreview: prompt,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      if (!auth.ready || !auth.authenticated) {
        failInsight(insightId, "Connect a wallet to use workspace-aware intelligence.");
        return insightId;
      }

      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        failInsight(insightId, "Unable to verify the current session.");
        return insightId;
      }

      try {
        await streamLyraAiChat(
          accessToken,
          {
            message: prompt,
            threadId: currentThreadId,
            selection: {
              workspaceId: workspace.activeWorkspaceId,
              activeProductId: workspace.activeProductId,
              activeTimeframe: workspace.activeTimeframe,
              focusedRegion: workspace.focusedRegion,
            },
            stream: true,
          },
          {
            walletAddress: auth.walletAddress,
            email: auth.email,
            displayName: auth.displayName,
          },
          {
            onThread: ({ threadId }) => {
              assignInsightThread(insightId, threadId);
              setCurrentThreadId(threadId);
              upsertThread({
                id: threadId,
                workspaceUserId: auth.userId || "",
                workspaceId: workspace.activeWorkspaceId ?? "default",
                title: "New thread",
                titleSource: "system",
                lastMessagePreview: null,
                activeProductId: workspace.activeProductId,
                activeTimeframe: workspace.activeTimeframe,
                lastResponseId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            },
            onDelta: ({ delta }) => {
              appendInsightDelta(insightId, delta);
            },
            onDone: ({ threadId, content, signal }) => {
              completeInsight(insightId, { threadId, content, signal });
              const thread = useAiStore.getState().threads.find((item) => item.id === threadId);
              if (thread) {
                upsertThread({
                  ...thread,
                  lastMessagePreview: content.slice(0, 180) || prompt,
                  updatedAt: new Date().toISOString(),
                });
              }
              void queryClient.invalidateQueries({
                queryKey: [...aiThreadsQueryKey, auth.userId],
              });
              void queryClient.invalidateQueries({
                queryKey: [...aiThreadMessagesQueryKey, auth.userId, threadId],
              });
            },
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to reach Lyra intelligence.";
        failInsight(insightId, message);
      }

      return insightId;
    },
    [
      appendInsightDelta,
      assignInsightThread,
      auth,
      beginInsight,
      completeInsight,
      currentThreadId,
      failInsight,
      queryClient,
      setCurrentThreadId,
      upsertThread,
    ]
  );

  return { submitAiCommand };
}
