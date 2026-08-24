"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Menu, X } from "@/components/icons/hover-icons";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";

import { Store } from "@/components/icons/hover-icons";

interface NavbarProps {
  user?: { name: string } | null;
  business?: { name: string; logoUrl?: string | null } | null;
}

export function Navbar({ user, business }: NavbarProps = {}) {
  const legacy = useTranslations("legacy");
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navLinks = [
    { href: "/soluciones", label: t("solutions") },
    { href: "/caracteristicas", label: t("features") },
    { href: "/pricing", label: t("pricing") },
    { href: "/faq", label: t("faq") },
    { href: "/contacto", label: t("contact") },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== "undefined") {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <header className={`fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[1640px] z-50 rounded-full border border-border/40 bg-background/70 backdrop-blur-md shadow-sm transition-all duration-300 ${isVisible ? 'top-4 translate-y-0' : 'top-4 -translate-y-[150%]'}`}>
        <div className="flex w-full items-center justify-center gap-4 px-4 py-3 sm:px-6">
          {/* Logo */}
          <div className="flex w-[8.5rem] shrink-0 items-center justify-start min-[1500px]:w-[9.75rem]">
            <Link href="/" className="flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02]">
              <img src="/logos/logoPuragendaSVG.svg" alt={legacy("VtgsteC0Ewqn")} className="h-10 w-auto origin-left scale-[1.2] sm:h-12 min-[1500px]:h-14 min-[1500px]:scale-[1.35]" />
            </Link>
          </div>

          <div className="hidden min-w-0 items-center gap-3 min-[1280px]:flex min-[1500px]:gap-4">
          {/* Desktop nav */}
          <nav className="flex flex-none items-center justify-center gap-0">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-1.5 py-2 text-sm font-medium transition-all duration-200 min-[1500px]:px-3 min-[1500px]:text-base ${
                    isActive
                      ? "bg-[#7C3AED]/10 text-[#7C3AED] font-semibold"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="flex shrink-0 items-center justify-end gap-1.5 min-[1500px]:gap-2">
            {user ? (
              <Link href="/dashboard">
                <button className="group flex items-center gap-2 rounded-full border border-border/50 bg-card/60 backdrop-blur-xl px-5 py-2 text-sm font-medium shadow-sm transition-all hover:bg-muted hover:border-border">
                  {business?.logoUrl ? (
                    <img src={business.logoUrl} alt={business.name} className="h-5 w-5 rounded-md object-cover" />
                  ) : (
                    <Store className="h-4 w-4 text-[#7C3AED]" />
                  )}
                  <span className="font-semibold text-foreground">{business?.name || user.name}</span>
                </button>
              </Link>
            ) : (
              <>
                <Link href="/mi-agenda">
                  <button className="rounded-full px-3 py-2 text-sm font-semibold text-[#7C3AED] transition-all duration-200 hover:bg-[#7C3AED]/10 min-[1500px]:px-4 min-[1500px]:text-base">
                    {t("myAppointments")}
                  </button>
                </Link>
                <Link href="/login">
                  <button className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground min-[1500px]:px-4 min-[1500px]:text-base">
                    {t("login")}
                  </button>
                </Link>
                <Link href="/pricing">
                  <button className="group flex items-center gap-2 rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#7C3AED]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#6D28D9] hover:shadow-[#7C3AED]/40 min-[1500px]:px-5 min-[1500px]:py-2.5 min-[1500px]:text-base">
                    {t("createAccount")} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </Link>
              </>
            )}
            <div className="ml-1 flex shrink-0 items-center gap-1.5" aria-label={t("preferences")}>
              <ThemeToggle />
              <LanguageSwitcher compact />
            </div>
          </div>
          </div>

          {/* Mobile hamburger */}
          <div className="flex flex-1 items-center justify-end min-[1280px]:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label={t("openMenu")}
              className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ MOBILE DRAWER — rendered via portal OUTSIDE the header ═══ */}
      {mobileOpen && typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] min-[1280px]:hidden">
            {/* Dark overlay */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer panel */}
            <aside className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-l border-border/50 z-[10000] shadow-2xl animate-drawer-right bg-background/95 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 p-6">
                <div className="flex items-center gap-2.5">
                  <img src="/logos/logoPuragendaSVG.svg" alt={legacy("VtgsteC0Ewqn")} className="h-10 sm:h-12 w-auto scale-[1.3] origin-left" />
                </div>
                <button aria-label={t("closeMenu")} onClick={() => setMobileOpen(false)} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 space-y-2 p-6">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block rounded-2xl px-4 py-3 text-sm sm:text-base font-medium transition-all hover:translate-x-1 ${
                        isActive
                          ? "bg-[#7C3AED]/10 text-[#7C3AED] font-semibold"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>

              {/* Bottom actions */}
              <div className="space-y-4 border-t border-border/50 p-6">
                <div className="flex items-center justify-end gap-1.5" aria-label={t("preferences")}>
                  <ThemeToggle />
                  <LanguageSwitcher compact />
                </div>
                {user ? (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block">
                    <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card/60 py-3 text-sm font-medium shadow-sm transition-all hover:bg-muted hover:border-border">
                      {business?.logoUrl ? (
                        <img src={business.logoUrl} alt={business.name} className="h-5 w-5 rounded-md object-cover" />
                      ) : (
                        <Store className="h-4 w-4 text-[#7C3AED]" />
                      )}
                      <span className="font-semibold text-foreground">{business?.name || user.name}</span>
                    </button>
                  </Link>
                ) : (
                  <>
                    <Link href="/mi-agenda" onClick={() => setMobileOpen(false)} className="block">
                      <button className="w-full rounded-2xl border-2 border-[#7C3AED] py-3 text-sm font-semibold text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10">
                        {t("viewMyAppointments")}
                      </button>
                    </Link>
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="block">
                      <button className="w-full rounded-2xl border border-border/50 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground">
                        {t("login")}
                      </button>
                    </Link>
                    <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block">
                      <button className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/20 transition-all hover:bg-[#6D28D9] hover:shadow-[#7C3AED]/40">
                        {t("createAccount")} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </aside>
          </div>,
          document.body
        )
      }
    </>
  );
}
