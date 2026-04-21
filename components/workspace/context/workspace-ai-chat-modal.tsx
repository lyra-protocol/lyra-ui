"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useAiCommandSubmission } from "@/hooks/use-ai-command-submission";
import { useAiThreadMessages } from "@/hooks/use-ai-thread-messages";
import { useAiThreads } from "@/hooks/use-ai-threads";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { useAiStore } from "@/stores/ai-store";
import { usePaperPositions } from "@/hooks/use-paper-positions";
import { useAiTradeEntryStore } from "@/stores/ai-trade-entry-store";
import { buildTurnsFromInsights, buildTurnsFromMessages, mergeChatTurns } from "@/components/workspace/context/ai-chat-turns";
import { AiSignalCard } from "@/components/workspace/context/ai-signal-card";
import { useUIStore } from "@/stores/ui-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "0px";
  element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
}

export function WorkspaceAiChatModal() {
  const open = useUIStore((s) => s.aiChatOpen);
  const close = useUIStore((s) => s.closeAiChat);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState("");

  const { submitAiCommand } = useAiCommandSubmission();
  const auth = useWorkspaceAuth();
  const { threads } = useAiThreads();
  const positions = usePaperPositions();
  const currentThreadId = useAiStore((state) => state.currentThreadId);
  const liveInsights = useAiStore((state) => state.insights);
  const messagesQuery = useAiThreadMessages(currentThreadId);
  const openTradeEntry = useAiTradeEntryStore((state) => state.open);

  const persistedTurns = useMemo(
    () =>
      buildTurnsFromMessages(
        (messagesQuery.data?.messages ?? []).filter((message) => message.role === "user" || message.role === "assistant")
      ),
    [messagesQuery.data?.messages]
  );
  const localTurns = useMemo(() => buildTurnsFromInsights(liveInsights, currentThreadId), [currentThreadId, liveInsights]);
  const turns = useMemo(() => mergeChatTurns(persistedTurns, localTurns), [persistedTurns, localTurns]);
  const currentThread = threads.find((t) => t.id === currentThreadId) ?? null;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => resizeTextarea(inputRef.current), [prompt]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, open]);

  const runPrompt = async (value: string) => {
    const nextPrompt = value.trim();
    if (!nextPrompt) return;
    setPrompt("");
    await submitAiCommand(nextPrompt);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runPrompt(prompt);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void runPrompt(prompt);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : close())}>
      <DialogContent className="h-[100dvh] w-[100dvw] max-w-none translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-none border-0 shadow-none">
        <DialogHeader className="border-b border-[var(--line)] bg-[var(--panel)]">
          <DialogTitle>Assistant</DialogTitle>
          <p className="text-[11px] text-foreground/45">{currentThread?.title ?? "New thread"}</p>
        </DialogHeader>

        <div className="flex h-full min-h-0 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {turns.length === 0 ? (
              <div className="mx-auto flex h-full max-w-[720px] items-center justify-center">
                <p className="text-center text-[13px] leading-[1.55] text-foreground/55">
                  Ask about the current market, your position, or what to watch next.{" "}
                  <span className="text-foreground/40">Setups only appear inside</span>{" "}
                  <code className="rounded border border-[var(--line)] px-1 font-mono text-[12px] text-foreground/55">
                    {"<signal>…</signal>"}
                  </code>
                  .
                </p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-[720px] flex-col gap-3">
                {turns.map((turn) => (
                  <div key={turn.id} className="space-y-2">
                    {turn.prompt ? (
                      <div className="flex justify-end">
                        <div className="max-w-[78%] border border-[var(--line-strong)] bg-foreground/[0.04] px-3 py-2">
                          <p className="text-[13px] leading-[1.5] text-foreground/88">{turn.prompt}</p>
                        </div>
                      </div>
                    ) : null}
                    <AiSignalCard
                      content={turn.response}
                      signal={turn.signal}
                      status={turn.status}
                      onEnterTrade={
                        turn.signal && !positions.some((position) => position.productId === turn.signal?.productId)
                          ? openTradeEntry
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-[var(--line)] px-4 py-4">
            <div className="mx-auto flex max-w-[720px] items-end gap-2 border border-[var(--line-strong)] bg-background px-3 py-2">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={auth.authenticated ? "Message…" : "Connect wallet to ask…"}
                className="max-h-[160px] min-h-[28px] flex-1 resize-none overflow-y-auto bg-transparent text-[13px] leading-6 text-foreground outline-none placeholder:text-[var(--placeholder)]"
              />
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center bg-foreground text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

