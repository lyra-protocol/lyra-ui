import "server-only";

import {
  PaperPositionLevelsMutationResult,
  PaperPositionLevelsRequest,
} from "@/core/paper/types";
import {
  mapPaperPosition,
  mapWorkspaceActivity,
} from "@/core/server/services/paper-mappers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

type RpcResponse = {
  position: Record<string, unknown>;
  activity: Record<string, unknown>;
};

function readRpcResult(data: RpcResponse[] | RpcResponse | null) {
  const payload = Array.isArray(data) ? data[0] : data;
  if (!payload) {
    throw new Error("Position update did not return a result.");
  }
  return payload;
}

export async function updatePaperPositionLevels(
  privyUserId: string,
  input: PaperPositionLevelsRequest
): Promise<PaperPositionLevelsMutationResult> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("lyra_update_paper_position_levels", {
    p_privy_user_id: privyUserId,
    p_product_id: input.productId,
    p_stop_loss: input.stopLoss,
    p_take_profit: input.takeProfit,
    p_note: input.note ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = readRpcResult(data as RpcResponse[] | RpcResponse | null);
  return {
    position: mapPaperPosition(payload.position),
    activity: mapWorkspaceActivity(payload.activity),
  };
}
