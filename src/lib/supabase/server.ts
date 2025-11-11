import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "../env";

type CookieStore = {
  get?: (name: string) => { value?: string } | undefined;
  set?: (options: { name: string; value: string } & Record<string, unknown>) => void;
  delete?: (options: { name: string } & Record<string, unknown>) => void;
};

function isPromise<T>(value: unknown): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in (value as Record<string, unknown>);
}

function resolveCookieStore(): CookieStore | undefined {
  const storeOrPromise = (cookies as unknown as () => CookieStore | Promise<CookieStore>)();
  if (isPromise(storeOrPromise)) {
    return undefined;
  }
  return storeOrPromise;
}

export function createServerSupabaseClient() {
  const env = getEnv();
  if (!env) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const cookieStore = resolveCookieStore();
        return cookieStore?.get?.(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          const cookieStore = resolveCookieStore();
          cookieStore?.set?.({
            name,
            value,
            ...options,
          });
        } catch {
          // cookies() is immutable in some RSC contexts; ignore.
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          const cookieStore = resolveCookieStore();
          cookieStore?.delete?.({
            name,
            ...options,
          });
        } catch {
          // ignore removal errors
        }
      },
    },
  });
}
