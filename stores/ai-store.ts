import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AiSignalSummary, getAiSignalFromAlert } from "@/core/ai/signal";
import { AiAlert, AiThread } from "@/core/ai/types";
import { MarketTimeframe } from "@/core/market/types";

export type AiInsight = {
  id: string;
  source: "user" | "trigger";
  threadId: string | null;
  prompt: string;
  content: string;
  productId: string;
  timeframe: MarketTimeframe;
  signal?: AiSignalSummary | null;
  status: "streaming" | "complete" | "error";
  createdAt: string;
};

type AiStore = {
  threads: AiThread[];
  currentThreadId: string | null;
  insights: AiInsight[];
  seenAlertIds: string[];
  setThreads: (threads: AiThread[]) => void;
  setCurrentThreadId: (threadId: string | null) => void;
  upsertThread: (thread: AiThread) => void;
  markAlertsSeen: (ids: string[]) => void;
  beginInsight: (input: {
    prompt: string;
    productId: string;
    timeframe: MarketTimeframe;
    threadId: string | null;
  }) => string;
  assignInsightThread: (id: string, threadId: string) => void;
  appendInsightDelta: (id: string, delta: string) => void;
  replaceThreadInsights: (threadId: string, insights: AiInsight[]) => void;
  completeInsight: (id: string, payload: {
    threadId: string | null;
    content: string;
    signal?: AiSignalSummary | null;
  }) => void;
  failInsight: (id: string, message: string) => void;
  prependAlertInsight: (alert: AiAlert) => void;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInsight(input: AiInsight) {
  return input;
}

const MAX_AI_INSIGHTS = 200;

function mergeThreads(remoteThreads: AiThread[], localThreads: AiThread[]) {
  const merged = new Map<string, AiThread>();
  for (const thread of localThreads) merged.set(thread.id, thread);
  for (const thread of remoteThreads) merged.set(thread.id, thread);
  return [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export const useAiStore = create<AiStore>()(
  persist(
    (set) => ({
      threads: [],
      currentThreadId: null,
      insights: [],
      seenAlertIds: [],
      setThreads: (threads) =>
        set((state) => {
          const nextThreads = mergeThreads(threads, state.threads);
          const nextCurrentThreadId =
            state.currentThreadId && nextThreads.some((thread) => thread.id === state.currentThreadId)
              ? state.currentThreadId
              : nextThreads[0]?.id ?? null;
          return { threads: nextThreads, currentThreadId: nextCurrentThreadId };
        }),
      setCurrentThreadId: (threadId) => set({ currentThreadId: threadId }),
      upsertThread: (thread) =>
        set((state) => ({
          threads: mergeThreads([thread], state.threads),
          currentThreadId: state.currentThreadId ?? thread.id,
        })),
      markAlertsSeen: (ids) =>
        set((state) => ({
          seenAlertIds: [...new Set([...state.seenAlertIds, ...ids])].slice(-100),
        })),
      beginInsight: ({ prompt, productId, timeframe, threadId }) => {
        const id = createId();
        set((state) => ({
          insights: [
            createInsight({
              id,
              source: "user",
              threadId,
              prompt,
              content: "",
              productId,
              timeframe,
              status: "streaming",
              createdAt: new Date().toISOString(),
            }),
            ...state.insights,
          ].slice(0, MAX_AI_INSIGHTS),
        }));
        return id;
      },
      assignInsightThread: (id, threadId) =>
        set((state) => ({
          insights: state.insights.map((item) => (item.id === id ? { ...item, threadId } : item)),
          currentThreadId: threadId,
        })),
      appendInsightDelta: (id, delta) =>
        set((state) => ({
          insights: state.insights.map((item) =>
            item.id === id ? { ...item, content: `${item.content}${delta}` } : item
          ),
        })),
      replaceThreadInsights: (threadId, insights) =>
        set((state) => {
          const preserved = state.insights.filter(
            (item) => item.threadId !== threadId || item.source === "trigger"
          );
          return {
            insights: [...insights, ...preserved]
              .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
              .slice(0, MAX_AI_INSIGHTS),
          };
        }),
      completeInsight: (id, payload) =>
        set((state) => ({
          insights: state.insights.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "complete",
                  threadId: payload.threadId ?? item.threadId,
                  content: payload.content || item.content,
                  signal: payload.signal ?? item.signal ?? null,
                }
              : item
          ),
          currentThreadId: payload.threadId ?? state.currentThreadId,
        })),
      failInsight: (id, message) =>
        set((state) => ({
          insights: state.insights.map((item) =>
            item.id === id ? { ...item, status: "error", content: message || item.content } : item
          ),
        })),
      prependAlertInsight: (alert) =>
        set((state) => {
          if (state.insights.some((item) => item.id === alert.id)) {
            return state;
          }
          return {
            insights: [
              createInsight({
                id: alert.id,
                source: "trigger",
                threadId: null,
                prompt: alert.title,
                content: alert.body,
                productId: alert.productId ?? "",
                timeframe: "1h",
                signal: getAiSignalFromAlert(alert),
                status: "complete",
                createdAt: alert.createdAt,
              }),
              ...state.insights,
            ].slice(0, MAX_AI_INSIGHTS),
          };
        }),
    }),
    {
      name: "lyra-ai-store",
      partialize: (state) => ({
        threads: state.threads,
        currentThreadId: state.currentThreadId,
        insights: state.insights,
        seenAlertIds: state.seenAlertIds,
      }),
    }
  )
);
