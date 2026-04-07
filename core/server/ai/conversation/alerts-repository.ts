import { randomUUID } from "node:crypto";
import { AiAlert } from "@/core/ai/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getMemoryAlerts, setMemoryAlerts } from "@/core/server/ai/conversation/memory-store";
import { isMissingRelationError, mapAlert } from "@/core/server/ai/conversation/mappers";
import { AiAlertInput } from "@/core/server/ai/conversation/types";

export async function createAiAlert(input: AiAlertInput) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ai_alerts")
    .insert({
      workspace_user_id: input.workspaceUserId,
      type: input.type,
      title: input.title,
      body: input.body,
      product_id: input.productId ?? null,
      context_packet: input.contextPacket,
    })
    .select()
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      const alert: AiAlert = {
        id: randomUUID(),
        workspaceUserId: input.workspaceUserId,
        type: input.type,
        title: input.title,
        body: input.body,
        productId: input.productId ?? null,
        status: "pending",
        contextPacket: input.contextPacket,
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
      };
      setMemoryAlerts(input.workspaceUserId, [alert, ...getMemoryAlerts(input.workspaceUserId)]);
      return alert;
    }
    throw new Error(`Unable to save AI alert: ${error.message}`);
  }

  return mapAlert(data);
}

export async function listAiAlerts(workspaceUserId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ai_alerts")
    .select()
    .eq("workspace_user_id", workspaceUserId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingRelationError(error)) {
      return getMemoryAlerts(workspaceUserId);
    }
    throw new Error(`Unable to load AI alerts: ${error.message}`);
  }

  return (data ?? []).map(mapAlert);
}

export async function acknowledgeAiAlert(alertId: string, workspaceUserId: string) {
  const supabase = getSupabaseAdminClient();
  const acknowledgedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("ai_alerts")
    .update({ status: "dismissed", acknowledged_at: acknowledgedAt })
    .eq("id", alertId)
    .eq("workspace_user_id", workspaceUserId)
    .select()
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      const nextAlerts: AiAlert[] = getMemoryAlerts(workspaceUserId).map((alert) =>
        alert.id === alertId
          ? { ...alert, status: "dismissed" as const, acknowledgedAt }
          : alert
      );
      setMemoryAlerts(workspaceUserId, nextAlerts);
      return nextAlerts.find((alert) => alert.id === alertId) ?? null;
    }
    throw new Error(`Unable to acknowledge AI alert: ${error.message}`);
  }

  return data ? mapAlert(data) : null;
}
