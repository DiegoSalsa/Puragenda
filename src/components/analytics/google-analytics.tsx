"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";
import {
  ANALYTICS_CONSENT_CHANGED,
  hasAnalyticsConsent,
} from "@/lib/analytics/consent";
import { isGoogleAnalyticsPath } from "@/lib/analytics/google-analytics";

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

/**
 * Loads gtag.js once via @next/third-parties after cookie consent.
 * Page views come from the initial gtag config plus GA4 enhanced measurement
 * of history changes, so this component must not send extra page_view events.
 */
export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const [scriptReady, setScriptReady] = useState(false);
  const allowed = isGoogleAnalyticsPath(pathname);

  useEffect(() => {
    const sync = () => {
      const granted = allowed && hasAnalyticsConsent();
      if (granted) setScriptReady(true);
      setAnalyticsStorage(granted);
    };
    sync();
    window.addEventListener(ANALYTICS_CONSENT_CHANGED, sync);
    return () => window.removeEventListener(ANALYTICS_CONSENT_CHANGED, sync);
  }, [allowed]);

  if (!scriptReady) return null;
  return <NextGoogleAnalytics gaId={gaId} />;
}
