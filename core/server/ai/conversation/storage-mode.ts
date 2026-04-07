let aiConversationStorageMode: "unknown" | "database" | "memory" = "unknown";

export function shouldUseDatabaseConversationStore() {
  return aiConversationStorageMode !== "memory";
}

export function isAiConversationUsingMemoryStore() {
  return aiConversationStorageMode === "memory";
}

export function markAiConversationStorageAvailable() {
  if (aiConversationStorageMode === "unknown") {
    aiConversationStorageMode = "database";
  }
}

export function markAiConversationStorageUnavailable() {
  aiConversationStorageMode = "memory";
}
