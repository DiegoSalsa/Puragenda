"use client";

import posthog from "posthog-js";
import { hasAnalyticsConsent } from "@/lib/analytics/consent";
import {
  type TrackingEventName,
  type TrackingProperties,
  sanitizeTrackingProperties,
} from "@/lib/analytics/events";

const VISITOR_ID_KEY = "puragenda_tracking_visitor_id";
const SESSION_ID_KEY = "puragenda_tracking_session_id";

let posthogInitialized = false;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function getStoredId(key: string, storage: Storage) {
  const current = storage.getItem(key);
  if (current) return current;
  const next = createId();
  storage.setItem(key, next);
  return next;
}

function currentContext() {
  const url = new URL(window.location.href);
  const referrer = document.referrer ? new URL(document.referrer) : null;
  return {
    visitorId: getStoredId(VISITOR_ID_KEY, window.localStorage),
    sessionId: getStoredId(SESSION_ID_KEY, window.sessionStorage),
    path: url.pathname,
    referrerDomain: referrer?.hostname || undefined,
    utmSource: url.searchParams.get("utm_source") || undefined,
    utmMedium: url.searchParams.get("utm_medium") || undefined,
    utmCampaign: url.searchParams.get("utm_campaign") || undefined,
  };
}

export function initializeAnalytics() {
  if (!hasAnalyticsConsent() || posthogInitialized) return;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return;

  posthog.init(token, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
    autocapture: false,
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
      maskCapturedNetworkRequestFn: (request) => {
        if (request.name) request.name = request.name.split("?")[0];
        return request;
      },
    },
  });
  posthogInitialized = true;
}

export function setSessionReplayEnabled(enabled: boolean) {
  if (!posthogInitialized) return;
  if (enabled) posthog.startSessionRecording();
  else posthog.stopSessionRecording();
}

export function identifyAnalytics(userId: string, role: string) {
  if (posthogInitialized) posthog.identify(userId, { role });
}

export function resetAnalyticsIdentity() {
  if (posthogInitialized) posthog.reset();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(VISITOR_ID_KEY);
    window.sessionStorage.removeItem(SESSION_ID_KEY);
  }
}

export function track(
  event: TrackingEventName,
  properties: TrackingProperties = {},
  eventContext?: { businessSlug?: string },
) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;

  initializeAnalytics();
  const safeProperties = sanitizeTrackingProperties(event, properties);
  const browserContext = currentContext();
  const payload = { event, ...browserContext, businessSlug: eventContext?.businessSlug, properties: safeProperties };

  // Keep the internal dashboard independent from any third-party provider.
  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);

  if (posthogInitialized) posthog.capture(event, { ...safeProperties, $current_url: window.location.origin + payload.path });
}
