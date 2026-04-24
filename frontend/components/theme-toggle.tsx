"use client";

import { useEffect, useState } from "react";
import { MoonStar, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !resolvedTheme) {
    return (
      <button
        type="button"
        className="lg-icon-button lg-focus-ring"
        aria-label="Toggle dark and light mode"
        disabled
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="lg-icon-button lg-focus-ring"
      aria-label="Toggle dark and light mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <MoonStar className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}