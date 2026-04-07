import "server-only";

type LookupOptions = {
  fallbackKeys?: string[];
  required?: boolean;
};

function readEnv(key: string) {
  return process.env[key]?.trim() || "";
}

function resolveEnv(key: string, options: LookupOptions = {}) {
  const keys = [key, ...(options.fallbackKeys ?? [])];

  for (const candidate of keys) {
    const value = readEnv(candidate);
    if (value) {
      return value;
    }
  }

  if (options.required) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return "";
}

function resolveAzureOpenAiBaseUrl() {
  const explicitBaseUrl = resolveEnv("AZURE_OPENAI_BASE_URL", {
    fallbackKeys: ["OPENAI_BASE_URL"],
  });
  if (explicitBaseUrl) {
    return explicitBaseUrl.endsWith("/") ? explicitBaseUrl : `${explicitBaseUrl}/`;
  }

  const endpoint = resolveEnv("AZURE_OPENAI_ENDPOINT");
  if (!endpoint) {
    return "";
  }

  return `${endpoint.replace(/\/+$/, "")}/openai/v1/`;
}

export function getServerEnv() {
  return {
    privyAppId: resolveEnv("PRIVY_APP_ID", { required: true }),
    privyClientId: resolveEnv("PRIVY_CLIENT_ID"),
    privySecret: resolveEnv("PRIVY_SECRET", { required: true }),
    supabaseUrl: resolveEnv("NEXT_PUBLIC_SUPABASE_URL", { required: true }),
    supabasePublishableKey: resolveEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", {
      fallbackKeys: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"],
    }),
    supabaseSecretKey: resolveEnv("SUPABASE_SECRET_KEY", {
      fallbackKeys: ["secret for supabase"],
      required: true,
    }),
    supabaseDbPassword: resolveEnv("SUPABASE_DB_PASSWORD", {
      fallbackKeys: ["supabase password"],
    }),
    azureOpenAiBaseUrl: resolveAzureOpenAiBaseUrl(),
    azureOpenAiApiKey: resolveEnv("AZURE_OPENAI_API_KEY", {
      fallbackKeys: ["OPENAI_API_KEY"],
    }),
    azureOpenAiModel: resolveEnv("AZURE_OPENAI_MODEL", {
      fallbackKeys: ["AZURE_OPENAI_DEPLOYMENT", "OPENAI_MODEL"],
    }),
    azureFoundryProjectEndpoint: resolveEnv("AZURE_FOUNDRY_PROJECT_ENDPOINT"),
    azureFoundryAgentId: resolveEnv("AZURE_FOUNDRY_AGENT_ID"),
    azureFoundryBingConnectionName: resolveEnv("AZURE_FOUNDRY_BING_CONNECTION_NAME"),
    azureAiSearchEndpoint: resolveEnv("AZURE_AI_SEARCH_ENDPOINT"),
    azureAiSearchApiKey: resolveEnv("AZURE_AI_SEARCH_API_KEY"),
    azureAiSearchIndexName: resolveEnv("AZURE_AI_SEARCH_INDEX_NAME"),
    azureAiSearchApiVersion: resolveEnv("AZURE_AI_SEARCH_API_VERSION") || "2025-09-01",
    lyraAiTriggerSecret: resolveEnv("LYRA_AI_TRIGGER_SECRET"),
  };
}
