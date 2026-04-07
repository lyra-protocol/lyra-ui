import { randomUUID } from "node:crypto";
import { AiAlert, AiMessage, AiThread, AiWorkspaceSelection } from "@/core/ai/types";

const memoryThreadsById = new Map<string, AiThread>();
const memoryThreadKeys = new Map<string, string>();
const memoryMessages = new Map<string, AiMessage[]>();
const memoryAlerts = new Map<string, AiAlert[]>();

function getMemoryThreadKey(workspaceUserId: string, workspaceId: string) {
  return `${workspaceUserId}:${workspaceId}`;
}

export function ensureMemoryThread(workspaceUserId: string, selection: AiWorkspaceSelection) {
  const workspaceId = selection.workspaceId ?? "default";
  const key = getMemoryThreadKey(workspaceUserId, workspaceId);
  const existingThreadId = memoryThreadKeys.get(key);
  const existing = existingThreadId ? memoryThreadsById.get(existingThreadId) : null;
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const thread: AiThread = {
    id: randomUUID(),
    workspaceUserId,
    workspaceId,
    title: "New thread",
    titleSource: "system",
    lastMessagePreview: null,
    activeProductId: selection.activeProductId,
    activeTimeframe: selection.activeTimeframe,
    lastResponseId: null,
    createdAt: now,
    updatedAt: now,
  };
  memoryThreadsById.set(thread.id, thread);
  memoryThreadKeys.set(key, thread.id);
  return thread;
}

export function createMemoryThread(workspaceUserId: string, selection: AiWorkspaceSelection) {
  return createMemoryThreadWithId(randomUUID(), workspaceUserId, selection);
}

export function createMemoryThreadWithId(
  threadId: string,
  workspaceUserId: string,
  selection: AiWorkspaceSelection
) {
  const workspaceId = selection.workspaceId ?? "default";
  const now = new Date().toISOString();
  const thread: AiThread = {
    id: threadId,
    workspaceUserId,
    workspaceId,
    title: "New thread",
    titleSource: "system",
    lastMessagePreview: null,
    activeProductId: selection.activeProductId,
    activeTimeframe: selection.activeTimeframe,
    lastResponseId: null,
    createdAt: now,
    updatedAt: now,
  };
  memoryThreadsById.set(thread.id, thread);
  memoryThreadKeys.set(getMemoryThreadKey(workspaceUserId, workspaceId), thread.id);
  return thread;
}

export function getMemoryThreadById(threadId: string) {
  return memoryThreadsById.get(threadId) ?? null;
}

export function setMemoryThread(thread: AiThread) {
  memoryThreadsById.set(thread.id, thread);
  memoryThreadKeys.set(getMemoryThreadKey(thread.workspaceUserId, thread.workspaceId), thread.id);
}

export function listMemoryThreads(workspaceUserId: string) {
  return [...memoryThreadsById.values()]
    .filter((thread) => thread.workspaceUserId === workspaceUserId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function setMemoryMessages(threadId: string, messages: AiMessage[]) {
  memoryMessages.set(threadId, messages);
}

export function getMemoryMessages(threadId: string) {
  return memoryMessages.get(threadId) ?? [];
}

export function setMemoryAlerts(workspaceUserId: string, alerts: AiAlert[]) {
  memoryAlerts.set(workspaceUserId, alerts);
}

export function getMemoryAlerts(workspaceUserId: string) {
  return memoryAlerts.get(workspaceUserId) ?? [];
}
