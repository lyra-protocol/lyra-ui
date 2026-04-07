import { searchPublicMarketResearch } from "@/core/server/ai/research/public-research-service";
import { AiToolDefinition } from "@/core/server/ai/tools/types";

type Args = {
  query: string;
};

export const searchPublicWebTool: AiToolDefinition<Args> = {
  name: "search_public_web",
  description: "Search fresh public market context when recent external information is needed. Returns a disabled status if no research provider is configured.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The external research question or search query." },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async execute(args) {
    return searchPublicMarketResearch(args.query);
  },
};
