"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ExternalLink,
  LayoutDashboard,
  Settings,
  Wrench,
} from "lucide-react";
import { LogoutButton } from "@/frontend/components/layout/logout-button";

const navItems = [
  { href: "/dashboard", label: "Citas", icon: LayoutDashboard },
  { href: "/dashboard/services", label: "Servicios", icon: Wrench },
  { href: "/dashboard/settings", label: "Configuracion", icon: Settings },
];

export function DashboardSidebar({
  userName,
  widgetSlug,
}: {
  userName: string;
  widgetSlug?: string;
}) {
  const pathname = usePathname();
  const widgetHref = widgetSlug ? `/widget/${widgetSlug}` : "/dashboard/settings";

  return (
    <aside className="w-64 shrink-0 border-r border-border/50 bg-card/30 flex flex-col">
      <div className="border-b border-border/50 p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-950 via-purple-900 to-violet-700">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Agenda<span className="text-violet-300">Pro</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "border-violet-400/35 bg-violet-700/25 text-white"
                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 p-4">
        <Link
          href={widgetHref}
          target="_blank"
          className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          Ver widget
        </Link>

        <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">Sesion iniciada</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{userName}</p>
        </div>

        <div className="mt-3">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
