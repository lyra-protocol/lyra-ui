import { getAiRequestContext } from "@/core/server/ai/auth/request-context";
import { getAiConversationErrorMessage } from "@/core/server/ai/conversation/mappers";
import { getAiThread, listAiMessages } from "@/core/server/ai/conversation/repository";
import { isAiConversationUsingMemoryStore } from "@/core/server/ai/conversation/storage-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const requestContext = await getAiRequestContext(request);
    const { threadId } = await params;
    await getAiThread(threadId, requestContext.workspaceUser.id);
    const messages = await listAiMessages(threadId);
    return Response.json({ messages });
  } catch (error) {
    const message = getAiConversationErrorMessage(error) || "Unable to load AI messages.";
    if (isAiConversationUsingMemoryStore() && message.toLowerCase().includes("thread not found")) {
      return Response.json({ messages: [] });
    }
    const status = message.toLowerCase().includes("bearer") ? 401 : 404;
    return Response.json({ error: message }, { status });
  }
}
