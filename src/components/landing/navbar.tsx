"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

const navLinks = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#caracteristicas", label: "Características" },
  { href: "#precios", label: "Precios" },
  { href: "#faq", label: "FAQ" },
];

import { Store } from "lucide-react";

interface NavbarProps {
  user?: { name: string } | null;
  business?: { name: string; logoUrl?: string | null } | null;
}

export function Navbar({ user, business }: NavbarProps = {}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-6xl z-50 rounded-full border border-border/40 bg-background/70 backdrop-blur-md shadow-sm transition-all duration-300">
        <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <div className="flex flex-1 items-center justify-start">
            <Link href="/" className="flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02]">
              <img src="/logos/logo-black.svg" alt="Puragenda Logo" className="h-10 w-auto dark:hidden" />
              <img src="/logos/logo-white.svg" alt="Puragenda Logo" className="hidden h-10 w-auto dark:block" />
              <span className="text-xl font-bold tracking-tight">
                Pura<span className="text-[#7C3AED]">genda</span>
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
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
          <div className="flex flex-1 items-center justify-end md:hidden">
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
          <div className="fixed inset-0 z-[9999] md:hidden">
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
                  <img src="/logos/logo-black.svg" alt="Puragenda Logo" className="h-8 w-auto dark:hidden" />
                  <img src="/logos/logo-white.svg" alt="Puragenda Logo" className="hidden h-8 w-auto dark:block" />
                  <span className="text-lg font-bold tracking-tight">
                    Pura<span className="text-[#7C3AED]">genda</span>
                  </span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 space-y-2 p-6">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm sm:text-base font-medium text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:translate-x-1"
                  >
                    {link.label}
                  </a>
                ))}
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
