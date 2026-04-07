import { AiSignalSummary } from "@/core/ai/signal";
import { AiInsight } from "@/stores/ai-store";

export type ChatTurn = {
  id: string;
  prompt: string;
  response: string;
  signal: AiSignalSummary | null;
  createdAt: string;
  status: "complete" | "streaming" | "error";
};

type ThreadMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

function withinWindow(left: string, right: string) {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) {
    return false;
  }
  return Math.abs(leftMs - rightMs) <= 5 * 60 * 1000;
}

function responsesMatch(left: string, right: string) {
  if (!left || !right) {
    return false;
  }
  return left === right || left.startsWith(right) || right.startsWith(left);
}

function responseCompatible(left: string, right: string) {
  if (!left || !right) {
    return !left || !right;
  }
  return responsesMatch(left, right);
}

function turnsMatch(left: ChatTurn, right: ChatTurn) {
  if (left.id === right.id) {
    return true;
  }

  if (
    left.prompt &&
    right.prompt &&
    left.prompt === right.prompt &&
    responseCompatible(left.response, right.response) &&
    withinWindow(left.createdAt, right.createdAt)
  ) {
    return true;
  }

  if (!left.prompt && !right.prompt && responsesMatch(left.response, right.response) && withinWindow(left.createdAt, right.createdAt)) {
    return true;
  }

  return false;
}

function preferTurn(left: ChatTurn, right: ChatTurn) {
  const betterResponse = right.response.length >= left.response.length ? right.response : left.response;
  const betterSignal = right.signal ?? left.signal;
  const betterStatus =
    left.status === "error" || right.status === "error"
      ? "error"
      : left.status === "streaming" || right.status === "streaming"
        ? "streaming"
        : "complete";

  return {
    ...left,
    ...right,
    prompt: right.prompt || left.prompt,
    response: betterResponse,
    signal: betterSignal,
    status: betterStatus,
    createdAt: left.createdAt < right.createdAt ? left.createdAt : right.createdAt,
  } satisfies ChatTurn;
}

export function buildTurnsFromMessages(messages: ThreadMessage[]) {
  const turns: ChatTurn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({
        id: message.id,
        prompt: message.content,
        response: "",
        signal: null,
        createdAt: message.createdAt,
        status: "complete",
      });
      continue;
    }

    if (message.role !== "assistant") {
      continue;
    }

    const signal = (message.metadata?.signal as AiSignalSummary | null | undefined) ?? null;
    const previous = turns[turns.length - 1];
    if (previous && !previous.response) {
      previous.response = message.content;
      previous.signal = signal;
    } else {
      turns.push({
        id: message.id,
        prompt: "",
        response: message.content,
        signal,
        createdAt: message.createdAt,
        status: "complete",
      });
    }
  }
  return turns;
}

export function buildTurnsFromInsights(insights: AiInsight[], threadId: string | null) {
  return insights
    .filter((item) => item.threadId === threadId)
    .map((item) => ({
      id: item.id,
      prompt: item.prompt,
      response: item.content,
      signal: item.signal ?? null,
      createdAt: item.createdAt,
      status: item.status,
    }));
}

export function mergeChatTurns(persistedTurns: ChatTurn[], localTurns: ChatTurn[]) {
  const merged = [...persistedTurns];

  for (const turn of localTurns) {
    const matchIndex = merged.findIndex((candidate) => turnsMatch(candidate, turn));
    if (matchIndex === -1) {
      merged.push(turn);
      continue;
    }
    merged[matchIndex] = preferTurn(merged[matchIndex], turn);
  }

  return merged.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
