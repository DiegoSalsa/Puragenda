"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/appearance/personalizado", label: "Personalizar" },
  { href: "/dashboard/appearance/temas", label: "Temas" },
  { href: "/dashboard/appearance/historial", label: "Historial" },
];

export function AppearanceTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 rounded-xl border border-border bg-muted p-1 w-fit">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
            pathname.startsWith(tab.href)
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
