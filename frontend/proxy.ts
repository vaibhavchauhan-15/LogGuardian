import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (replaces the old middleware.ts convention).
 * Runs on every request that matches the `config.matcher` below.
 * Responsible for refreshing Supabase auth tokens and enforcing
 * authentication on protected routes.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (Next.js static assets)
     * - _next/image   (Next.js image optimisation)
     * - favicon.ico
     * - Public image/font file extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
