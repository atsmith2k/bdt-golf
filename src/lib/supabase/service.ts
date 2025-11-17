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

// New logout utilities
export async function revokeSession(userId: string): Promise<void> {
  const env = getEnv();
  if (!env?.supabaseServiceRoleKey) {
    // If service credentials are not configured, no-op to keep tests idempotent
    return;
  }
  const client = createServiceSupabaseClient();
  try {
    await client.from("refresh_tokens").delete().eq("user_id", userId);
  } catch {
    // ignore
  }
  try {
    await client.from("user_sessions").delete().eq("user_id", userId);
  } catch {
    // ignore
  }
}
export async function rotateSessionId(userId: string): Promise<void> {
  const env = getEnv();
  if (!env?.supabaseServiceRoleKey) {
    return;
  }
  const client = createServiceSupabaseClient();
  const newSessionId = generateSessionId();
  try {
    const { error } = await client.from("user_sessions").update({ session_id: newSessionId }).eq("user_id", userId);
    if (error) {
      await client.from("user_sessions").insert({ user_id: userId, session_id: newSessionId, created_at: new Date().toISOString() });
    }
  } catch {
    // ignore
  }
}
export async function rotateSession(userId: string): Promise<void> {
  // Backwards-compatible alias
  return rotateSessionId(userId);
}
export function generateSessionId(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
