"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ANALYTICS_CONSENT_CHANGED,
  getAnalyticsConsent,
  hasAnalyticsConsent,
} from "@/lib/analytics/consent";
import {
  identifyAnalytics,
  initializeAnalytics,
  resetAnalyticsIdentity,
  setSessionReplayEnabled,
  track,
} from "@/lib/analytics/client";
import { ADMIN_SECRET_PATH } from "@/core/constants";

function pageType(pathname: string) {
  if (pathname.startsWith("/widget/")) return "booking_widget";
  if (pathname.startsWith("/dashboard")) return "product_dashboard";
  if (pathname.startsWith("/register")) return "registration";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/para/")) return "industry_landing";
  if (pathname === "/barberias" || pathname.startsWith("/barberias/")) return "marketplace";
  if (pathname === "/peluquerias" || pathname.startsWith("/peluquerias/")) return "marketplace";
  return "marketing";
}

function isReplaySafePath(pathname: string) {
  return ["/", "/pricing", "/caracteristicas", "/soluciones", "/faq", "/guias", "/sobre-nosotros", "/contacto"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const onConsentChange = (event: Event) => {
      const consent = (event as CustomEvent<"accepted" | "rejected">).detail;
      if (consent === "accepted") {
        initializeAnalytics();
        track("page_view", { page_type: pageType(pathname) });
      } else {
        setSessionReplayEnabled(false);
        resetAnalyticsIdentity();
      }
    };

    window.addEventListener(ANALYTICS_CONSENT_CHANGED, onConsentChange);
    return () => window.removeEventListener(ANALYTICS_CONSENT_CHANGED, onConsentChange);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith(ADMIN_SECRET_PATH) || !hasAnalyticsConsent()) return;
    initializeAnalytics();
    track("page_view", { page_type: pageType(pathname) });
  }, [pathname, searchParams]);

  useEffect(() => {
    if (pathname.startsWith(ADMIN_SECRET_PATH) || !hasAnalyticsConsent()) return;
    let active = true;
    void fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active || !payload?.user?.id) return;
        identifyAnalytics(payload.user.id, payload.user.role || "unknown");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    const replayAllowed = getAnalyticsConsent() === "accepted"
      && process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY === "true"
      && isReplaySafePath(pathname);
    setSessionReplayEnabled(replayAllowed);
  }, [pathname]);

  return null;
}
