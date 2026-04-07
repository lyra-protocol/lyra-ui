import "server-only";

import { listAiMessages, listAiThreads } from "@/core/server/ai/conversation/repository";

type ThreadMemoryMatch = {
  threadId: string;
  title: string;
  snippet: string;
  createdAt: string;
};

function scoreText(content: string, query: string) {
  const haystack = content.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

export async function searchThreadMemory(args: {
  workspaceUserId: string;
  query: string;
  excludeThreadId?: string | null;
}) {
  const threads = await listAiThreads(args.workspaceUserId);
  const candidates = threads.filter((thread) => thread.id !== args.excludeThreadId).slice(0, 12);
  const results: ThreadMemoryMatch[] = [];

  for (const thread of candidates) {
    const messages = await listAiMessages(thread.id);
    const relevant = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        score: scoreText(`${thread.title} ${message.content}`, args.query),
        message,
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 1);

    if (relevant.length === 0) {
      continue;
    }

    results.push({
      threadId: thread.id,
      title: thread.title,
      snippet: relevant[0].message.content.slice(0, 220),
      createdAt: relevant[0].message.createdAt,
    });
  }

  return results
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);
}
