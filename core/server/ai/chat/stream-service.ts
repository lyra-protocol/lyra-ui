import "server-only";

import type { ResponseFunctionToolCall, ResponseInputItem } from "openai/resources/responses/responses";
import { AiChatRequest, JsonObject } from "@/core/ai/types";
import {
  canUseResponsesApi,
  getAzureOpenAiClient,
  getAzureOpenAiModel,
  isResponsesApiUnsupportedError,
  markResponsesApiUnsupported,
} from "@/core/server/ai/azure-openai-client";
import { getAiFunctionTools, executeAiToolCall } from "@/core/server/ai/tools/registry";
import { buildLyraAssistantInstructions } from "@/core/server/ai/instructions";
import { loadAiWorkspaceContext } from "@/core/server/ai/context/workspace-context-service";
import {
  appendAiMessage,
  ensureAiThread,
  renameAiThread,
  updateAiThreadState,
} from "@/core/server/ai/conversation/repository";
import { AiRequestContext } from "@/core/server/ai/auth/request-context";
import { AiChatStreamCallbacks } from "@/core/server/ai/chat/types";
import { streamAiChatWithChatCompletions } from "@/core/server/ai/chat/chat-completions-fallback";
import { generateAiThreadTitle } from "@/core/server/ai/chat/thread-title-service";

const MAX_TOOL_CYCLES = 6;

function extractFunctionCalls(output: Array<{ type?: string }>) {
  return output.filter((item): item is ResponseFunctionToolCall => item.type === "function_call");
}

function buildUserInput(message: string): ResponseInputItem[] {
  return [
    {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message }],
    },
  ];
}

function buildFunctionOutput(callId: string, output: Record<string, unknown>): ResponseInputItem {
  return {
    type: "function_call_output",
    call_id: callId,
    output: JSON.stringify(output),
  };
}

function shouldRetryWithoutPreviousResponse(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("previous_response_id") || message.includes("response not found");
}

async function runModelCycle(args: {
  input: string | ResponseInputItem[];
  instructions: string;
  previousResponseId: string | null;
  callbacks: AiChatStreamCallbacks;
}) {
  const stream = getAzureOpenAiClient().responses.stream({
    model: getAzureOpenAiModel(),
    instructions: args.instructions,
    input: args.input,
    previous_response_id: args.previousResponseId,
    tools: getAiFunctionTools(),
    tool_choice: "auto",
    max_output_tokens: 1400,
  });

  let outputText = "";
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      outputText += event.delta;
      args.callbacks.onTextDelta({ delta: event.delta });
    }
  }

  const response = await stream.finalResponse();
  return {
    response,
    outputText: outputText || response.output_text || "",
    functionCalls: extractFunctionCalls(response.output),
  };
}

export async function streamAiChat(
  requestContext: AiRequestContext,
  payload: AiChatRequest,
  callbacks: AiChatStreamCallbacks
) {
  const context = await loadAiWorkspaceContext(requestContext.identitySeed, payload.selection);
  const instructions = buildLyraAssistantInstructions(context);
  const thread = await ensureAiThread(
    requestContext.workspaceUser.id,
    payload.selection,
    payload.threadId ?? null
  );

  callbacks.onThread({ threadId: thread.id });
  await appendAiMessage({
    threadId: thread.id,
    workspaceUserId: requestContext.workspaceUser.id,
    role: "user",
    content: payload.message,
    metadata: { selection: payload.selection },
  });

  let previousResponseId = thread.lastResponseId;
  let cycleInput: string | ResponseInputItem[] = buildUserInput(payload.message);
  let assistantText = "";

  if (!canUseResponsesApi()) {
    const fallback = await streamAiChatWithChatCompletions({
      payload,
      thread,
      context,
      instructions,
      callbacks,
    });
    const finalText = fallback.content.trim();
    await appendAiMessage({
      threadId: thread.id,
      workspaceUserId: requestContext.workspaceUser.id,
      role: "assistant",
      content: finalText,
      metadata: { responseId: fallback.responseId, signal: fallback.signal ?? null },
    });
    await updateAiThreadState({
      threadId: thread.id,
      workspaceUserId: requestContext.workspaceUser.id,
      selection: payload.selection,
      responseId: fallback.responseId,
      preview: finalText.slice(0, 180),
    });
    if (thread.titleSource === "system" && finalText) {
      try {
        const title = await generateAiThreadTitle({
          market: context.market.symbol || context.market.productId,
          timeframe: payload.selection.activeTimeframe,
          userMessage: payload.message,
          assistantReply: finalText,
        });
        await renameAiThread(thread.id, requestContext.workspaceUser.id, title, "ai");
      } catch {
        // Ignore title generation failures; the thread remains usable.
      }
    }
    callbacks.onDone({
      threadId: thread.id,
      responseId: fallback.responseId,
      content: finalText,
      signal: fallback.signal ?? null,
    });
    return;
  }

  for (let cycle = 0; cycle < MAX_TOOL_CYCLES; cycle += 1) {
    let modelCycle;
    try {
      modelCycle = await runModelCycle({
        input: cycleInput,
        instructions,
        previousResponseId,
        callbacks,
      });
    } catch (error) {
      if (isResponsesApiUnsupportedError(error)) {
        markResponsesApiUnsupported();
        const fallback = await streamAiChatWithChatCompletions({
          payload,
          thread,
          context,
          instructions,
          callbacks,
        });
        const finalText = fallback.content.trim();
        await appendAiMessage({
          threadId: thread.id,
          workspaceUserId: requestContext.workspaceUser.id,
          role: "assistant",
          content: finalText,
          metadata: { responseId: fallback.responseId, signal: fallback.signal ?? null },
        });
        await updateAiThreadState({
          threadId: thread.id,
          workspaceUserId: requestContext.workspaceUser.id,
          selection: payload.selection,
          responseId: fallback.responseId,
          preview: finalText.slice(0, 180),
        });
        if (thread.titleSource === "system" && finalText) {
          try {
            const title = await generateAiThreadTitle({
              market: context.market.symbol || context.market.productId,
              timeframe: payload.selection.activeTimeframe,
              userMessage: payload.message,
              assistantReply: finalText,
            });
            await renameAiThread(thread.id, requestContext.workspaceUser.id, title, "ai");
          } catch {
            // Ignore title generation failures; the thread remains usable.
          }
        }
        callbacks.onDone({
          threadId: thread.id,
          responseId: fallback.responseId,
          content: finalText,
          signal: fallback.signal ?? null,
        });
        return;
      }
      if (cycle === 0 && previousResponseId && shouldRetryWithoutPreviousResponse(error)) {
        previousResponseId = null;
        cycleInput = buildUserInput(payload.message);
        continue;
      }
      throw error;
    }

    previousResponseId = modelCycle.response.id;
    assistantText += modelCycle.outputText;

    if (modelCycle.functionCalls.length === 0) {
      const finalText = assistantText.trim();
      await appendAiMessage({
        threadId: thread.id,
        workspaceUserId: requestContext.workspaceUser.id,
        role: "assistant",
        content: finalText,
        metadata: { responseId: previousResponseId },
      });
      await updateAiThreadState({
        threadId: thread.id,
        workspaceUserId: requestContext.workspaceUser.id,
        selection: payload.selection,
        responseId: previousResponseId,
        preview: finalText.slice(0, 180),
      });
      if (thread.titleSource === "system" && finalText) {
        try {
          const title = await generateAiThreadTitle({
            market: context.market.symbol || context.market.productId,
            timeframe: payload.selection.activeTimeframe,
            userMessage: payload.message,
            assistantReply: finalText,
          });
          await renameAiThread(thread.id, requestContext.workspaceUser.id, title, "ai");
        } catch {
          // Ignore title generation failures; the thread remains usable.
        }
      }
      callbacks.onDone({
        threadId: thread.id,
        responseId: previousResponseId,
        content: finalText,
        signal: null,
      });
      return;
    }

    const nextInput: ResponseInputItem[] = [];
    for (const call of modelCycle.functionCalls) {
      callbacks.onToolCall({ name: call.name, callId: call.call_id });
      const execution = await executeAiToolCall(call, {
        identitySeed: requestContext.identitySeed,
        workspaceUserId: requestContext.workspaceUser.id,
        selection: payload.selection,
        context,
      });
      await appendAiMessage({
        threadId: thread.id,
        workspaceUserId: requestContext.workspaceUser.id,
        role: "tool",
        content: JSON.stringify(execution.result),
        toolName: call.name,
        toolCallId: call.call_id,
        metadata: execution.args as JsonObject,
      });
      callbacks.onToolResult({
        name: call.name,
        callId: call.call_id,
        output: execution.result,
      });
      nextInput.push(buildFunctionOutput(call.call_id, execution.result));
    }

    cycleInput = nextInput;
  }

  throw new Error("AI tool orchestration exceeded the maximum number of cycles.");
}
