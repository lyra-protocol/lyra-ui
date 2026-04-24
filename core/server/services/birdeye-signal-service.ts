import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

type RadarTokenInput = {
  address: string;
  symbol: string;
  name: string;
  logoURI: string | null;
  liquidityUSD: number | null;
  priceUSD: number | null;
  price24hChangePercent: number | null;
  volume24hUSD: number | null;
  score: number;
  why: string[];
  warnings: string[];
};

type WorkspaceUserIdRow = { id: string };

export async function publishBirdeyeRadarSignals(args: {
  privyUserId: string;
  mode: "trending" | "new";
  tokens: RadarTokenInput[];
}) {
  const supabase = getSupabaseAdminClient();

  const { data: user, error: userError } = await supabase
    .from("workspace_users")
    .select("id")
    .eq("privy_user_id", args.privyUserId)
    .maybeSingle<WorkspaceUserIdRow>();

  if (userError) throw new Error(userError.message);
  if (!user?.id) throw new Error("Workspace user not found.");

  const now = new Date().toISOString();
  const rows = args.tokens.map((t) => ({
    workspace_user_id: user.id,
    type: `birdeye.radar.${args.mode}`,
    priority: t.score >= 80 ? 1 : t.score >= 60 ? 2 : 3,
    payload: {
      source: "birdeye",
      mode: args.mode,
      token: {
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        logoURI: t.logoURI,
        liquidityUSD: t.liquidityUSD,
        priceUSD: t.priceUSD,
        price24hChangePercent: t.price24hChangePercent,
        volume24hUSD: t.volume24hUSD,
      },
      score: t.score,
      why: t.why,
      warnings: t.warnings,
      createdAt: now,
    },
  }));

  const { error } = await supabase.from("lyra_trading_signals").insert(rows);
  if (error) throw new Error(error.message);

  return { inserted: rows.length };
}

