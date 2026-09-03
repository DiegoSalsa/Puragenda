"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_CONSENT_CHANGED,
  hasAnalyticsConsent,
} from "@/lib/analytics/consent";
import { isGoogleAnalyticsPath } from "@/lib/analytics/google-analytics";
import { toGoogleAnalyticsPagePath } from "@/lib/analytics/path";

type Gtag = (...args: unknown[]) => void;

function getGtag(): Gtag | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { gtag?: Gtag }).gtag;
}

function setAnalyticsStorage(granted: boolean) {
  const gtag = getGtag();
  if (!gtag) return;
  gtag("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
}

/** Keeps GA4 Consent Mode in sync. gtag.js itself is mounted from the root layout. */
export function GoogleAnalyticsConsent() {
  const pathname = usePathname();
  const allowed = isGoogleAnalyticsPath(pathname);
  const lastSpaPath = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setAnalyticsStorage(allowed && hasAnalyticsConsent());
    };
    sync();
    window.addEventListener(ANALYTICS_CONSENT_CHANGED, sync);
    return () => window.removeEventListener(ANALYTICS_CONSENT_CHANGED, sync);
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    if (lastSpaPath.current === null) {
      lastSpaPath.current = pathname;
      return;
    }
    if (lastSpaPath.current === pathname) return;
    lastSpaPath.current = pathname;
    const gtag = getGtag();
    if (!gtag) return;
    const pagePath = toGoogleAnalyticsPagePath(pathname);
    gtag("event", "page_view", {
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
    });
  }, [allowed, pathname]);

  return null;
}
