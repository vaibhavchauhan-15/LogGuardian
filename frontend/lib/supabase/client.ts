import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Safe to call from any Client Component or browser-only code.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Support both the legacy anon key and the new publishable key env var names.
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!
  );
}
