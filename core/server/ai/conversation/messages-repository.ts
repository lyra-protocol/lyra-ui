import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { AiMessage } from "@/core/ai/types";
import { getMemoryMessages, setMemoryMessages } from "@/core/server/ai/conversation/memory-store";
import {
  getAiConversationErrorMessage,
  isMissingRelationError,
  mapMessage,
} from "@/core/server/ai/conversation/mappers";
import {
  markAiConversationStorageAvailable,
  markAiConversationStorageUnavailable,
  shouldUseDatabaseConversationStore,
} from "@/core/server/ai/conversation/storage-mode";
import { upsertIndexedDocuments } from "@/core/server/ai/retrieval/azure-ai-search-service";
import { AiMessageInput } from "@/core/server/ai/conversation/types";

export async function appendAiMessage(input: AiMessageInput) {
  const appendMemoryFallback = () => {
    const message: AiMessage = {
      id: randomUUID(),
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      toolName: input.toolName ?? null,
      toolCallId: input.toolCallId ?? null,
      metadata: input.metadata ?? null,
      createdAt: new Date().toISOString(),
    };
    setMemoryMessages(input.threadId, [...getMemoryMessages(input.threadId), message]);
    return message;
  };

  if (!shouldUseDatabaseConversationStore()) {
    return appendMemoryFallback();
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("ai_messages")
      .insert({
        thread_id: input.threadId,
        workspace_user_id: input.workspaceUserId,
        role: input.role,
        content: input.content,
        tool_name: input.toolName ?? null,
        tool_call_id: input.toolCallId ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        markAiConversationStorageUnavailable();
        return appendMemoryFallback();
      }
      throw new Error(`Unable to save AI message: ${error.message}`);
    }

    markAiConversationStorageAvailable();
    const message = mapMessage(data);
    void upsertIndexedDocuments([
      {
        id: `ai-message-${message.id}`,
        title: input.toolName ? `${input.toolName} tool output` : `${input.role} message`,
        content: message.content,
        sourceType: "ai_message",
        threadId: message.threadId,
        workspaceUserId: input.workspaceUserId,
        updatedAt: message.createdAt,
      },
    ]).catch(() => undefined);

    return message;
  } catch (error) {
    if (isMissingRelationError(error)) {
      markAiConversationStorageUnavailable();
      return appendMemoryFallback();
    }
    throw new Error(`Unable to save AI message: ${getAiConversationErrorMessage(error)}`);
  }
}

export async function listAiMessages(threadId: string) {
  if (!shouldUseDatabaseConversationStore()) {
    return getMemoryMessages(threadId);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("ai_messages")
      .select()
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      if (isMissingRelationError(error)) {
        markAiConversationStorageUnavailable();
        return getMemoryMessages(threadId);
      }
      throw new Error(`Unable to load AI messages: ${error.message}`);
    }

    markAiConversationStorageAvailable();
    return (data ?? []).map(mapMessage);
  } catch (error) {
    if (isMissingRelationError(error)) {
      markAiConversationStorageUnavailable();
      return getMemoryMessages(threadId);
    }
    throw new Error(`Unable to load AI messages: ${getAiConversationErrorMessage(error)}`);
  }
}
