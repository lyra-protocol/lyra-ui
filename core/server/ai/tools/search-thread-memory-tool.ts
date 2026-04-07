import { searchThreadMemory } from "@/core/server/ai/retrieval/thread-memory-search-service";
import { AiToolDefinition } from "@/core/server/ai/tools/types";

export const searchThreadMemoryTool: AiToolDefinition<{ query: string }> = {
  name: "search_thread_memory",
  description:
    "Search previous Lyra AI threads and replies for related context when earlier analysis might help answer the current request.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The concept, market setup, or earlier discussion to search for.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async execute(args, context) {
    return {
      query: args.query,
      matches: await searchThreadMemory({
        workspaceUserId: context.workspaceUserId,
        query: args.query,
        excludeThreadId: undefined,
      }),
    };
  },
};
