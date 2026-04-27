"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, LogOut, Mail, Moon, Sun, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useNotifPrefs } from "@/hooks/use-notif-prefs";
import { useTheme } from "@/components/theme-provider";

type ProfileDropdownProps = {
  name?: string | null;
  email?: string | null;
  onLogout: () => void;
};

type TogglePillProps = {
  active: boolean;
  onClick: () => void;
  small?: boolean;
  label: string;
};

function TogglePill({ active, onClick, small = false, label }: TogglePillProps) {
  const sizeClasses = small ? "h-4 w-8" : "h-5 w-9";
  const thumbSizeClasses = small ? "h-3 w-3" : "h-4 w-4";
  const thumbPosition = active ? "translate-x-4" : "translate-x-0";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative ${sizeClasses} rounded-full transition-colors ${
        active ? "bg-[#3ecf8e]" : "bg-[var(--muted)]"
      }`}
      aria-label={label}
      role="switch"
      aria-checked={active}
    >
      <span
        className={`absolute left-0.5 top-0.5 ${thumbSizeClasses} rounded-full bg-white shadow transition-transform ${thumbPosition}`}
      />
    </button>
  );
}

export function ProfileDropdown({ name, email, onLogout }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const { prefs, togglePref } = useNotifPrefs();

  const displayName = useMemo(() => {
    const trimmedName = name?.trim();
    if (trimmedName) {
      return trimmedName;
    }

    const trimmedEmail = email?.trim();
    if (trimmedEmail) {
      return trimmedEmail.split("@")[0] ?? "Guest";
    }

    return "Guest";
  }, [email, name]);

  const avatarLetter = useMemo(() => {
    const source = name?.trim() || email?.trim() || "";
    const firstCharacter = source.charAt(0).toUpperCase();
    return firstCharacter || null;
  }, [email, name]);

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleDocumentKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleDocumentKeydown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleDocumentKeydown);
    };
  }, []);

  function handleLogoutClick() {
    setOpen(false);
    onLogout();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[#3ecf8e]/40 transition-colors"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatarLetter ? (
          <span className="font-['IBM_Plex_Mono'] text-xs font-semibold text-[var(--foreground)]">
            {avatarLetter}
          </span>
        ) : (
          <User className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="px-4 py-3">
              <p className="font-['Space_Grotesk'] text-sm text-[var(--foreground)]">{displayName}</p>
              <p className="mt-1 font-['IBM_Plex_Mono'] text-xs text-[var(--muted-foreground)]">
                {email?.trim() || "Guest"}
              </p>
            </div>

            <div className="border-t border-[var(--border)]">
              <p className="px-4 pb-1 pt-3 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Theme
              </p>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-sm text-[var(--foreground)]">
                  {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                  {isDark ? "Dark Mode" : "Light Mode"}
                </span>
                <TogglePill
                  active={isDark}
                  onClick={toggleTheme}
                  label="Toggle dark and light theme"
                />
              </div>
            </div>

            <div className="border-t border-[var(--border)]">
              <p className="px-4 pb-1 pt-3 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Notifications
              </p>

              <div className="flex items-center justify-between px-4 py-2">
                <span className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-sm text-[var(--foreground)]">
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                  Critical Alerts
                </span>
                <TogglePill
                  active={prefs.critical}
                  onClick={() => togglePref("critical")}
                  label="Toggle critical alerts"
                  small
                />
              </div>

              <div className="flex items-center justify-between px-4 py-2">
                <span className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-sm text-[var(--foreground)]">
                  <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                  Warning Alerts
                </span>
                <TogglePill
                  active={prefs.warning}
                  onClick={() => togglePref("warning")}
                  label="Toggle warning alerts"
                  small
                />
              </div>

              <div className="flex items-center justify-between px-4 py-2">
                <span className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-sm text-[var(--foreground)]">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  Daily Digest
                </span>
                <TogglePill
                  active={prefs.digest}
                  onClick={() => togglePref("digest")}
                  label="Toggle daily digest"
                  small
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex w-full items-center gap-2.5 border-t border-[var(--border)] px-4 py-3 font-['IBM_Plex_Mono'] text-sm text-red-400 transition-colors hover:bg-red-950/20"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
