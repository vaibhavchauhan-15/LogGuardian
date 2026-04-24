"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeProviderProps = {
  children: ReactNode;
  attribute?: "class" | `data-${string}`;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  forcedTheme?: Theme;
  storageKey?: string;
};

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function isValidTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function applyTheme(attribute: ThemeProviderProps["attribute"], theme: ResolvedTheme) {
  const root = document.documentElement;

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  } else {
    root.setAttribute(attribute ?? "data-theme", theme);
  }

  root.style.colorScheme = theme;
}

function withoutTransitions<T>(enabled: boolean, operation: () => T): T {
  if (!enabled) {
    return operation();
  }

  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important;animation:none!important}"
    )
  );
  document.head.appendChild(style);

  const result = operation();

  window.getComputedStyle(document.body);
  window.setTimeout(() => {
    document.head.removeChild(style);
  }, 1);

  return result;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  forcedTheme,
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return defaultTheme;
    }

    try {
      const storedTheme = localStorage.getItem(storageKey);
      return isValidTheme(storedTheme) ? storedTheme : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    defaultTheme === "system" ? getSystemTheme() : defaultTheme
  );

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      try {
        localStorage.setItem(storageKey, nextTheme);
      } catch {
        // Ignore storage access failures.
      }
    },
    [storageKey]
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      const candidate = forcedTheme ?? theme;
      const nextResolved: ResolvedTheme =
        candidate === "system" ? (enableSystem ? getSystemTheme() : "dark") : candidate;

      withoutTransitions(disableTransitionOnChange, () => {
        applyTheme(attribute, nextResolved);
      });

      setResolvedTheme(nextResolved);
    };

    updateTheme();
    media.addEventListener("change", updateTheme);

    return () => {
      media.removeEventListener("change", updateTheme);
    };
  }, [attribute, disableTransitionOnChange, enableSystem, forcedTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, setTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}