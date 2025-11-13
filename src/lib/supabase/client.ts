import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../env";

let client: SupabaseClient | undefined;

export function getSupabaseClient() {
  if (client) {
    return client;
  }

  const env = getEnv();
  if (!env) {
    throw new Error("Supabase environment variables are not configured.");
  }

  client = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
