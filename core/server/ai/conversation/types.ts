import { AiThreadRole, JsonObject } from "@/core/ai/types";

export type AiMessageInput = {
  threadId: string;
  workspaceUserId: string;
  role: AiThreadRole;
  content: string;
  toolName?: string | null;
  toolCallId?: string | null;
  metadata?: JsonObject | null;
};

export type AiAlertInput = {
  workspaceUserId: string;
  type: string;
  title: string;
  body: string;
  productId?: string | null;
  contextPacket: JsonObject;
};
