"use client";

import { useCallback, useEffect, useState } from "react";

export type NotificationPrefs = {
  critical: boolean;
  warning: boolean;
  digest: boolean;
};

export const LG_NOTIF_PREFS_STORAGE_KEY = "lg-notif-prefs";

const DEFAULT_PREFS: NotificationPrefs = {
  critical: true,
  warning: true,
  digest: false,
};

function resolveInitialPrefs(): NotificationPrefs {
  if (typeof window === "undefined") {
    return DEFAULT_PREFS;
  }

  try {
    const stored = window.localStorage.getItem(LG_NOTIF_PREFS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFS;
    }

    const parsed = JSON.parse(stored) as Partial<NotificationPrefs>;
    return {
      critical:
        typeof parsed.critical === "boolean" ? parsed.critical : DEFAULT_PREFS.critical,
      warning:
        typeof parsed.warning === "boolean" ? parsed.warning : DEFAULT_PREFS.warning,
      digest: typeof parsed.digest === "boolean" ? parsed.digest : DEFAULT_PREFS.digest,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useNotifPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => resolveInitialPrefs());

  useEffect(() => {
    try {
      window.localStorage.setItem(LG_NOTIF_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage write failures.
    }
  }, [prefs]);

  const setPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);

  const togglePref = useCallback((key: keyof NotificationPrefs) => {
    setPrefs((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  return {
    prefs,
    setPref,
    togglePref,
  };
}
