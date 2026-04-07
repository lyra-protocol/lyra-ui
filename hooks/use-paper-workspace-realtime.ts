"use client";

import { useEffect, useMemo } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { PaperWorkspaceContext } from "@/core/paper/types";
import { workspaceContextQueryKey } from "@/core/services/query-keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  applyPaperAccountRealtime,
  applyPaperPositionRealtime,
  applyPaperTradeRealtime,
  applyWorkspaceActivityRealtime,
  applyWorkspaceUserRealtime,
} from "@/core/paper/workspace-realtime-cache";
import { usePaperWorkspace } from "@/hooks/use-paper-workspace";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";

function subscribeTable(
  channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]>,
  table: string,
  workspaceUserId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  return channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table,
      filter: `workspace_user_id=eq.${workspaceUserId}`,
    },
    onChange
  );
}

export function usePaperWorkspaceRealtime() {
  const auth = useWorkspaceAuth();
  const queryClient = useQueryClient();
  const workspace = usePaperWorkspace();
  const workspaceUserId = workspace.data?.identity.id ?? null;
  const queryKey = useMemo(() => [...workspaceContextQueryKey, auth.userId] as const, [auth.userId]);

  useEffect(() => {
    if (!auth.authenticated || !workspaceUserId) {
      return;
    }

    let client;
    try {
      client = getSupabaseBrowserClient();
    } catch {
      return;
    }

    const channel = client.channel(`paper-workspace:${workspaceUserId}`);
    const setWorkspace = (
      updater: (current: PaperWorkspaceContext | undefined) => PaperWorkspaceContext | undefined
    ) => queryClient.setQueryData<PaperWorkspaceContext | undefined>(queryKey, updater);

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "workspace_users",
        filter: `id=eq.${workspaceUserId}`,
      },
      (payload) => setWorkspace((current) => applyWorkspaceUserRealtime(current, payload))
    );
    subscribeTable(channel, "paper_accounts", workspaceUserId, (payload) =>
      setWorkspace((current) => applyPaperAccountRealtime(current, payload))
    );
    subscribeTable(channel, "paper_positions", workspaceUserId, (payload) =>
      setWorkspace((current) => applyPaperPositionRealtime(current, payload))
    );
    subscribeTable(channel, "paper_trades", workspaceUserId, (payload) =>
      setWorkspace((current) => applyPaperTradeRealtime(current, payload))
    );
    subscribeTable(channel, "workspace_activity", workspaceUserId, (payload) =>
      setWorkspace((current) => applyWorkspaceActivityRealtime(current, payload))
    );
    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [auth.authenticated, queryClient, queryKey, workspaceUserId]);
}
