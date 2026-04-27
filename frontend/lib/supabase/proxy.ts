import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Routes that require authentication. */
const PROTECTED_PREFIXES = ["/dashboard", "/workspace", "/logs", "/alerts", "/create-dashboard"];

/** Routes that should redirect to /dashboard if the user is already signed in. */
const AUTH_ROUTES = ["/signin", "/login"];
const LOGIN_PATH = "/login";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // If Supabase is not configured, skip auth enforcement.
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // First, apply the updated cookies to the outgoing request clone
        // so that downstream Server Components see fresh tokens.
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        // Then rebuild the response with the latest cookies.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getClaims() validates the JWT signature — safe to use for auth guards.
  // Never use getSession() inside server/proxy code.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !user) {
    // Redirect unauthenticated users to the log-in page.
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_PATH;
    // Preserve the intended destination so we can redirect back after sign-in.
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    // Already signed in — redirect to the dashboard.
    const redirectUrl = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    redirectUrl.pathname = next && next.startsWith("/") ? next : "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
