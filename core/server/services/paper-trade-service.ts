import "server-only";

import { PaperTradeMutationResult, PaperTradeRequest } from "@/core/paper/types";
import {
  mapPaperAccount,
  mapPaperPosition,
  mapPaperTrade,
  mapWorkspaceActivity,
} from "@/core/server/services/paper-mappers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

type RpcResponse = {
  account: Record<string, unknown>;
  position: Record<string, unknown> | null;
  trade: Record<string, unknown>;
  activity: Record<string, unknown>;
};

function readRpcResult(data: RpcResponse[] | RpcResponse | null, action: string) {
  const payload = Array.isArray(data) ? data[0] : data;
  if (!payload) {
    throw new Error(`Paper ${action} did not return a result.`);
  }
  return payload;
}

function getRpcInvocation(input: PaperTradeRequest, privyUserId: string) {
  if (input.action === "close") {
    return {
      rpcName: "lyra_close_paper_position",
      args: {
        p_privy_user_id: privyUserId,
        p_product_id: input.productId,
        p_quantity: input.quantity,
        p_price: input.price,
        p_note: input.note ?? null,
      },
    };
  }

  return {
    rpcName: "lyra_open_or_increase_paper_position",
    args: {
      p_privy_user_id: privyUserId,
      p_product_id: input.productId,
      p_symbol: input.symbol,
      p_notional: input.notional,
      p_price: input.price,
      p_expected_action: input.action,
      p_note: input.note ?? null,
      p_direction: input.direction ?? "long",
      p_leverage: input.leverage ?? 1,
      p_stop_loss: input.stopLoss ?? null,
      p_take_profit: input.takeProfit ?? null,
    },
  };
}

export async function executePaperTrade(
  privyUserId: string,
  input: PaperTradeRequest
): Promise<PaperTradeMutationResult> {
  const supabase = getSupabaseAdminClient();
  const invocation = getRpcInvocation(input, privyUserId);
  const { data, error } = await supabase.rpc(invocation.rpcName, invocation.args);
  if (error) {
    throw new Error(error.message);
  }

  const payload = readRpcResult(data as RpcResponse[] | RpcResponse | null, input.action);
  return {
    account: mapPaperAccount(payload.account),
    position: payload.position ? mapPaperPosition(payload.position) : null,
    trade: mapPaperTrade(payload.trade),
    activity: mapWorkspaceActivity(payload.activity),
  };
}
