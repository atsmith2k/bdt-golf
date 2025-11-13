import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "../env";

export function createServerSupabaseClient() {
  const env = getEnv();
  if (!env) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      async getAll() {
        try {
          const store = await cookies() as unknown as {
            getAll?: () => { name: string; value: string }[];
          };
          if (typeof store?.getAll === "function") {
            return store.getAll();
          }
          return [];
        } catch {
          return [];
        }
      },
      async setAll(cookieList) {
        try {
          const store = cookies() as unknown as {
            set?: (opts: { name: string; value: string } & Record<string, unknown>) => void;
          };
          if (typeof store?.set !== "function") {
            return;
          }
          cookieList.forEach(({ name, value, options }) => {
            store.set?.({ name, value, ...options });
          });
        } catch {
          // In some RSC contexts cookies() is read-only; ignore failures.
        }
      },
    },
  });
}
