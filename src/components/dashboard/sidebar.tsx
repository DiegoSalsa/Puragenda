"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, ExternalLink, Gift, LayoutDashboard, Mail, Menu, RefreshCw, Settings, Wrench, Users, UsersRound, Palette, Stamp, Trophy, X, ChevronDown, Paintbrush, Layers } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { InstallPWAButton } from "@/components/pwa/install-button";

type NavItem =
  | { href: string; label: string; icon: React.ElementType; children?: never }
  | { href?: never; label: string; icon: React.ElementType; children: { href: string; label: string; icon: React.ElementType }[] };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Citas", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analitica", icon: BarChart3 },
  { href: "/dashboard/staff", label: "Profesionales", icon: Users },
  { href: "/dashboard/services", label: "Servicios", icon: Wrench },
  { href: "/dashboard/clients", label: "Clientes", icon: UsersRound },
  { href: "/dashboard/recurring", label: "Suscripciones", icon: RefreshCw },
  { href: "/dashboard/loyalty", label: "Fidelización", icon: Stamp },
  { href: "/dashboard/marketing", label: "Marketing", icon: Mail },
  {
    label: "Apariencia",
    icon: Palette,
    children: [
      { href: "/dashboard/appearance/personalizado", label: "Personalizar", icon: Paintbrush },
      { href: "/dashboard/appearance/temas", label: "Temas", icon: Layers },
    ],
  },
  { href: "/dashboard/referrals", label: "Referidos", icon: Gift },
  { href: "/dashboard/rewards", label: "Recompensas", icon: Trophy },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

function SidebarContent({ userName, widgetSlug, userRole, onClose }: { userName: string; widgetSlug?: string; userRole?: string; onClose?: () => void }) {
  const pathname = usePathname();
  const baseUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const widgetHref = widgetSlug ? new URL(`/widget/${widgetSlug}`, baseUrl).toString() : "/dashboard/settings";

  const isOnAppearance = pathname.startsWith("/dashboard/appearance");
  const [appearanceOpen, setAppearanceOpen] = useState(isOnAppearance);

  const visibleItems = navItems.filter((item) => {
    const href = "href" in item ? item.href : item.children?.[0]?.href ?? "";
    if (userRole === "STAFF" && href !== "/dashboard" && href !== "/dashboard/analytics") return false;
    if (userRole === "RECEPTIONIST" && (href === "/dashboard/settings" || href === "/dashboard/referrals" || href === "/dashboard/rewards")) return false;
    return true;
  });

  return (
    <>
      <div className="border-b border-border p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda Logo" className="h-12 w-auto -my-1 scale-[1.3] origin-left" />
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav id="tutorial-nav" className="flex-1 space-y-1 p-4">
        {visibleItems.map((item) => {
          if (item.children) {
            // Dropdown item (Apariencia)
            const isGroupActive = item.children.some((c) => pathname.startsWith(c.href));
            const isOpen = appearanceOpen || isGroupActive;
            return (
              <div key={item.label}>
                <button
                  onClick={() => setAppearanceOpen((o) => !o)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isGroupActive
                      ? "border-[#7C3AED]/20 bg-[#7C3AED]/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent/5 hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const isChildActive = pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                            isChildActive
                              ? "font-medium text-[#7C3AED]"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <child.icon className="h-3.5 w-3.5" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

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
        <Link id="tutorial-widget" href={widgetHref} target="_blank" className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
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
          <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda Logo" className="h-12 w-auto -my-1 scale-[1.25] origin-left" />
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
