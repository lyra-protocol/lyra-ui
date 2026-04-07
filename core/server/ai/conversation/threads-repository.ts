import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { AiWorkspaceSelection } from "@/core/ai/types";
import {
  getAiConversationErrorMessage,
  isMissingRelationError,
  mapThread,
} from "@/core/server/ai/conversation/mappers";
import {
  markAiConversationStorageAvailable,
  markAiConversationStorageUnavailable,
  shouldUseDatabaseConversationStore,
} from "@/core/server/ai/conversation/storage-mode";
import {
  createMemoryAiThread,
  listMemoryAiThreads,
  renameMemoryAiThread,
  resolveMemoryAiThread,
  updateMemoryAiThreadState,
} from "@/core/server/ai/conversation/threads-memory-fallback";

export async function createAiThread(workspaceUserId: string, selection: AiWorkspaceSelection) {
  if (!shouldUseDatabaseConversationStore()) {
    return createMemoryAiThread(workspaceUserId, selection);
  }

  try {
    const workspaceId = selection.workspaceId ?? "default";
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("ai_threads")
      .insert({
        workspace_user_id: workspaceUserId,
        workspace_id: workspaceId,
        title: "New thread",
        title_source: "system",
        active_product_id: selection.activeProductId,
        active_timeframe: selection.activeTimeframe,
        last_message_preview: null,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        markAiConversationStorageUnavailable();
        return createMemoryAiThread(workspaceUserId, selection);
      }
      throw new Error(`Unable to create AI thread: ${error.message}`);
    }

    markAiConversationStorageAvailable();
    return mapThread(data);
  } catch (error) {
    if (isMissingRelationError(error)) {
      markAiConversationStorageUnavailable();
      return createMemoryAiThread(workspaceUserId, selection);
    }
    throw new Error(`Unable to create AI thread: ${getAiConversationErrorMessage(error)}`);
  }
}

export async function ensureAiThread(
  workspaceUserId: string,
  selection: AiWorkspaceSelection,
  threadId?: string | null
) {
  if (threadId) {
    return getAiThread(threadId, workspaceUserId, selection);
  }

  return createAiThread(workspaceUserId, selection);
}

export async function getAiThread(
  threadId: string,
  workspaceUserId: string,
  selection?: AiWorkspaceSelection
) {
  if (!shouldUseDatabaseConversationStore()) {
    return resolveMemoryAiThread(threadId, workspaceUserId, selection);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("ai_threads")
      .select()
      .eq("id", threadId)
      .eq("workspace_user_id", workspaceUserId)
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        markAiConversationStorageUnavailable();
        return resolveMemoryAiThread(threadId, workspaceUserId, selection);
      }
      throw new Error(`Unable to load AI thread: ${error.message}`);
    }

    markAiConversationStorageAvailable();
    return mapThread(data);
  } catch (error) {
    if (isMissingRelationError(error)) {
      markAiConversationStorageUnavailable();
      return resolveMemoryAiThread(threadId, workspaceUserId, selection);
    }
    throw new Error(`Unable to load AI thread: ${getAiConversationErrorMessage(error)}`);
  }
}

export async function listAiThreads(workspaceUserId: string) {
  if (!shouldUseDatabaseConversationStore()) {
    return listMemoryAiThreads(workspaceUserId);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("ai_threads")
      .select()
      .eq("workspace_user_id", workspaceUserId)
      .order("updated_at", { ascending: false })
      .limit(40);

    if (error) {
      if (isMissingRelationError(error)) {
        markAiConversationStorageUnavailable();
        return listMemoryAiThreads(workspaceUserId);
      }
      throw new Error(`Unable to list AI threads: ${error.message}`);
    }

    markAiConversationStorageAvailable();
    return (data ?? []).map(mapThread);
  } catch (error) {
    if (isMissingRelationError(error)) {
      markAiConversationStorageUnavailable();
      return listMemoryAiThreads(workspaceUserId);
    }
    throw new Error(`Unable to list AI threads: ${getAiConversationErrorMessage(error)}`);
  }
}

export async function renameAiThread(
  threadId: string,
  workspaceUserId: string,
  title: string,
  titleSource: "system" | "ai" | "user" = "user"
) {
  const nextTitle = title.trim().slice(0, 80);
  if (!nextTitle) {
    throw new Error("Thread title is required.");
  }

  if (!shouldUseDatabaseConversationStore()) {
    return renameMemoryAiThread(threadId, workspaceUserId, nextTitle, titleSource);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("ai_threads")
      .update({
        title: nextTitle,
        title_source: titleSource,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("workspace_user_id", workspaceUserId)
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        markAiConversationStorageUnavailable();
        return renameMemoryAiThread(threadId, workspaceUserId, nextTitle, titleSource);
      }
      throw new Error(`Unable to rename AI thread: ${error.message}`);
    }

    markAiConversationStorageAvailable();
    return mapThread(data);
  } catch (error) {
    if (isMissingRelationError(error)) {
      markAiConversationStorageUnavailable();
      return renameMemoryAiThread(threadId, workspaceUserId, nextTitle, titleSource);
    }
    throw new Error(`Unable to rename AI thread: ${getAiConversationErrorMessage(error)}`);
  }
}

export async function updateAiThreadState(args: {
  threadId: string;
  workspaceUserId: string;
  selection: AiWorkspaceSelection;
  responseId: string | null;
  preview?: string | null;
}) {
  if (!shouldUseDatabaseConversationStore()) {
    updateMemoryAiThreadState(args);
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("ai_threads")
      .update({
        active_product_id: args.selection.activeProductId,
        active_timeframe: args.selection.activeTimeframe,
        last_response_id: args.responseId,
        last_message_preview: args.preview ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.threadId)
      .eq("workspace_user_id", args.workspaceUserId);

    if (error) {
      if (isMissingRelationError(error)) {
        markAiConversationStorageUnavailable();
        updateMemoryAiThreadState(args);
        return;
      }
      throw new Error(`Unable to update AI thread: ${error.message}`);
    }

    markAiConversationStorageAvailable();
  } catch (error) {
    if (isMissingRelationError(error)) {
      markAiConversationStorageUnavailable();
      updateMemoryAiThreadState(args);
      return;
    }
    throw new Error(`Unable to update AI thread: ${getAiConversationErrorMessage(error)}`);
  }
}
