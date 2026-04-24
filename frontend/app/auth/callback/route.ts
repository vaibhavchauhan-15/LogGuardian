import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler for Supabase.
 *
 * Supabase redirects the user here after they complete the Google OAuth flow.
 * The URL will contain either:
 *   - A `code` query param (PKCE flow) → exchanged for a session
 *   - An `error` query param → surfaced back to the sign-in page
 *
 * After a successful session exchange the user is forwarded to /dashboard
 * (or the `next` param if set).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  // Surface any OAuth errors back to the sign-in page.
  if (error) {
    const url = new URL(`${origin}/signin`);
    url.searchParams.set("error", error);
    if (errorDescription) {
      url.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(url);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Ensure the redirect target is a relative path (security).
      const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/dashboard`;
      return NextResponse.redirect(redirectTo);
    }

    // Exchange failed — redirect to sign-in with the error message.
    const url = new URL(`${origin}/signin`);
    url.searchParams.set("error", exchangeError.message);
    return NextResponse.redirect(url);
  }

  // No code and no error — something unexpected happened.
  return NextResponse.redirect(`${origin}/signin`);
}
