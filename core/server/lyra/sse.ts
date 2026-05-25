import "server-only";

import type { LyraAgentEvent } from "@/core/server/lyra/types";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
} as const;

function encodeEvent(event: LyraAgentEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export function createEventStream(events: LyraAgentEvent[]): Response {
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encodeEvent(event));
      }

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 25_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(body, { headers: SSE_HEADERS });
}

export function createErrorEventStream(message: string): Response {
  return createEventStream([
    {
      type: "error",
      content: message,
      ts: new Date().toISOString(),
    },
  ]);
}
