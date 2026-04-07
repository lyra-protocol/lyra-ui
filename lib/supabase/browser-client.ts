"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function readClientEnv(key: string) {
  return process.env[key]?.trim() || "";
}

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = readClientEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey =
    readClientEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    readClientEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

  if (!url || !publishableKey) {
    throw new Error("Supabase browser client is not configured.");
  }

  browserClient = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return browserClient;
}
