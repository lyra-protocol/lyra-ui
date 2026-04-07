import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

export async function markPaperBalanceBannerSeen(privyUserId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workspace_users")
    .update({
      has_seen_paper_balance_banner: true,
      updated_at: new Date().toISOString(),
    })
    .eq("privy_user_id", privyUserId)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Unable to dismiss paper balance banner: ${error?.message ?? "unknown error"}`);
  }
}
