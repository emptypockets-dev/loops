"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Light/dark toggle without a theme library: the root layout's inline script
 * applies the stored choice before paint; this button just flips the class
 * and persists. Renders a neutral placeholder until mounted to avoid a
 * hydration mismatch.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("loops-theme", next ? "dark" : "light");
    } catch {
      // Private-mode storage failures just mean the choice doesn't persist.
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )
      ) : (
        <Moon className="h-5 w-5 opacity-0" />
      )}
    </Button>
  );
}
