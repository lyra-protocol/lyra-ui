"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dismissAiAlert, fetchAiAlerts } from "@/core/services/ai-api";
import { aiAlertsQueryKey } from "@/core/services/query-keys";
import { useAiStore } from "@/stores/ai-store";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";

export function useAiAlerts() {
  const auth = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const prependAlertInsight = useAiStore((state) => state.prependAlertInsight);

  const query = useQuery({
    queryKey: [...aiAlertsQueryKey, auth.userId],
    enabled: auth.ready && auth.authenticated,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Unable to verify the current session.");
      }
      const result = await fetchAiAlerts(accessToken, {
        walletAddress: auth.walletAddress,
        email: auth.email,
        displayName: auth.displayName,
      });
      result.alerts.forEach((alert) => prependAlertInsight(alert));
      return result.alerts;
    },
  });

  const dismiss = useMutation({
    mutationFn: async (alertId: string) => {
      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Unable to verify the current session.");
      }
      return dismissAiAlert(accessToken, alertId, {
        walletAddress: auth.walletAddress,
        email: auth.email,
        displayName: auth.displayName,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...aiAlertsQueryKey, auth.userId] });
    },
  });

  return {
    ...query,
    alerts: query.data ?? [],
    dismissAlert: dismiss.mutateAsync,
    dismissing: dismiss.isPending,
  };
}
