import { AiTriggerSignal } from "@/core/ai/types";
import { getAiRequestContext } from "@/core/server/ai/auth/request-context";
import { evaluateAiTriggerSignal } from "@/core/server/ai/triggers/evaluate-signal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateSignal(input: Partial<AiTriggerSignal>) {
  if (!input.type || !["price_move", "volatility_spike", "position_risk", "market_opportunity"].includes(input.type)) {
    throw new Error("Unsupported trigger type.");
  }
  if (!input.productId) {
    throw new Error("productId is required.");
  }
  if (!input.timeframe || !["15m", "1h", "4h", "1d"].includes(input.timeframe)) {
    throw new Error("Unsupported timeframe.");
  }
  if (!input.summary?.trim()) {
    throw new Error("summary is required.");
  }

  return {
    type: input.type,
    productId: input.productId,
    timeframe: input.timeframe,
    summary: input.summary.trim(),
    metrics: input.metrics ?? {},
  } satisfies AiTriggerSignal;
}

export async function POST(request: Request) {
  try {
    const requestContext = await getAiRequestContext(request);
    const payload = (await request.json()) as {
      signal?: Partial<AiTriggerSignal>;
      workspaceId?: string | null;
    };
    const signal = validateSignal(payload.signal ?? {});

    const result = await evaluateAiTriggerSignal(requestContext, signal, payload.workspaceId);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to evaluate AI trigger.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
