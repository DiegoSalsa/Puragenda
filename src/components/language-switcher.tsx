"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Loader2, LocateFixed, MapPin } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  type AppLocale,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "@/i18n/config";

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
  align?: "left" | "right";
}

type LocationState = "idle" | "locating" | "success" | "error";

function LocaleFlag({ locale, className = "" }: { locale: AppLocale; className?: string }) {
  const baseClass = `h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-black/15 shadow-sm ${className}`;

  if (locale === "es") {
    return <svg viewBox="0 0 24 16" className={baseClass} aria-hidden="true"><path fill="#fff" d="M0 0h24v8H0z"/><path fill="#d52b1e" d="M0 8h24v8H0z"/><path fill="#0039a6" d="M0 0h8v8H0z"/><path fill="#fff" d="m4 1.7.7 1.5 1.6.2-1.2 1.1.3 1.6L4 5.3 2.6 6l.3-1.5-1.2-1.1 1.6-.2z"/></svg>;
  }
  if (locale === "en") {
    return <svg viewBox="0 0 24 16" className={baseClass} aria-hidden="true"><path fill="#fff" d="M0 0h24v16H0z"/><path fill="#b22234" d="M0 0h24v2H0zm0 4h24v2H0zm0 4h24v2H0zm0 4h24v2H0z"/><path fill="#3c3b6e" d="M0 0h10v8H0z"/><g fill="#fff"><circle cx="2" cy="2" r=".6"/><circle cx="5" cy="2" r=".6"/><circle cx="8" cy="2" r=".6"/><circle cx="3.5" cy="4" r=".6"/><circle cx="6.5" cy="4" r=".6"/><circle cx="2" cy="6" r=".6"/><circle cx="5" cy="6" r=".6"/><circle cx="8" cy="6" r=".6"/></g></svg>;
  }
  if (locale === "it") {
    return <svg viewBox="0 0 24 16" className={baseClass} aria-hidden="true"><path fill="#009246" d="M0 0h8v16H0z"/><path fill="#fff" d="M8 0h8v16H8z"/><path fill="#ce2b37" d="M16 0h8v16h-8z"/></svg>;
  }
  if (locale === "pt") {
    return <svg viewBox="0 0 24 16" className={baseClass} aria-hidden="true"><path fill="#009b3a" d="M0 0h24v16H0z"/><path fill="#ffdf00" d="m12 2 9 6-9 6-9-6z"/><circle cx="12" cy="8" r="3.2" fill="#002776"/><path d="M9.4 7.2c1.7-.7 3.8-.5 5.4.5" fill="none" stroke="#fff" strokeWidth=".6"/></svg>;
  }
  if (locale === "fr") {
    return <svg viewBox="0 0 24 16" className={baseClass} aria-hidden="true"><path fill="#0055a4" d="M0 0h8v16H0z"/><path fill="#fff" d="M8 0h8v16H8z"/><path fill="#ef4135" d="M16 0h8v16h-8z"/></svg>;
  }
  if (locale === "de") {
    return <svg viewBox="0 0 24 16" className={baseClass} aria-hidden="true"><path fill="#000" d="M0 0h24v5.34H0z"/><path fill="#dd0000" d="M0 5.33h24v5.34H0z"/><path fill="#ffce00" d="M0 10.66h24V16H0z"/></svg>;
  }
  return <svg viewBox="0 0 24 16" className={baseClass} aria-hidden="true"><path fill="#de2910" d="M0 0h24v16H0z"/><path fill="#ffde00" d="m4 2 .8 1.6 1.8.3-1.3 1.3.3 1.8L4 6.1 2.4 7l.3-1.8-1.3-1.3 1.8-.3z"/><g fill="#ffde00"><circle cx="8" cy="2" r=".55"/><circle cx="10" cy="4" r=".55"/><circle cx="10" cy="7" r=".55"/><circle cx="8" cy="9" r=".55"/></g></svg>;
}

function localeFromCoordinates(latitude: number, longitude: number): AppLocale | null {
  if (latitude >= -56 && latitude <= -17 && longitude >= -76 && longitude <= -66) return "es";
  if (latitude >= 18 && latitude <= 72 && longitude >= -170 && longitude <= -66) return "en";
  if (latitude >= 35 && latitude <= 48 && longitude >= 6 && longitude <= 19) return "it";
  if (latitude >= -34 && latitude <= 6 && longitude >= -74 && longitude <= -34) return "pt";
  if (latitude >= 41 && latitude <= 52 && longitude >= -5 && longitude <= 10) return "fr";
  if (latitude >= 47 && latitude <= 55 && longitude >= 5 && longitude <= 16) return "de";
  if (latitude >= 18 && latitude <= 54 && longitude >= 73 && longitude <= 135) return "zh-CN";
  return null;
}

function persistLocalePreference(nextLocale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.setAttribute("lang", nextLocale);
}

export function LanguageSwitcher({ compact = false, className = "", align = "right" }: LanguageSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [pending, startTransition] = useTransition();
  const activeLocale = LOCALE_LABELS[locale];

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function changeLocale(nextLocale: AppLocale, source: "manual" | "location" = "manual") {
    setOpen(false);
    if (source === "location") setLocationState("success");
    startTransition(async () => {
      if (pathname.startsWith("/dashboard")) {
        await fetch("/api/dashboard/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: nextLocale }),
        }).catch(() => null);
      }
      persistLocalePreference(nextLocale);
      router.refresh();
    });
  }

  function detectFromLocation() {
    if (!navigator.geolocation) {
      setLocationState("error");
      return;
    }

    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinateLocale = localeFromCoordinates(coords.latitude, coords.longitude);
        const browserLocale = resolveLocale(navigator.languages?.[0] ?? navigator.language);
        changeLocale(coordinateLocale ?? browserLocale, "location");
      },
      () => setLocationState("error"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60 * 60 * 1000 },
    );
  }

  return (
    <div ref={containerRef} className={`relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language")}
        disabled={pending}
        onClick={() => setOpen((current) => !current)}
        className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#7C3AED]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/35 disabled:cursor-wait disabled:opacity-65"
      >
        <LocaleFlag locale={locale} />
        <span>{compact ? activeLocale.short : activeLocale.native}</span>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7C3AED]" aria-hidden="true" />
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("chooseLanguage")}
          className={`absolute top-[calc(100%+0.65rem)] z-[80] w-[18rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background p-2 shadow-[0_18px_55px_rgba(0,0,0,0.18)] ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="px-2 pb-2 pt-1">
            <p className="text-sm font-bold text-foreground">{t("chooseLanguage")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t("languageDescription")}</p>
          </div>

          <div className="grid grid-cols-2 gap-1" role="none">
            {SUPPORTED_LOCALES.map((supportedLocale) => {
              const option = LOCALE_LABELS[supportedLocale];
              const selected = locale === supportedLocale;
              return (
                <button
                  key={supportedLocale}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => changeLocale(supportedLocale)}
                  className={`flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/35 ${selected ? "bg-[#7C3AED]/10 font-bold text-[#7C3AED]" : "text-foreground hover:bg-muted"}`}
                >
                  <LocaleFlag locale={supportedLocale} />
                  <span className="min-w-0 flex-1 truncate">{option.native}</span>
                  {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={detectFromLocation}
              disabled={locationState === "locating" || pending}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/35 disabled:cursor-wait disabled:opacity-70"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
                {locationState === "locating" ? <Loader2 className="h-4 w-4 animate-spin" /> : locationState === "success" ? <MapPin className="h-4 w-4" /> : <LocateFixed className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">
                  {locationState === "locating" ? t("detectingLocation") : locationState === "success" ? t("locationApplied") : t("useLocation")}
                </span>
                <span className={`mt-0.5 block text-xs leading-relaxed ${locationState === "error" ? "text-red-500" : "text-muted-foreground"}`}>
                  {locationState === "error" ? t("locationError") : t("locationPrivacy")}
                </span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
