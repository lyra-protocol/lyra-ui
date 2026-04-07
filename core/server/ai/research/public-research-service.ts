import "server-only";

import { AiResearchResult } from "@/core/ai/types";
import { getServerEnv } from "@/core/config/server-env";
import { searchIndexedDocuments } from "@/core/server/ai/retrieval/azure-ai-search-service";

export async function searchPublicMarketResearch(query: string): Promise<AiResearchResult> {
  const env = getServerEnv();

  if (env.azureFoundryProjectEndpoint && env.azureFoundryAgentId && env.azureFoundryBingConnectionName) {
    return {
      source: "disabled",
      enabled: false,
      query,
      summary:
        "Azure Foundry web-grounded research is configured at the environment layer but not wired into this build yet.",
      citations: [],
    };
  }

  if (env.azureAiSearchEndpoint && env.azureAiSearchApiKey && env.azureAiSearchIndexName) {
    const results = await searchIndexedDocuments(query);
    return {
      source: "azure_ai_search",
      enabled: true,
      query,
      summary:
        results.length > 0
          ? `Retrieved ${results.length} indexed documents relevant to the query.`
          : "No indexed research documents matched the query.",
      citations: results.slice(0, 5).map((item) => ({
        title: String(item.title ?? item.id ?? "Indexed document"),
        url: item.url ? String(item.url) : undefined,
        snippet: item.content ? String(item.content).slice(0, 240) : undefined,
      })),
    };
  }

  return {
    source: "disabled",
    enabled: false,
    query,
    summary:
      "External research is not configured yet. Use internal workspace and market tools, or connect Azure Foundry web search or Azure AI Search.",
    citations: [],
  };
}
