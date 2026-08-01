"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

const navLinks = [
  { href: "/soluciones", label: "Soluciones" },
  { href: "/caracteristicas", label: "Características" },
  { href: "/pricing", label: "Precios" },
  { href: "/guias", label: "Guías" },
  { href: "/faq", label: "FAQ" },
  { href: "/sobre-nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

import { Store } from "lucide-react";

interface NavbarProps {
  user?: { name: string } | null;
  business?: { name: string; logoUrl?: string | null } | null;
}

export function Navbar({ user, business }: NavbarProps = {}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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
      <header className={`fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-6xl z-50 rounded-full border border-border/40 bg-background/70 backdrop-blur-md shadow-sm transition-all duration-300 ${isVisible ? 'top-4 translate-y-0' : 'top-4 -translate-y-[150%]'}`}>
        <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <div className="flex flex-1 items-center justify-start">
            <Link href="/" className="flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02]">
              <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda Logo" className="h-12 sm:h-14 w-auto scale-[1.35] origin-left" />
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0 xl:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${
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
          <div className="hidden flex-1 items-center justify-end gap-2 xl:flex">
            <ThemeToggle />
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
                  <button className="rounded-full px-4 py-2 text-sm font-semibold text-[#7C3AED] transition-all duration-200 hover:bg-[#7C3AED]/10">
                    Mis citas
                  </button>
                </Link>
                <Link href="/login">
                  <button className="rounded-full px-5 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground">
                    Entrar
                  </button>
                </Link>
                <Link href="/pricing">
                  <button className="group flex items-center gap-2 rounded-full bg-[#7C3AED] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[#7C3AED]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#6D28D9] hover:shadow-[#7C3AED]/40">
                    Crear cuenta <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex flex-1 items-center justify-end xl:hidden">
            <button
              onClick={() => setMobileOpen(true)}
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
          <div className="fixed inset-0 z-[9999] xl:hidden">
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
                  <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda Logo" className="h-10 sm:h-12 w-auto scale-[1.3] origin-left" />
                </div>
                <button onClick={() => setMobileOpen(false)} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
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
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium text-muted-foreground">Tema visual</span>
                  <ThemeToggle />
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
                        Ver mis citas
                      </button>
                    </Link>
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="block">
                      <button className="w-full rounded-2xl border border-border/50 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground">
                        Entrar
                      </button>
                    </Link>
                    <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block">
                      <button className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/20 transition-all hover:bg-[#6D28D9] hover:shadow-[#7C3AED]/40">
                        Crear cuenta <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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
