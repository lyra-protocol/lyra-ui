import "server-only";

import { randomBytes } from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

type WorkspaceUserIdRow = { id: string };

export async function mintLyraMcpConnectorToken(privyUserId: string): Promise<{ token: string }> {
  const supabase = getSupabaseAdminClient();
  const { data: user, error: userError } = await supabase
    .from("workspace_users")
    .select("id")
    .eq("privy_user_id", privyUserId)
    .maybeSingle<WorkspaceUserIdRow>();

  if (userError) {
    throw new Error(userError.message);
  }
  if (!user?.id) {
    throw new Error("Workspace user not found.");
  }

  const { error: revokeError } = await supabase
    .from("lyra_mcp_api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("workspace_user_id", user.id)
    .is("revoked_at", null);

  if (revokeError) {
    const msg = revokeError.message.toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      throw new Error(
        "Trading MCP tables are missing. Apply supabase/migrations/20260423_lyra_trading_execution_layer.sql on this Supabase project.",
      );
    }
    throw new Error(revokeError.message);
  }

  const token = `lyt_${randomBytes(32).toString("base64url")}`;
  const { error: insertError } = await supabase.from("lyra_mcp_api_tokens").insert({
    workspace_user_id: user.id,
    token,
    label: "mcp-connector",
  });

  if (insertError) {
    const msg = insertError.message.toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      throw new Error(
        "Trading MCP tables are missing. Apply supabase/migrations/20260423_lyra_trading_execution_layer.sql on this Supabase project.",
      );
    }
    throw new Error(insertError.message);
  }

  return { token };
}
