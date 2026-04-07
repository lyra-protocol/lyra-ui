import "server-only";

import { getServerEnv } from "@/core/config/server-env";

type IndexedDocument = {
  id: string;
  title?: string;
  content?: string;
  productId?: string;
  sourceType?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type SearchResponse = {
  value?: Array<Record<string, unknown>>;
};

function getAiSearchConfig() {
  const env = getServerEnv();
  return {
    endpoint: env.azureAiSearchEndpoint.replace(/\/+$/, ""),
    apiKey: env.azureAiSearchApiKey,
    indexName: env.azureAiSearchIndexName,
    apiVersion: env.azureAiSearchApiVersion,
  };
}

export function isAzureAiSearchConfigured() {
  const config = getAiSearchConfig();
  return Boolean(config.endpoint && config.apiKey && config.indexName);
}

async function fetchAzureAiSearch<T>(path: string, init: RequestInit) {
  const config = getAiSearchConfig();
  if (!isAzureAiSearchConfigured()) {
    throw new Error("Azure AI Search is not configured.");
  }

  const response = await fetch(
    `${config.endpoint}${path}${path.includes("?") ? "&" : "?"}api-version=${config.apiVersion}`,
    {
      ...init,
      headers: {
        "api-key": config.apiKey,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Azure AI Search request failed (${response.status}): ${body || response.statusText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function searchIndexedDocuments(query: string, filter?: string) {
  const config = getAiSearchConfig();
  if (!isAzureAiSearchConfigured()) {
    return [];
  }

  const payload = await fetchAzureAiSearch<SearchResponse>(
    `/indexes/${config.indexName}/docs/search`,
    {
      method: "POST",
      body: JSON.stringify({
        search: query,
        filter,
        top: 5,
      }),
    }
  );

  return payload?.value ?? [];
}

export async function upsertIndexedDocuments(documents: IndexedDocument[]) {
  const config = getAiSearchConfig();
  if (!isAzureAiSearchConfigured() || documents.length === 0) {
    return { uploaded: 0, enabled: false };
  }

  await fetchAzureAiSearch(
    `/indexes/${config.indexName}/docs/index`,
    {
      method: "POST",
      body: JSON.stringify({
        value: documents.map((document) => ({ ...document, "@search.action": "mergeOrUpload" })),
      }),
    }
  );

  return { uploaded: documents.length, enabled: true };
}
