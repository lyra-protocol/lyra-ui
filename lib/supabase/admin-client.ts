import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/core/config/server-env";

type LooseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type LooseFunction = {
  Args: Record<string, unknown>;
  Returns: unknown;
};

type LooseDatabase = {
  public: {
    Tables: Record<string, LooseTable>;
    Views: Record<string, never>;
    Functions: Record<string, LooseFunction>;
  };
};

type SupabaseAdminClient = SupabaseClient<LooseDatabase>;

let cachedClient: SupabaseAdminClient | null = null;

export function getSupabaseAdminClient(): SupabaseAdminClient {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getServerEnv();
  cachedClient = createClient<LooseDatabase>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}
