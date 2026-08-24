"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "@/components/icons/hover-icons";
import { useTranslations } from "next-intl";

const themes = [
  { value: "light", icon: Sun, label: "lightTheme" },
  { value: "dark", icon: Moon, label: "darkTheme" },
  { value: "system", icon: Monitor, label: "systemTheme" },
] as const;

export function ThemeToggle() {
  const translate = useTranslations("dashboard.shell");
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
        {themes.map((t) => (
          <div key={t.value} className="h-8 w-8 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
      {themes.map((t) => {
        const isActive = theme === t.value;
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            title={translate(t.label)}
            aria-label={translate(t.label)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
              isActive
                ? "bg-[#7C3AED]/20 text-brand-foreground shadow-sm ring-1 ring-[#7C3AED]/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
