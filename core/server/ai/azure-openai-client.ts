import "server-only";

import OpenAI from "openai";
import { getServerEnv } from "@/core/config/server-env";

let cachedClient: OpenAI | null = null;
let responsesApiSupported: boolean | null = null;

export function isAzureOpenAiConfigured() {
  const env = getServerEnv();
  return Boolean(env.azureOpenAiBaseUrl && env.azureOpenAiApiKey && env.azureOpenAiModel);
}

export function getAzureOpenAiClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getServerEnv();
  if (!env.azureOpenAiBaseUrl || !env.azureOpenAiApiKey || !env.azureOpenAiModel) {
    throw new Error(
      "Azure OpenAI is not configured. Set AZURE_OPENAI_BASE_URL (or AZURE_OPENAI_ENDPOINT), AZURE_OPENAI_API_KEY, and AZURE_OPENAI_MODEL."
    );
  }

  cachedClient = new OpenAI({
    baseURL: env.azureOpenAiBaseUrl,
    apiKey: env.azureOpenAiApiKey,
  });

  return cachedClient;
}

export function getAzureOpenAiModel() {
  const env = getServerEnv();
  if (!env.azureOpenAiModel) {
    throw new Error("Missing environment variable: AZURE_OPENAI_MODEL");
  }

  return env.azureOpenAiModel;
}

export function canUseResponsesApi() {
  return responsesApiSupported !== false;
}

export function markResponsesApiUnsupported() {
  responsesApiSupported = false;
}

export function isResponsesApiUnsupportedError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : error &&
          typeof error === "object" &&
          "message" in error &&
          typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : String(error ?? "");

  return message.toLowerCase().includes("not supported by responses api");
}
