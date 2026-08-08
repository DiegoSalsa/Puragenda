"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Gift,
  GripVertical,
  ImagePlus,
  Layers,
  LayoutDashboard,
  Mail,
  Menu,
  Package,
  Paintbrush,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  Stamp,
  Trophy,
  Users,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { InstallPWAButton } from "@/components/pwa/install-button";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";

type NavItem =
  | { href: string; label: string; icon: React.ElementType; children?: never }
  | { href?: never; label: string; icon: React.ElementType; children: { href: string; label: string; icon: React.ElementType }[] };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "appointments", icon: LayoutDashboard },
  { href: "/dashboard/google-calendar", label: "calendar", icon: CalendarDays },
  { href: "/dashboard/orders", label: "orders", icon: Package },
  { href: "/dashboard/analytics", label: "analytics", icon: BarChart3 },
  { href: "/dashboard/staff", label: "staff", icon: Users },
  { href: "/dashboard/services", label: "services", icon: Wrench },
  { href: "/dashboard/clients", label: "clients", icon: UsersRound },
  { href: "/dashboard/recurring", label: "subscriptions", icon: RefreshCw },
  { href: "/dashboard/loyalty", label: "loyalty", icon: Stamp },
  { href: "/dashboard/marketing", label: "marketing", icon: Mail },
  { href: "/dashboard/stories", label: "stories", icon: ImagePlus },
  {
    label: "appearance",
    icon: Palette,
    children: [
      { href: "/dashboard/appearance/personalizado", label: "customize", icon: Paintbrush },
      { href: "/dashboard/appearance/temas", label: "themes", icon: Layers },
    ],
  },
  { href: "/dashboard/referrals", label: "referrals", icon: Gift },
  { href: "/dashboard/rewards", label: "rewards", icon: Trophy },
  { href: "/dashboard/settings", label: "settings", icon: Settings },
];

const SIDEBAR_STATE_KEY = "puragenda:dashboard-sidebar:v2";
const MIN_WIDTH = 208;
const MAX_WIDTH = 380;
const DEFAULT_WIDTH = 256;
const COLLAPSED_WIDTH = 76;
const SIDEBAR_STATE_EVENT = "puragenda:dashboard-sidebar-change";

type StoredSidebarState = { width: number; collapsed: boolean };
const DEFAULT_SIDEBAR_STATE: StoredSidebarState = { width: DEFAULT_WIDTH, collapsed: false };
const DEFAULT_SIDEBAR_STATE_JSON = JSON.stringify(DEFAULT_SIDEBAR_STATE);

function readSidebarSnapshot() {
  try {
    return window.localStorage.getItem(SIDEBAR_STATE_KEY) || DEFAULT_SIDEBAR_STATE_JSON;
  } catch {
    return DEFAULT_SIDEBAR_STATE_JSON;
  }
}

function subscribeSidebarSnapshot(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STATE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SIDEBAR_STATE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SIDEBAR_STATE_EVENT, onChange);
  };
}

function normalizeSidebarState(raw: string): StoredSidebarState {
  try {
    const stored = JSON.parse(raw) as Partial<StoredSidebarState>;
    return {
      width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(stored.width) || DEFAULT_WIDTH)),
      collapsed: Boolean(stored.collapsed),
    };
  } catch {
    return DEFAULT_SIDEBAR_STATE;
  }
}

function writeSidebarState(next: StoredSidebarState) {
  window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(SIDEBAR_STATE_EVENT));
}

function NavLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  return collapsed ? <span className="sr-only">{children}</span> : <>{children}</>;
}

function SidebarContent({
  userName,
  widgetSlug,
  userRole,
  permissions,
  productionOrdersEnabled,
  collapsed,
  onClose,
  onToggleCollapsed,
}: {
  userName: string;
  widgetSlug?: string;
  userRole?: string;
  permissions?: string[];
  productionOrdersEnabled?: boolean;
  collapsed: boolean;
  onClose?: () => void;
  onToggleCollapsed?: () => void;
}) {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const baseUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const widgetHref = widgetSlug ? new URL(`/widget/${widgetSlug}`, baseUrl).toString() : "/dashboard/settings";
  const isOnAppearance = pathname.startsWith("/dashboard/appearance");
  const [appearanceOpen, setAppearanceOpen] = useState(isOnAppearance);

  const visibleItems = useMemo(() => navItems.filter((item) => {
    const href = "href" in item && item.href ? item.href : item.children?.[0]?.href ?? "";
    if (href === "/dashboard/orders" && !productionOrdersEnabled) return false;
    if (permissions) {
      const required: Record<string, string[]> = {
        "/dashboard": [DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN, DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL],
        "/dashboard/google-calendar": [DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN, DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE],
        "/dashboard/orders": [DASHBOARD_PERMISSIONS.SERVICES_MANAGE],
        "/dashboard/analytics": [DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS],
        "/dashboard/staff": [DASHBOARD_PERMISSIONS.STAFF_MANAGE],
        "/dashboard/services": [DASHBOARD_PERMISSIONS.SERVICES_MANAGE],
        "/dashboard/clients": [DASHBOARD_PERMISSIONS.CLIENTS_MANAGE],
        "/dashboard/recurring": [DASHBOARD_PERMISSIONS.RECURRING_MANAGE],
        "/dashboard/loyalty": [DASHBOARD_PERMISSIONS.LOYALTY_MANAGE],
        "/dashboard/marketing": [DASHBOARD_PERMISSIONS.MARKETING_MANAGE],
        "/dashboard/stories": [DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN, DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL],
        "/dashboard/appearance/personalizado": [DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE],
        "/dashboard/referrals": [DASHBOARD_PERMISSIONS.REFERRALS_VIEW],
        "/dashboard/rewards": [DASHBOARD_PERMISSIONS.REWARDS_VIEW],
        "/dashboard/settings": [DASHBOARD_PERMISSIONS.SETTINGS_MANAGE],
      };
      return (required[href] || []).some((permission) => permissions.includes(permission));
    }
    if (userRole === "STAFF" && href !== "/dashboard" && href !== "/dashboard/analytics") return false;
    if (userRole === "RECEPTIONIST" && (href === "/dashboard/settings" || href === "/dashboard/referrals" || href === "/dashboard/rewards")) return false;
    return true;
  }), [permissions, productionOrdersEnabled, userRole]);

  const itemClass = (active: boolean) =>
    `group relative flex w-full items-center rounded-xl border text-sm font-medium transition-all duration-200 ${
      collapsed ? "h-11 justify-center px-2" : "gap-3 px-3 py-2.5"
    } ${
      active
        ? "border-[#7C3AED]/25 bg-[#7C3AED]/10 text-[#7C3AED]"
        : "border-transparent text-muted-foreground hover:bg-accent/10 hover:text-foreground"
    }`;

  return (
    <>
      <div className={`flex h-[74px] shrink-0 items-center border-b border-border ${collapsed ? "justify-center px-3" : "justify-between px-5"}`}>
        <Link
          href="/dashboard"
          className={`flex min-w-0 items-center ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "PuroCode · Puragenda" : "Puragenda"}
        >
          <img
            src={collapsed ? "/icon-512x512.png" : "/logos/logoPuragendaSVG.svg"}
            alt="Puragenda"
            className={collapsed ? "h-9 w-9 rounded-xl shadow-sm" : "h-12 w-auto max-w-[145px]"}
          />
        </Link>
        {onClose ? (
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t("closeMenu")}>
            <X className="h-5 w-5" />
          </button>
        ) : !collapsed && onToggleCollapsed ? (
          <button
            onClick={onToggleCollapsed}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={`${t("collapseSidebar")} (Ctrl+B)`}
            aria-label={t("collapseSidebar")}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav id="tutorial-nav" className={`min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden ${collapsed ? "p-2" : "p-4"}`}>
        {collapsed && onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className={itemClass(false)}
            title={`${t("expandSidebar")} (Ctrl+B)`}
            aria-label={t("expandSidebar")}
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        {visibleItems.map((item) => {
          if (item.children) {
            const isGroupActive = item.children.some((child) => pathname.startsWith(child.href));
            const isOpen = appearanceOpen || isGroupActive;
            return (
              <div key={item.label}>
                <button
                  onClick={() => setAppearanceOpen((open) => !open)}
                  className={itemClass(isGroupActive)}
                  title={collapsed ? t(item.label) : undefined}
                  aria-expanded={isOpen}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <NavLabel collapsed={collapsed}>
                    <span className="flex-1 text-left">{t(item.label)}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </NavLabel>
                </button>
                {isOpen && (
                  <div className={collapsed ? "mt-1 space-y-1" : "ml-4 mt-1 space-y-0.5 border-l border-border pl-3"}>
                    {item.children.map((child) => {
                      const active = pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={itemClass(active)}
                          title={collapsed ? t(child.label) : undefined}
                        >
                          <child.icon className="h-3.5 w-3.5 shrink-0" />
                          <NavLabel collapsed={collapsed}>{t(child.label)}</NavLabel>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={itemClass(active)}
              title={collapsed ? t(item.label) : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <NavLabel collapsed={collapsed}>{t(item.label)}</NavLabel>
            </Link>
          );
        })}
      </nav>

      <div className={`shrink-0 border-t border-border ${collapsed ? "space-y-2 p-2" : "p-4"}`}>
        <Link
          id="tutorial-widget"
          href={widgetHref}
          target="_blank"
          title={t("viewWidget")}
          className={itemClass(false)}
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          <NavLabel collapsed={collapsed}>{t("viewWidget")}</NavLabel>
        </Link>
        {!collapsed && (
          <>
            <div className="mt-3 px-3"><ThemeToggle /></div>
            <div className="mt-3 px-3"><LanguageSwitcher className="w-full justify-center" /></div>
            <div className="mt-3 rounded-xl border border-border bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">{t("signedIn")}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">{userName}</p>
            </div>
            <div className="mt-3"><InstallPWAButton variant="sidebar" /></div>
            <div className="mt-3"><LogoutButton /></div>
          </>
        )}
      </div>
    </>
  );
}

export function DashboardSidebar({
  userName,
  widgetSlug,
  userRole,
  productionOrdersEnabled,
  permissions,
}: {
  userName: string;
  widgetSlug?: string;
  userRole?: string;
  productionOrdersEnabled?: boolean;
  permissions?: string[];
}) {
  const t = useTranslations("navigation");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const sidebarSnapshot = useSyncExternalStore(
    subscribeSidebarSnapshot,
    readSidebarSnapshot,
    () => DEFAULT_SIDEBAR_STATE_JSON
  );
  const persistedSidebarState = useMemo(
    () => normalizeSidebarState(sidebarSnapshot),
    [sidebarSnapshot]
  );
  const sidebarState = useMemo(
    () => ({
      ...persistedSidebarState,
      width: dragWidth ?? persistedSidebarState.width,
    }),
    [dragWidth, persistedSidebarState]
  );

  const persist = useCallback((next: StoredSidebarState) => {
    setDragWidth(null);
    writeSidebarState(next);
  }, []);

  const toggleCollapsed = useCallback(() => {
    persist({ ...sidebarState, collapsed: !sidebarState.collapsed });
  }, [persist, sidebarState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  function beginResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (sidebarState.collapsed) persist({ ...sidebarState, collapsed: false });
    const startX = event.clientX;
    const startWidth = sidebarState.width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (moveEvent: PointerEvent) => {
      const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX));
      setDragWidth(width);
      // Keep the latest width durable even if the pointer is released outside the window.
      window.localStorage.setItem(
        SIDEBAR_STATE_KEY,
        JSON.stringify({ width, collapsed: false } satisfies StoredSidebarState)
      );
    };
    const onUp = (upEvent: PointerEvent) => {
      const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + upEvent.clientX - startX));
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      persist({ width, collapsed: false });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const desktopWidth = sidebarState.collapsed ? COLLAPSED_WIDTH : sidebarState.width;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-border bg-sidebar py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[4.75rem] md:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground" aria-label={t("openMenu")}>
          <Menu className="h-5 w-5" />
        </button>
        <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda" className="h-8 w-auto" />
      </div>
      <div className="h-[52px] shrink-0 md:hidden" />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[86vw] flex-col bg-sidebar shadow-2xl animate-drawer-left">
            <SidebarContent
              userName={userName}
              widgetSlug={widgetSlug}
              userRole={userRole}
              permissions={permissions}
              productionOrdersEnabled={productionOrdersEnabled}
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <aside
        className="relative hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex"
        style={{ width: desktopWidth }}
        data-collapsed={sidebarState.collapsed}
        data-dashboard-sidebar
      >
        <SidebarContent
          userName={userName}
          widgetSlug={widgetSlug}
          userRole={userRole}
          permissions={permissions}
          productionOrdersEnabled={productionOrdersEnabled}
          collapsed={sidebarState.collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
        {!sidebarState.collapsed && (
          <button
            type="button"
            onPointerDown={beginResize}
            className="group absolute inset-y-0 -right-2 z-20 flex w-4 cursor-col-resize items-center justify-center"
            aria-label={t("resizeSidebar")}
            title={t("resizeSidebar")}
          >
            <span className="flex h-12 w-3 items-center justify-center rounded-full border border-border bg-card opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </span>
          </button>
        )}
      </aside>
    </>
  );
}
