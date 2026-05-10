"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Calendar, ExternalLink, Gift, LayoutDashboard, Mail, Menu, Settings, Wrench, CalendarClock, Users, UsersRound, Palette, Stamp, Trophy, X } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { InstallPWAButton } from "@/components/pwa/install-button";

const navItems = [
  { href: "/dashboard", label: "Citas", icon: LayoutDashboard },
  { href: "/dashboard/staff", label: "Profesionales", icon: Users },
  { href: "/dashboard/services", label: "Servicios", icon: Wrench },
  { href: "/dashboard/clients", label: "Clientes", icon: UsersRound },
  { href: "/dashboard/loyalty", label: "Fidelización", icon: Stamp },
  { href: "/dashboard/marketing", label: "Marketing", icon: Mail },
  { href: "/dashboard/appearance", label: "Apariencia", icon: Palette },
  { href: "/dashboard/referrals", label: "Referidos", icon: Gift },
  { href: "/dashboard/rewards", label: "Recompensas", icon: Trophy },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

function SidebarContent({ userName, widgetSlug, userRole, onClose }: { userName: string; widgetSlug?: string; userRole?: string; onClose?: () => void }) {
  const pathname = usePathname();
  const baseUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const widgetHref = widgetSlug ? new URL(`/widget/${widgetSlug}`, baseUrl).toString() : "/dashboard/settings";

  const visibleItems = navItems.filter((item) => {
    // STAFF: only sees their own agenda
    if (userRole === "STAFF" && item.href !== "/dashboard") return false;
    // RECEPTIONIST: sees everything except settings, referrals & rewards (billing/admin)
    if (userRole === "RECEPTIONIST" && (item.href === "/dashboard/settings" || item.href === "/dashboard/referrals" || item.href === "/dashboard/rewards")) return false;
    return true;
  });

  return (
    <>
      <div className="border-b border-border p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/logos/logo-black.svg" alt="Puragenda Logo" className="h-10 w-auto -my-1 dark:hidden" />
          <img src="/logos/logo-white.svg" alt="Puragenda Logo" className="hidden h-10 w-auto -my-1 dark:block" />
          <span className="text-xl font-bold tracking-tight">
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
        <div className="mt-3"><InstallPWAButton variant="sidebar" /></div>
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
        <div className="flex items-center gap-2.5">
          <img src="/logos/logo-black.svg" alt="Puragenda Logo" className="h-10 w-auto -my-1 dark:hidden" />
          <img src="/logos/logo-white.svg" alt="Puragenda Logo" className="hidden h-10 w-auto -my-1 dark:block" />
          <span className="text-lg font-bold tracking-tight">
            Pura<span className="text-[#7C3AED]">genda</span>
          </span>
        </div>
      </div>
      {/* Spacer for mobile header */}
      <div className="h-[52px] shrink-0 md:hidden" />

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col bg-sidebar shadow-2xl animate-drawer-left">
            <SidebarContent userName={userName} widgetSlug={widgetSlug} userRole={userRole} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar">
        <SidebarContent userName={userName} widgetSlug={widgetSlug} userRole={userRole} />
      </aside>
    </>
  );
}
