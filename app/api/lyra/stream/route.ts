import { createErrorEventStream, createEventStream } from "@/core/server/lyra/sse";
import { runVercelAgentTick } from "@/core/server/lyra/tick";
import { fetchAgentEventStream } from "@/core/server/lyra/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const upstream = await fetchAgentEventStream();
  if (upstream) return upstream;

  try {
    const tick = await runVercelAgentTick();
    return createEventStream(tick.events);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vercel agent tick failed";
    return createErrorEventStream(message);
  }
}
