"use client";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ShieldCheck, BarChart3, Building2, CalendarClock, Users, Contact, CreditCard, Mail, Tag, Menu, X, MapPin } from "@/components/icons/hover-icons";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ADMIN_SECRET_PATH } from "@/core/constants";

const NAV_ITEMS = [
  { href: ADMIN_SECRET_PATH, icon: BarChart3, label: "Dashboard" },
  { href: `${ADMIN_SECRET_PATH}/businesses`, icon: Building2, label: "Negocios" },
  { href: `${ADMIN_SECRET_PATH}/marketplace`, icon: MapPin, label: "Marketplace" },
  { href: `${ADMIN_SECRET_PATH}/clients`, icon: Contact, label: "Clientes" },
  { href: `${ADMIN_SECRET_PATH}/users`, icon: Users, label: "Usuarios internos" },
  { href: `${ADMIN_SECRET_PATH}/subscriptions`, icon: CreditCard, label: "Suscripciones" },
  { href: `${ADMIN_SECRET_PATH}/tracking`, icon: BarChart3, label: "Tracking" },
  { href: `${ADMIN_SECRET_PATH}/privacy-requests`, icon: ShieldCheck, label: "Solicitudes de privacidad" },
  { href: `${ADMIN_SECRET_PATH}/discounts`, icon: Tag, label: "Descuentos" },
  { href: `${ADMIN_SECRET_PATH}/communications`, icon: Mail, label: "Comunicaciones" },
];

export function AdminPanelShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-[#FFFAEB] font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r-4 border-black bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="border-b-4 border-black p-5">
          <div className="flex items-center justify-between">
            <Link href={ADMIN_SECRET_PATH} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black shadow-[3px_3px_0_#7C3AED]">
                <Shield className="h-5 w-5 text-[#B28DFF]" />
              </div>
              <div>
                <span className="text-lg font-black uppercase tracking-tight text-black">
                  <LocalizedText id="gYXIrEZWIZ9K" /><span className="text-white"><LocalizedText id="wcIksDzZvHtq" /></span>
                </span>
                <p className="text-[10px] font-black uppercase tracking-widest text-black/50"><LocalizedText id="D47r2JulTmF5" /></p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center border-2 border-black bg-[#FFB5E8] text-black lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-widest text-black/40"><LocalizedText id="XXMl3QB8zCje" /></p>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== ADMIN_SECRET_PATH && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 border-2 border-black px-3 py-2.5 text-sm font-black uppercase transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
                  isActive
                    ? "translate-x-[2px] translate-y-[2px] bg-[#B28DFF] text-black shadow-none"
                    : "bg-black text-[#B28DFF] shadow-[3px_3px_0_#7C3AED] hover:bg-[#1a1a1a]"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="my-4 border-t-2 border-black/20" />
          <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-widest text-black/40"><LocalizedText id="XJyhAWbkZhXE" /></p>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 border-2 border-black px-3 py-2.5 text-sm font-black uppercase transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-black/10 text-black/60 shadow-[2px_2px_0_#000] hover:bg-black/20 hover:text-black"
          >
            <CalendarClock className="h-4 w-4" />
            <LocalizedText id="mmi-JUzXAKSI" />
          </Link>
        </nav>

        {/* Admin identity */}
        <div className="border-t-4 border-black p-4 space-y-3">
          <div className="border-2 border-black bg-black/10 p-3 shadow-[3px_3px_0_#000]">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3 w-3 text-black" />
              <p className="text-[10px] font-black uppercase tracking-widest text-black"><LocalizedText id="n1P5bBu3ohgX" /></p>
            </div>
            <p className="text-sm font-black text-black">{userName}</p>
            <p className="text-[11px] font-bold text-black/60">{userEmail}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Top bar with hamburger on mobile */}
        <div className="border-b-4 border-black bg-[#FFF5BA] px-4 py-2 sm:px-8 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center border-2 border-black bg-black text-[#B28DFF] shadow-[2px_2px_0_#7C3AED] lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/50">
            <LocalizedText id="H7E4bjOiLaRF" />
          </p>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
