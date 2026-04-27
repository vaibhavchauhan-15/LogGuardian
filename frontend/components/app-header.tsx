"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  ACCESS_TOKEN_STORAGE_KEY,
  ACTIVE_DASHBOARD_STORAGE_KEY,
  USER_EMAIL_STORAGE_KEY,
  USER_ID_STORAGE_KEY,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { resolveAndStoreUserContext } from "@/lib/user-context";
import { GetStartedButton } from "@/components/auth/get-started-button";
import { ProfileDropdown } from "@/components/profile-dropdown";

type AppHeaderProps = {
  showProfile?: boolean;
};

export function AppHeader({ showProfile = true }: AppHeaderProps) {
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const homeHref = showProfile ? "/dashboard" : "/";

  useEffect(() => {
    if (!showProfile) {
      return;
    }

    let cancelled = false;

    async function loadUserInfo() {
      const resolved = await resolveAndStoreUserContext();
      if (cancelled) {
        return;
      }

      if (resolved) {
        setName(resolved.name?.trim() || null);
        setEmail(resolved.email?.trim() || null);
        return;
      }

      const storedEmail = window.localStorage.getItem(USER_EMAIL_STORAGE_KEY)?.trim() || null;
      setName(storedEmail ? storedEmail.split("@")[0] || null : null);
      setEmail(storedEmail);
    }

    void loadUserInfo();

    return () => {
      cancelled = true;
    };
  }, [showProfile]);

  const handleLogout = useCallback(() => {
    const redirectPath = "/signin";

    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_ID_STORAGE_KEY);
    window.localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_DASHBOARD_STORAGE_KEY);

    void (async () => {
      try {
        const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        );

        if (hasSupabaseConfig) {
          const supabase = createClient();
          await supabase.auth.signOut();
        }
      } catch {
        // Always continue to signin even if remote logout request fails.
      }

      window.location.assign(redirectPath);
    })();
  }, []);

  return (
    <header className="sticky top-0 z-50 h-12 border-b border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-full items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href={homeHref} className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#3ecf8e]"
            aria-hidden="true"
          >
            <span className="block h-2.5 w-2.5 rounded-[2px] bg-[#0a0a0a]" />
          </span>
          <span className="font-['IBM_Plex_Mono'] text-xs font-semibold tracking-wide text-[var(--foreground)]">
            LogGuardian
          </span>
        </Link>

        {showProfile ? (
          <ProfileDropdown name={name} email={email} onLogout={handleLogout} />
        ) : (
          <GetStartedButton
            size="sm"
            className="h-9 bg-brand px-4 text-xs font-semibold text-black hover:bg-brand/90"
          >
            <span className="inline-flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Get Started
            </span>
          </GetStartedButton>
        )}
      </div>
    </header>
  );
}
