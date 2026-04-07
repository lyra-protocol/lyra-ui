import { AiChatRequest } from "@/core/ai/types";
import { AiSignalSummary } from "@/core/ai/signal";
import { isAzureOpenAiConfigured } from "@/core/server/ai/azure-openai-client";
import { getAiRequestContext } from "@/core/server/ai/auth/request-context";
import { streamAiChat } from "@/core/server/ai/chat/stream-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_TIMEFRAMES = new Set(["15m", "1h", "4h", "1d"]);

function validatePayload(input: Partial<AiChatRequest>) {
  if (!input.message?.trim()) {
    throw new Error("Message is required.");
  }
  if (!input.selection?.activeProductId) {
    throw new Error("Active market is required.");
  }
  if (!input.selection.activeTimeframe || !SUPPORTED_TIMEFRAMES.has(input.selection.activeTimeframe)) {
    throw new Error("Unsupported timeframe.");
  }

  return {
    message: input.message.trim(),
    selection: input.selection,
    stream: input.stream !== false,
  } satisfies AiChatRequest;
}

function createSseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function handleNonStreamingChat(request: Request, payload: AiChatRequest) {
  const requestContext = await getAiRequestContext(request);
  const result = {
    threadId: "",
    responseId: null as string | null,
    content: "",
    toolCalls: [] as Array<{ name: string; callId: string }>,
    signal: null as AiSignalSummary | null,
  };

  await streamAiChat(requestContext, payload, {
    onThread: ({ threadId }) => {
      result.threadId = threadId;
    },
    onTextDelta: ({ delta }) => {
      result.content += delta;
    },
    onToolCall: ({ name, callId }) => {
      result.toolCalls.push({ name, callId });
    },
    onToolResult: () => undefined,
    onDone: ({ threadId, responseId, content, signal }) => {
      result.threadId = threadId;
      result.responseId = responseId;
      result.content = content;
      result.signal = signal ?? null;
    },
  });

  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    if (!isAzureOpenAiConfigured()) {
      return Response.json({ error: "Azure OpenAI is not configured." }, { status: 503 });
    }

    const payload = validatePayload((await request.json()) as Partial<AiChatRequest>);
    if (!payload.stream) {
      return handleNonStreamingChat(request, payload);
    }

    const requestContext = await getAiRequestContext(request);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(createSseEvent(event, data)));
        };

        try {
          await streamAiChat(requestContext, payload, {
            onThread: (data) => send("thread", data),
            onTextDelta: (data) => send("delta", data),
            onToolCall: (data) => send("tool_call", data),
            onToolResult: (data) => send("tool_result", data),
            onDone: (data) => send("done", data),
          });
        } catch (error) {
          send("error", {
            message: error instanceof Error ? error.message : "Unable to stream AI response.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initialize AI chat.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
