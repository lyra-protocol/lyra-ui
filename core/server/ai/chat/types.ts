import { AiSignalSummary } from "@/core/ai/signal";

export type AiChatStreamCallbacks = {
  onThread: (payload: { threadId: string }) => void;
  onTextDelta: (payload: { delta: string }) => void;
  onToolCall: (payload: { name: string; callId: string }) => void;
  onToolResult: (payload: { name: string; callId: string; output: Record<string, unknown> }) => void;
  onDone: (payload: {
    threadId: string;
    responseId: string | null;
    content: string;
    signal?: AiSignalSummary | null;
  }) => void;
};
