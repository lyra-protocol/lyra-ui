import { getAiRequestContext } from "@/core/server/ai/auth/request-context";
import { getAiConversationErrorMessage } from "@/core/server/ai/conversation/mappers";
import { getAiThread, renameAiThread } from "@/core/server/ai/conversation/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const requestContext = await getAiRequestContext(request);
    const { threadId } = await params;
    const thread = await getAiThread(threadId, requestContext.workspaceUser.id);
    return Response.json({ thread });
  } catch (error) {
    const message = getAiConversationErrorMessage(error) || "Unable to load AI thread.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 404;
    return Response.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const requestContext = await getAiRequestContext(request);
    const { threadId } = await params;
    const payload = (await request.json()) as { title?: string };
    if (!payload.title?.trim()) {
      return Response.json({ error: "Title is required." }, { status: 400 });
    }
    const thread = await renameAiThread(threadId, requestContext.workspaceUser.id, payload.title, "user");
    return Response.json({ thread });
  } catch (error) {
    const message = getAiConversationErrorMessage(error) || "Unable to update AI thread.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
