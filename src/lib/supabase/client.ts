import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
