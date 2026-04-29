"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const themes = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "dark", icon: Moon, label: "Oscuro" },
  { value: "system", icon: Monitor, label: "Sistema" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
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
            title={t.label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
              isActive
                ? "bg-[#7C3AED]/15 text-[#7C3AED] shadow-sm"
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
