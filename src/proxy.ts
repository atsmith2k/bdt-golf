import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.warn("[middleware] Unable to read auth session", error);
  }

  const { pathname, searchParams } = request.nextUrl;

  const authRoutes = new Set(["/login", "/otp", "/reset-password"]);
  const isAuthRoute = authRoutes.has(pathname);
  const wantsApp =
    pathname.startsWith("/app") ||
    pathname === "/";

  if (!session && wantsApp) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    if (pathname !== "/") {
      redirectUrl.searchParams.set("redirectedFrom", pathname);
    } else {
      redirectUrl.searchParams.delete("redirectedFrom");
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (session && (pathname === "/" || isAuthRoute)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = searchParams.get("redirectedFrom") ?? "/app";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/otp", "/reset-password", "/app/:path*"],
};