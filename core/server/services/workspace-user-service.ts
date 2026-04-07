import "server-only";

import { mapWorkspaceIdentity } from "@/core/server/services/paper-mappers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

type WorkspaceIdentitySeed = {
  privyUserId: string;
  walletAddress: string | null;
  email: string | null;
  displayName: string | null;
};

export type WorkspaceIdentitySeedInput = WorkspaceIdentitySeed;

export async function ensureWorkspaceUser(identity: WorkspaceIdentitySeed) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workspace_users")
    .upsert(
      {
        privy_user_id: identity.privyUserId,
        wallet_address: identity.walletAddress,
        email: identity.email,
        display_name: identity.displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "privy_user_id" }
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Unable to sync workspace user: ${error?.message ?? "unknown error"}`);
  }

  return mapWorkspaceIdentity(data);
}
