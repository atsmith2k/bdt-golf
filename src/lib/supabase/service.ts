import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../env";

export function createServiceSupabaseClient() {
  const env = getEnv();
  if (!env?.supabaseServiceRoleKey) {
    throw new Error("Supabase service role key is not configured.");
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

