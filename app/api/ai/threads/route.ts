import { AiChatRequest } from "@/core/ai/types";
import { getAiRequestContext } from "@/core/server/ai/auth/request-context";
import { getAiConversationErrorMessage } from "@/core/server/ai/conversation/mappers";
import { createAiThread, listAiThreads } from "@/core/server/ai/conversation/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_TIMEFRAMES = new Set(["15m", "1h", "4h", "1d"]);

function validateSelection(input: Partial<AiChatRequest>) {
  if (!input.selection?.activeProductId) {
    throw new Error("Active market is required.");
  }
  if (!input.selection.activeTimeframe || !SUPPORTED_TIMEFRAMES.has(input.selection.activeTimeframe)) {
    throw new Error("Unsupported timeframe.");
  }
  return input.selection;
}

export async function GET(request: Request) {
  try {
    const requestContext = await getAiRequestContext(request);
    const threads = await listAiThreads(requestContext.workspaceUser.id);
    return Response.json({ threads });
  } catch (error) {
    const message = getAiConversationErrorMessage(error) || "Unable to load AI threads.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const requestContext = await getAiRequestContext(request);
    const payload = (await request.json()) as Partial<AiChatRequest>;
    const selection = validateSelection(payload);
    const thread = await createAiThread(requestContext.workspaceUser.id, selection);
    return Response.json({ thread });
  } catch (error) {
    const message = getAiConversationErrorMessage(error) || "Unable to create AI thread.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
