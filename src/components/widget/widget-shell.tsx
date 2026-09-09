"use client";

/* Tenant-hosted branding URLs are intentionally rendered without a Next.js host allowlist. */
/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { Gift, Sparkles } from "lucide-react";

export type WidgetMode = "booking" | "gift-cards";

type WidgetShellProps = {
  business: { name: string; slug: string; logoUrl: string | null };
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  textSecondary: string;
  fontSize: number;
  cornerRadius: number;
  shadowStyle: string;
  headerAlign?: string;
  eyebrow: ReactNode;
  stepBadge?: ReactNode;
  activeMode: WidgetMode;
  showModeTabs?: boolean;
  reserveLabel: string;
  giftCardsLabel: string;
  progressLabels?: string[];
  progressIndex?: number;
  headerExtra?: ReactNode;
  children: ReactNode;
  footerExtra?: ReactNode;
  poweredByLabel: ReactNode;
};

export function getWidgetContrastColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "#FFFFFF";
  const channels = [clean.substring(0, 2), clean.substring(2, 4), clean.substring(4, 6)]
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? "#000000" : "#FFFFFF";
}

export function getWidgetShellShadow(shadowStyle: string): string {
  if (shadowStyle === "none") return "none";
  if (shadowStyle === "strong") return "0 28px 70px rgba(0,0,0,.42)";
  return "0 18px 45px rgba(0,0,0,.24)";
}

export function WidgetModeTabs({
  slug,
  activeMode,
  primaryColor,
  reserveLabel,
  giftCardsLabel,
}: {
  slug: string;
  activeMode: WidgetMode;
  primaryColor: string;
  reserveLabel: string;
  giftCardsLabel: string;
}) {
  const activeText = getWidgetContrastColor(primaryColor);
  const items = [
    { mode: "booking" as const, href: `/widget/${slug}`, label: reserveLabel, icon: null },
    { mode: "gift-cards" as const, href: `/widget/${slug}/gift-cards`, label: giftCardsLabel, icon: <Gift className="h-3.5 w-3.5" aria-hidden="true" /> },
  ];

  return (
    <nav aria-label={`${reserveLabel} / ${giftCardsLabel}`} className="mt-4 grid grid-cols-2 gap-1 rounded-xl border p-1" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
      {items.map((item) => {
        const active = item.mode === activeMode;
        return (
          <a
            key={item.mode}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={active ? { background: primaryColor, color: activeText, boxShadow: `0 4px 12px ${primaryColor}35` } : { color: "var(--wtext-secondary)" }}
          >
            {item.icon}{item.label}
          </a>
        );
      })}
    </nav>
  );
}

export function WidgetShell({
  business,
  primaryColor,
  secondaryColor,
  backgroundColor,
  textColor,
  textSecondary,
  fontSize,
  cornerRadius,
  shadowStyle,
  headerAlign = "left",
  eyebrow,
  stepBadge,
  activeMode,
  showModeTabs = false,
  reserveLabel,
  giftCardsLabel,
  progressLabels,
  progressIndex = 0,
  headerExtra,
  children,
  footerExtra,
  poweredByLabel,
}: WidgetShellProps) {
  return (
    <div
      className="flex min-h-screen w-full items-start justify-center p-3 sm:p-5"
      style={{
        background: backgroundColor,
        ["--wp" as string]: primaryColor,
        ["--wbg" as string]: backgroundColor,
        ["--wtext" as string]: textColor,
        ["--wtext-secondary" as string]: textSecondary,
        ["--wborder" as string]: secondaryColor,
        ["--wsubtle" as string]: `${textColor}08`,
        ["--wfont-size" as string]: `${fontSize}px`,
        color: textColor,
        fontSize: `${fontSize}px`,
      }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden border transition-all duration-500" style={{ background: backgroundColor, color: textColor, borderColor: "var(--wborder)", borderRadius: `${cornerRadius}px`, boxShadow: getWidgetShellShadow(shadowStyle) }}>
        <header className="relative overflow-hidden border-b px-5 py-4 sm:px-6" style={{ background: `${backgroundColor}F2`, borderColor: "var(--wborder)", backdropFilter: "blur(12px)" }}>
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${primaryColor}00 0%, ${primaryColor}40 100%)` }} />
          <div className="relative flex items-center gap-2" style={{ justifyContent: headerAlign === "center" ? "center" : headerAlign === "right" ? "flex-end" : "space-between" }}>
            <div className="flex items-center gap-3" style={{ textAlign: headerAlign as "left" | "center" | "right" }}>
              {business.logoUrl && <img src={business.logoUrl} alt={business.name} className="h-8 w-8 rounded-lg object-cover" />}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: textSecondary }}>{eyebrow}</p>
                <h1 className="text-lg font-bold tracking-tight" style={{ color: textColor }}>{business.name}</h1>
              </div>
            </div>
            {stepBadge && headerAlign === "left" && <span className="hidden rounded-lg px-2.5 py-1 text-xs font-medium sm:inline-flex" style={{ background: `${primaryColor}20`, color: primaryColor }}>{stepBadge}</span>}
          </div>
          {showModeTabs && <WidgetModeTabs slug={business.slug} activeMode={activeMode} primaryColor={primaryColor} reserveLabel={reserveLabel} giftCardsLabel={giftCardsLabel} />}
          {progressLabels && progressLabels.length > 0 && (
            <div className="mt-4 grid gap-1.5 text-[9px] sm:gap-2 sm:text-xs" style={{ gridTemplateColumns: `repeat(${progressLabels.length}, minmax(0, 1fr))` }}>
              {progressLabels.map((label, index) => (
                <div key={`${label}-${index}`} className="flex min-w-0 items-center justify-center break-words rounded-full px-1 py-1.5 text-center leading-tight transition-all duration-300 sm:px-2" style={progressIndex >= index ? { background: `${primaryColor}20`, color: primaryColor } : { border: `1px solid ${textSecondary}15`, color: textSecondary }}>
                  {label}
                </div>
              ))}
            </div>
          )}
          {headerExtra}
        </header>

        {children}
        {footerExtra}

        <footer className="mt-auto flex items-center justify-center gap-1.5 border-t px-5 py-3 text-xs font-medium" style={{ background: `${backgroundColor}F2`, color: textSecondary, borderColor: "var(--wborder)" }}>
          <span>{poweredByLabel}</span>
          <a href="https://www.puragenda.cl" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 transition-opacity hover:opacity-80">
            <span style={{ color: primaryColor, fontWeight: 700, letterSpacing: "-0.02em" }}>Puragenda</span>
            <Sparkles className="h-3 w-3" style={{ color: primaryColor }} aria-hidden="true" />
          </a>
        </footer>
      </div>
    </div>
  );
}
