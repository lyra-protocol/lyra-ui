import "server-only";

import { PaperWorkspaceContext } from "@/core/paper/types";
import { fetchLyraRecordActivity } from "@/core/server/records/lyra-record-adapter";
import { getPaperTradeCapabilities } from "@/core/server/services/paper-trade-capabilities";
import {
  mapPaperAccount,
  mapPaperPosition,
  mapPaperTrade,
  mapWorkspaceActivity,
} from "@/core/server/services/paper-mappers";
import { ensureWorkspaceUser, WorkspaceIdentitySeedInput } from "@/core/server/services/workspace-user-service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

const STARTING_BALANCE = 10_000;

async function ensurePaperAccount(workspaceUserId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("paper_accounts")
    .select()
    .eq("workspace_user_id", workspaceUserId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to load paper account: ${existingError.message}`);
  }

  if (existing) {
    return mapPaperAccount(existing);
  }

  const { data, error } = await supabase
    .from("paper_accounts")
    .insert({
      workspace_user_id: workspaceUserId,
      currency: "USDT",
      starting_balance: STARTING_BALANCE,
      cash_balance: STARTING_BALANCE,
      realized_pnl: 0,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Unable to create paper account: ${error?.message ?? "unknown error"}`);
  }

  await supabase.from("workspace_activity").insert({
    workspace_user_id: workspaceUserId,
    type: "account.seeded",
    title: "Paper account ready",
    detail: `${STARTING_BALANCE.toLocaleString()} paper USDT is ready for you to start exploring Lyra.`,
    source: "workspace",
  });

  return mapPaperAccount(data);
}

export async function getPaperWorkspaceContext(identity: WorkspaceIdentitySeedInput): Promise<PaperWorkspaceContext> {
  const supabase = getSupabaseAdminClient();
  const workspaceUser = await ensureWorkspaceUser(identity);
  const account = await ensurePaperAccount(workspaceUser.id);
  const capabilities = await getPaperTradeCapabilities();

  const [positionsResult, tradesResult, activityResult, recordActivity] = await Promise.all([
    supabase
      .from("paper_positions")
      .select()
      .eq("workspace_user_id", workspaceUser.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("paper_trades")
      .select()
      .eq("workspace_user_id", workspaceUser.id)
      .order("executed_at", { ascending: false })
      .limit(24),
    supabase
      .from("workspace_activity")
      .select()
      .eq("workspace_user_id", workspaceUser.id)
      .order("created_at", { ascending: false })
      .limit(24),
    fetchLyraRecordActivity(),
  ]);

  if (positionsResult.error) {
    throw new Error(`Unable to load paper positions: ${positionsResult.error.message}`);
  }
  if (tradesResult.error) {
    throw new Error(`Unable to load paper trades: ${tradesResult.error.message}`);
  }
  if (activityResult.error) {
    throw new Error(`Unable to load workspace activity: ${activityResult.error.message}`);
  }

  return {
    identity: workspaceUser,
    account,
    positions: (positionsResult.data ?? []).map(mapPaperPosition),
    trades: (tradesResult.data ?? []).map(mapPaperTrade),
    activity: [...(activityResult.data ?? []).map(mapWorkspaceActivity), ...recordActivity]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 24),
    recordSyncStatus: recordActivity.length > 0 ? "connected" : "pending",
    capabilities,
  };
}
