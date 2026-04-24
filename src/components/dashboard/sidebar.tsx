"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ExternalLink, LayoutDashboard, Settings, Wrench, CalendarClock, Users, Palette } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";

const navItems = [
  { href: "/dashboard", label: "Citas", icon: LayoutDashboard },
  { href: "/dashboard/staff", label: "Profesionales", icon: Users },
  { href: "/dashboard/services", label: "Servicios", icon: Wrench },
  { href: "/dashboard/appearance", label: "Apariencia", icon: Palette },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

export function DashboardSidebar({
  userName,
  widgetSlug,
  userRole,
}: {
  userName: string;
  widgetSlug?: string;
  userRole?: string;
}) {
  const pathname = usePathname();
  const widgetHref = widgetSlug ? `/widget/${widgetSlug}` : "/dashboard/settings";

  const visibleItems = navItems.filter((item) => {
    if (userRole === "STAFF" && ["/dashboard/settings", "/dashboard/staff", "/dashboard/appearance"].includes(item.href)) return false;
    return true;
  });

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0E0E0E]">
      <div className="border-b border-white/[0.06] p-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED] shadow-lg shadow-[#7C3AED]/20">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Pura<span className="text-[#7C3AED]">genda</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "border-[#7C3AED]/20 bg-[#7C3AED]/10 text-white"
                  : "border-transparent text-white/50 hover:bg-white/[0.03] hover:text-white/80"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <Link href={widgetHref} target="_blank" className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/40 transition-colors hover:text-white/70">
          <ExternalLink className="h-4 w-4" /> Ver widget
        </Link>
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-xs text-white/30">Sesión iniciada</p>
          <p className="mt-0.5 text-sm font-medium">{userName}</p>
        </div>
        <div className="mt-3"><LogoutButton /></div>
      </div>
    </aside>
  );
}
