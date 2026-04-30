"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

const navLinks = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#caracteristicas", label: "Características" },
  { href: "#precios", label: "Precios" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex flex-1 items-center justify-start">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logos/logo-black.svg" alt="Puragenda Logo" className="h-12 w-auto -my-2 dark:hidden" />
            <img src="/logos/logo-white.svg" alt="Puragenda Logo" className="hidden h-12 w-auto -my-2 dark:block" />
            <span className="text-xl font-bold tracking-tight">
              Pura<span className="text-[#7C3AED]">genda</span>
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
          <ThemeToggle />
          <Link href="/login">
            <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground">
              Entrar
            </button>
          </Link>
          <Link href="/pricing">
            <button className="flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35">
              Crear cuenta <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white dark:bg-neutral-950 z-50 shadow-2xl animate-slide-left">
            <div className="flex items-center justify-between border-b border-border p-6">
              <div className="flex items-center gap-2.5">
                <img src="/logos/logo-black.svg" alt="Puragenda Logo" className="h-10 w-auto -my-1 dark:hidden" />
                <img src="/logos/logo-white.svg" alt="Puragenda Logo" className="hidden h-10 w-auto -my-1 dark:block" />
                <span className="text-lg font-bold tracking-tight">
                  Pura<span className="text-[#7C3AED]">genda</span>
                </span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="space-y-3 border-t border-border p-4">
              <div className="px-3">
                <ThemeToggle />
              </div>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <button className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground">
                  Entrar
                </button>
              </Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)}>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25">
                  Crear cuenta <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
