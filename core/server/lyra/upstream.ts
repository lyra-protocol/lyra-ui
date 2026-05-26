import "server-only";

import { getLyraAgentConfig, shouldTryAgentProxy } from "@/core/server/lyra/config";

type AgentJsonResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status?: number; data?: unknown; error: string };

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "unknown");
}

export async function fetchAgentJson(path: string): Promise<AgentJsonResult> {
  if (!shouldTryAgentProxy()) {
    return { ok: false, error: "Agent proxy disabled" };
  }

  const config = getLyraAgentConfig();
  try {
    const response = await fetch(`${config.upstreamUrl}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(config.upstreamTimeoutMs),
    });
    const data = await safeJson(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data,
        error: `Agent ${path} ${response.status}`,
      };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function fetchAgentEventStream(): Promise<Response | null> {
  if (!shouldTryAgentProxy()) return null;

  const config = getLyraAgentConfig();
  try {
    const upstream = await fetch(`${config.upstreamUrl}/stream`, {
      headers: { Accept: "text/event-stream" },
      cache: "no-store",
      signal: AbortSignal.timeout(config.upstreamTimeoutMs),
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !upstream.body || !contentType.includes("text/event-stream")) {
      return null;
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return null;
  }
}
