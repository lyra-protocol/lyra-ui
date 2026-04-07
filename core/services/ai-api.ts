import { AiAlert, AiChatRequest, AiMessage, AiThread } from "@/core/ai/types";
import { AiSignalSummary } from "@/core/ai/signal";
import { AiOpportunitySettings } from "@/core/paper/types";

type WorkspaceRequestIdentity = {
  walletAddress?: string | null;
  email?: string | null;
  displayName?: string | null;
};

type StreamHandlers = {
  onThread?: (payload: { threadId: string }) => void;
  onDelta?: (payload: { delta: string }) => void;
  onToolCall?: (payload: { name: string; callId: string }) => void;
  onToolResult?: (payload: { name: string; callId: string; output: Record<string, unknown> }) => void;
  onDone?: (payload: {
    threadId: string;
    responseId: string | null;
    content: string;
    signal?: AiSignalSummary | null;
  }) => void;
};

function buildWorkspaceHeaders(accessToken: string, identity?: WorkspaceRequestIdentity) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (identity?.walletAddress) headers.set("x-wallet-address", identity.walletAddress);
  if (identity?.email) headers.set("x-user-email", identity.email);
  if (identity?.displayName) headers.set("x-user-name", identity.displayName);
  return headers;
}

async function requestJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
  identity?: WorkspaceRequestIdentity
) {
  const response = await fetch(path, {
    ...init,
    headers: buildWorkspaceHeaders(accessToken, identity),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function dispatchStreamEvent(event: string, data: string, handlers: StreamHandlers) {
  const payload = JSON.parse(data) as Record<string, unknown>;
  if (event === "thread") handlers.onThread?.({ threadId: String(payload.threadId ?? "") });
  if (event === "delta") handlers.onDelta?.({ delta: String(payload.delta ?? "") });
  if (event === "tool_call") {
    handlers.onToolCall?.({
      name: String(payload.name ?? "tool"),
      callId: String(payload.callId ?? ""),
    });
  }
  if (event === "tool_result") {
    handlers.onToolResult?.({
      name: String(payload.name ?? "tool"),
      callId: String(payload.callId ?? ""),
      output: (payload.output as Record<string, unknown> | undefined) ?? {},
    });
  }
  if (event === "done") {
    handlers.onDone?.({
      threadId: String(payload.threadId ?? ""),
      responseId: (payload.responseId as string | null | undefined) ?? null,
      content: String(payload.content ?? ""),
      signal: (payload.signal as AiSignalSummary | null | undefined) ?? null,
    });
  }
  if (event === "error") {
    throw new Error(String(payload.message ?? "Unable to stream AI response."));
  }
}

export async function streamLyraAiChat(
  accessToken: string,
  input: AiChatRequest,
  identity: WorkspaceRequestIdentity,
  handlers: StreamHandlers
) {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: buildWorkspaceHeaders(accessToken, identity),
    body: JSON.stringify({ ...input, stream: true }),
  });

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const lines = rawEvent.split("\n");
      const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (data) {
        dispatchStreamEvent(event, data, handlers);
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}

export function fetchAiAlerts(accessToken: string, identity: WorkspaceRequestIdentity) {
  return requestJson<{ alerts: AiAlert[] }>("/api/ai/alerts", accessToken, undefined, identity);
}

export function fetchAiThreads(accessToken: string, identity: WorkspaceRequestIdentity) {
  return requestJson<{ threads: AiThread[] }>("/api/ai/threads", accessToken, undefined, identity);
}

export function createAiThreadRequest(
  accessToken: string,
  body: Pick<AiChatRequest, "selection">,
  identity: WorkspaceRequestIdentity
) {
  return requestJson<{ thread: AiThread }>(
    "/api/ai/threads",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    identity
  );
}

export function renameAiThreadRequest(
  accessToken: string,
  threadId: string,
  title: string,
  identity: WorkspaceRequestIdentity
) {
  return requestJson<{ thread: AiThread }>(
    `/api/ai/threads/${threadId}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({ title }),
    },
    identity
  );
}

export function fetchAiThreadMessages(
  accessToken: string,
  threadId: string,
  identity: WorkspaceRequestIdentity
) {
  return requestJson<{ messages: AiMessage[] }>(
    `/api/ai/threads/${threadId}/messages`,
    accessToken,
    undefined,
    identity
  );
}

export function dismissAiAlert(
  accessToken: string,
  alertId: string,
  identity: WorkspaceRequestIdentity
) {
  return requestJson<{ alert: AiAlert | null }>(
    "/api/ai/alerts",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ alertId }),
    },
    identity
  );
}

export function updateAiOpportunitySettingsRequest(
  accessToken: string,
  settings: Partial<AiOpportunitySettings>,
  identity: WorkspaceRequestIdentity
) {
  return requestJson<{ settings: AiOpportunitySettings }>(
    "/api/ai/settings/opportunities",
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(settings),
    },
    identity
  );
}
