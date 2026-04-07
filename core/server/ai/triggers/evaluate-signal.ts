import "server-only";

import { AiTriggerDecision, AiTriggerSignal } from "@/core/ai/types";
import {
  getAzureOpenAiClient,
  getAzureOpenAiModel,
  isAzureOpenAiConfigured,
  isResponsesApiUnsupportedError,
  markResponsesApiUnsupported,
} from "@/core/server/ai/azure-openai-client";
import { loadAiWorkspaceContext } from "@/core/server/ai/context/workspace-context-service";
import { getMultiTimeframeHistorySummary } from "@/core/server/ai/context/market-history-service";
import { createAiAlert } from "@/core/server/ai/conversation/repository";
import { AiRequestContext } from "@/core/server/ai/auth/request-context";

const TRIGGER_DECISION_SCHEMA = {
  type: "object",
  properties: {
    shouldNotify: { type: "boolean" },
    severity: { type: "string", enum: ["low", "medium", "high"] },
    title: { type: "string" },
    body: { type: "string" },
    rationale: { type: "string" },
  },
  required: ["shouldNotify", "severity", "title", "body", "rationale"],
  additionalProperties: false,
};

const TRIGGER_INSTRUCTIONS =
  "You evaluate market triggers for Lyra. Be conservative. Notify only when there is a clear, executable setup with enough alignment, momentum, sensible trigger/invalidation, and usable entry/SL/TP structure. If it is only interesting but not actionable, do not notify. Sound like a sharp trading friend, not a formal analyst. Keep title and body short, clear, and actionable. Return JSON only.";

function parseDecision(outputText: string): AiTriggerDecision {
  const parsed = JSON.parse(outputText) as Partial<AiTriggerDecision>;
  return {
    shouldNotify: Boolean(parsed.shouldNotify),
    severity: parsed.severity === "high" || parsed.severity === "medium" ? parsed.severity : "low",
    title: String(parsed.title ?? "Review market move"),
    body: String(parsed.body ?? "A tracked market event is worth reviewing in Lyra."),
    rationale: String(parsed.rationale ?? "No rationale provided."),
  };
}

export async function evaluateAiTriggerSignal(
  requestContext: AiRequestContext,
  signal: AiTriggerSignal,
  workspaceId?: string | null
) {
  if (!isAzureOpenAiConfigured()) {
    return {
      decision: null,
      alert: null,
      skippedReason: "Azure OpenAI is not configured.",
    };
  }

  const selection = {
    workspaceId,
    activeProductId: signal.productId,
    activeTimeframe: signal.timeframe,
    focusedRegion: "chart",
  };
  const [context, history] = await Promise.all([
    loadAiWorkspaceContext(requestContext.identitySeed, selection),
    getMultiTimeframeHistorySummary(signal.productId, ["15m", "1h", signal.timeframe]),
  ]);

  let decision: AiTriggerDecision;
  try {
    const response = await getAzureOpenAiClient().responses.create({
      model: getAzureOpenAiModel(),
      instructions: TRIGGER_INSTRUCTIONS,
      input: JSON.stringify({ signal, context, history }),
      text: {
        format: {
          type: "json_schema",
          name: "lyra_trigger_decision",
          schema: TRIGGER_DECISION_SCHEMA,
          strict: true,
        },
        verbosity: "low",
      },
      max_output_tokens: 500,
    });
    decision = parseDecision(response.output_text);
  } catch (error) {
    if (!isResponsesApiUnsupportedError(error)) {
      throw error;
    }

    markResponsesApiUnsupported();
    const response = await getAzureOpenAiClient().chat.completions.create({
      model: getAzureOpenAiModel(),
      messages: [
        {
          role: "system",
          content: `${TRIGGER_INSTRUCTIONS} Use fields shouldNotify, severity, title, body, rationale.`,
        },
        {
          role: "user",
          content: JSON.stringify({ signal, context, history }),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });
    decision = parseDecision(response.choices[0]?.message?.content || "{}");
  }

  if (!decision.shouldNotify) {
    return {
      decision,
      alert: null,
      skippedReason: null,
    };
  }

  const alert = await createAiAlert({
    workspaceUserId: requestContext.workspaceUser.id,
    type: `trigger.${signal.type}`,
    title: decision.title,
    body: decision.body,
    productId: signal.productId,
    contextPacket: {
      signal,
      severity: decision.severity,
      rationale: decision.rationale,
      selection: { ...selection, workspaceId: selection.workspaceId ?? null },
    },
  });

  return {
    decision,
    alert,
    skippedReason: null,
  };
}
