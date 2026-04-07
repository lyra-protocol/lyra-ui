import { AiAlert, AiMessage, AiThread, AiThreadRole, JsonObject } from "@/core/ai/types";

export function getAiConversationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return String(error ?? "");
}

export function isMissingRelationError(error: unknown) {
  const message = getAiConversationErrorMessage(error).toLowerCase();
  return (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("relation") && message.includes("ai_")
  );
}

export function mapThread(row: Record<string, unknown>): AiThread {
  return {
    id: String(row.id),
    workspaceUserId: String(row.workspace_user_id),
    workspaceId: String(row.workspace_id ?? "default"),
    title: String(row.title ?? "New thread"),
    titleSource: String(row.title_source ?? "system") as AiThread["titleSource"],
    lastMessagePreview: (row.last_message_preview as string | null) ?? null,
    activeProductId: String(row.active_product_id),
    activeTimeframe: String(row.active_timeframe) as AiThread["activeTimeframe"],
    lastResponseId: (row.last_response_id as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapMessage(row: Record<string, unknown>): AiMessage {
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    role: String(row.role) as AiThreadRole,
    content: String(row.content),
    toolName: (row.tool_name as string | null) ?? null,
    toolCallId: (row.tool_call_id as string | null) ?? null,
    metadata: (row.metadata as JsonObject | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export function mapAlert(row: Record<string, unknown>): AiAlert {
  return {
    id: String(row.id),
    workspaceUserId: String(row.workspace_user_id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    productId: (row.product_id as string | null) ?? null,
    status: String(row.status) as AiAlert["status"],
    contextPacket: (row.context_packet as JsonObject | null) ?? {},
    createdAt: String(row.created_at),
    acknowledgedAt: (row.acknowledged_at as string | null) ?? null,
  };
}
