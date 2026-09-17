"use client";

import * as React from "react";

export type AppTheme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  resolvedTheme?: "light" | "dark";
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export const THEME_STORAGE_KEY = "amplify-theme";

function systemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyResolved(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

/** Inline FOUC script — inject from the root layout `<head>`, not from a client component. */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d="dark";var t=localStorage.getItem(k)||d;var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):(t==="light"||t==="dark"?t:d);var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(r);e.style.colorScheme=r;}catch(e){}})();`;

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
  /** Accepted for layout compatibility; class attribute is always used. */
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setThemeState] = React.useState<AppTheme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">(
    defaultTheme === "light" ? "light" : "dark",
  );
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null) ?? defaultTheme;
    const resolved = stored === "system" ? systemTheme() : stored === "light" ? "light" : "dark";
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyResolved(resolved);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null) ?? defaultTheme;
      if (current !== "system") return;
      const next = systemTheme();
      setResolvedTheme(next);
      applyResolved(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [defaultTheme]);

  const setTheme = React.useCallback((next: AppTheme) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
    const resolved = next === "system" ? systemTheme() : next;
    setResolvedTheme(resolved);
    applyResolved(resolved);
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme: mounted ? resolvedTheme : undefined,
    }),
    [theme, setTheme, resolvedTheme, mounted],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "dark" as AppTheme,
      setTheme: () => undefined,
      resolvedTheme: undefined as "light" | "dark" | undefined,
    };
  }
  return ctx;
}
