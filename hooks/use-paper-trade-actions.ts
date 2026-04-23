"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaperTradeMutationResult, PaperTradeRequest, PaperWorkspaceContext } from "@/core/paper/types";
import { workspaceContextQueryKey } from "@/core/services/query-keys";
import { createPaperTrade } from "@/core/services/workspace-api";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { useWorkspaceStore } from "@/stores/workspace-store";

function mergeWorkspaceTradeResult(
  previous: PaperWorkspaceContext | undefined,
  result: PaperTradeMutationResult,
  input: PaperTradeRequest
) {
  if (!previous) {
    return previous;
  }

  const nextPositions = (() => {
    const withoutCurrentMarket = previous.positions.filter(
      (position) => position.productId !== input.productId
    );

    if (!result.position) {
      return withoutCurrentMarket;
    }

    return [result.position, ...withoutCurrentMarket].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  })();

  const nextTrades = [result.trade, ...previous.trades.filter((trade) => trade.id !== result.trade.id)].slice(0, 24);
  const nextActivity = [result.activity, ...previous.activity.filter((item) => item.id !== result.activity.id)].slice(
    0,
    24
  );

  return {
    ...previous,
    account: result.account,
    positions: nextPositions,
    trades: nextTrades,
    activity: nextActivity,
  } satisfies PaperWorkspaceContext;
}

export function usePaperTradeActions() {
  const auth = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const queryKey = [...workspaceContextQueryKey, auth.userId] as const;

  return useMutation({
    mutationFn: async (input: PaperTradeRequest) => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Connect your wallet to use paper trading.");
      }
      return createPaperTrade(accessToken, input);
    },
    onSuccess: (result, input) => {
      const workspace = useWorkspaceStore.getState();
      if (input.action === "open" || input.action === "increase") {
        workspace.setBottomPanelTab("positions");
      } else {
        workspace.setBottomPanelTab("trades");
      }
      workspace.openBottomPanel();
      queryClient.setQueryData<PaperWorkspaceContext | undefined>(queryKey, (previous) =>
        mergeWorkspaceTradeResult(previous, result, input)
      );
      void queryClient.invalidateQueries({ queryKey: workspaceContextQueryKey });
    },
  });
}
