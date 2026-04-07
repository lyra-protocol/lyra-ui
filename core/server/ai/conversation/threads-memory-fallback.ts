import { AiWorkspaceSelection } from "@/core/ai/types";
import {
  createMemoryThread,
  createMemoryThreadWithId,
  getMemoryMessages,
  getMemoryThreadById,
  listMemoryThreads,
  setMemoryThread,
} from "@/core/server/ai/conversation/memory-store";

function getThreadPreview(threadId: string) {
  const messages = getMemoryMessages(threadId)
    .filter((message) => message.role === "assistant" || message.role === "user")
    .slice(-1);
  return messages[0]?.content.slice(0, 160) ?? null;
}

export function createMemoryAiThread(workspaceUserId: string, selection: AiWorkspaceSelection) {
  return createMemoryThread(workspaceUserId, selection);
}

export function resolveMemoryAiThread(
  threadId: string,
  workspaceUserId: string,
  selection?: AiWorkspaceSelection
) {
  const memoryThread = getMemoryThreadById(threadId);
  if (memoryThread && memoryThread.workspaceUserId === workspaceUserId) {
    return memoryThread;
  }
  if (selection) {
    return createMemoryThreadWithId(threadId, workspaceUserId, selection);
  }
  throw new Error("AI thread not found.");
}

export function listMemoryAiThreads(workspaceUserId: string) {
  return listMemoryThreads(workspaceUserId).map((thread) => ({
    ...thread,
    lastMessagePreview: thread.lastMessagePreview ?? getThreadPreview(thread.id),
  }));
}

export function renameMemoryAiThread(
  threadId: string,
  workspaceUserId: string,
  title: string,
  titleSource: "system" | "ai" | "user"
) {
  const memoryThread = getMemoryThreadById(threadId);
  if (!memoryThread || memoryThread.workspaceUserId !== workspaceUserId) {
    throw new Error("AI thread not found.");
  }
  const updatedThread = {
    ...memoryThread,
    title,
    titleSource,
    updatedAt: new Date().toISOString(),
  };
  setMemoryThread(updatedThread);
  return updatedThread;
}

export function updateMemoryAiThreadState(args: {
  threadId: string;
  selection: AiWorkspaceSelection;
  responseId: string | null;
  preview?: string | null;
}) {
  const memoryThread = getMemoryThreadById(args.threadId);
  if (!memoryThread) {
    return;
  }
  setMemoryThread({
    ...memoryThread,
    activeProductId: args.selection.activeProductId,
    activeTimeframe: args.selection.activeTimeframe,
    lastResponseId: args.responseId,
    lastMessagePreview: args.preview ?? memoryThread.lastMessagePreview,
    updatedAt: new Date().toISOString(),
  });
}
