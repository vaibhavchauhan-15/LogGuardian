import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client.
 * Use in Server Components, Route Handlers, and Server Actions.
 * Reads/writes cookies via Next.js `cookies()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component where setting cookies
            // is not allowed. The Proxy handles cookie refresh instead.
          }
        },
      },
    }
  );
}
