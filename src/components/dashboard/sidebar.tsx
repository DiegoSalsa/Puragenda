"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Calendar, ExternalLink, Gift, LayoutDashboard, Menu, Settings, Wrench, CalendarClock, Users, Palette, X } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Citas", icon: LayoutDashboard },
  { href: "/dashboard/staff", label: "Profesionales", icon: Users },
  { href: "/dashboard/services", label: "Servicios", icon: Wrench },
  { href: "/dashboard/appearance", label: "Apariencia", icon: Palette },
  { href: "/dashboard/referrals", label: "Referidos", icon: Gift },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

function SidebarContent({ userName, widgetSlug, userRole, onClose }: { userName: string; widgetSlug?: string; userRole?: string; onClose?: () => void }) {
  const pathname = usePathname();
  const widgetHref = widgetSlug ? `/widget/${widgetSlug}` : "/dashboard/settings";

  const visibleItems = navItems.filter((item) => {
    if (userRole === "STAFF" && ["/dashboard/settings", "/dashboard/staff", "/dashboard/appearance", "/dashboard/referrals"].includes(item.href)) return false;
    return true;
  });

  return (
    <>
      <div className="border-b border-border p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED] shadow-lg shadow-[#7C3AED]/20">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Pura<span className="text-[#7C3AED]">genda</span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "border-[#7C3AED]/20 bg-[#7C3AED]/10 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent/5 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <Link href={widgetHref} target="_blank" className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ExternalLink className="h-4 w-4" /> Ver widget
        </Link>
        <div className="mt-3 px-3">
          <ThemeToggle />
        </div>
        <div className="mt-3 rounded-xl border border-border bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Sesión iniciada</p>
          <p className="mt-0.5 text-sm font-medium truncate text-foreground">{userName}</p>
        </div>
        <div className="mt-3"><LogoutButton /></div>
      </div>
    </>
  );
}

export function DashboardSidebar({
  userName,
  widgetSlug,
  userRole,
}: {
  userName: string;
  widgetSlug?: string;
  userRole?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3 md:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold tracking-tight text-foreground">
          Pura<span className="text-[#7C3AED]">genda</span>
        </span>
      </div>
      {/* Spacer for mobile header */}
      <div className="h-[52px] shrink-0 md:hidden" />

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col bg-sidebar shadow-2xl animate-slide-left">
            <SidebarContent userName={userName} widgetSlug={widgetSlug} userRole={userRole} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <SidebarContent userName={userName} widgetSlug={widgetSlug} userRole={userRole} />
      </aside>
    </>
  );
}
