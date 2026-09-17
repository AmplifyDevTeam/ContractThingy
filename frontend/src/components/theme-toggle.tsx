"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearThemeWipes, runThemeTransition } from "@/components/motion/theme-transition";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    clearThemeWipes();
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      className={cn("relative overflow-visible", compact ? "size-8" : "gap-2", className)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={(event) => {
        const next = isDark ? "light" : "dark";
        runThemeTransition(event, () => setTheme(next), { nextTheme: next });
      }}
    >
      {isDark ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
      {compact ? null : <span className="text-[12px]">{isDark ? "Light" : "Dark"}</span>}
    </Button>
  );
}
