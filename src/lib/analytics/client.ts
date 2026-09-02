"use client";

import { hasAnalyticsConsent } from "@/lib/analytics/consent";
import { ANALYTICS_POLICY_VERSION } from "@/lib/analytics/policy";
import {
  type TrackingEventName,
  type TrackingProperties,
  sanitizeTrackingProperties,
} from "@/lib/analytics/events";
import { normalizeTrackingPath } from "@/lib/analytics/path";

const VISITOR_ID_KEY = "puragenda_tracking_visitor_id";
const SESSION_ID_KEY = "puragenda_tracking_session_id";
const ATTRIBUTION_KEY = "puragenda_first_touch";

type PostHogClient = typeof import("posthog-js")["default"];

let posthogClient: PostHogClient | null = null;
let posthogPromise: Promise<PostHogClient | null> | null = null;

function loadPosthog(): Promise<PostHogClient | null> {
  if (posthogClient) return Promise.resolve(posthogClient);
  if (posthogPromise) return posthogPromise;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token || !hasAnalyticsConsent()) return Promise.resolve(null);

  posthogPromise = import("posthog-js").then(({ default: posthog }) => {
    if (!hasAnalyticsConsent()) return null;
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
    posthogClient = posthog;
    return posthog;
  }).then((posthog) => {
    if (!posthog) posthogPromise = null;
    return posthog;
  }).catch(() => {
    posthogPromise = null;
    return null;
  });

  return posthogPromise;
}

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

export function getTrackingIdentifiers() {
  return {
    visitorId: getStoredId(VISITOR_ID_KEY, window.localStorage),
    sessionId: getStoredId(SESSION_ID_KEY, window.sessionStorage),
  };
}

function currentContext() {
  const url = new URL(window.location.href);
  const referrer = document.referrer ? new URL(document.referrer) : null;
  return {
    ...getTrackingIdentifiers(),
    path: normalizeTrackingPath(url.pathname),
    referrerDomain: referrer?.hostname || undefined,
    utmSource: url.searchParams.get("utm_source") || undefined,
    utmMedium: url.searchParams.get("utm_medium") || undefined,
    utmCampaign: url.searchParams.get("utm_campaign") || undefined,
  };
}

type FirstTouchAttribution = {
  landingPath: string;
  referrerDomain?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

function firstTouchAttribution(): FirstTouchAttribution {
  const stored = window.localStorage.getItem(ATTRIBUTION_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as FirstTouchAttribution;
      if (parsed.landingPath) return parsed;
    } catch {
      window.localStorage.removeItem(ATTRIBUTION_KEY);
    }
  }

  const url = new URL(window.location.href);
  let referrerDomain: string | undefined;
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer && referrer.hostname !== url.hostname) referrerDomain = referrer.hostname;
  } catch {
    referrerDomain = undefined;
  }

  const attribution: FirstTouchAttribution = {
    landingPath: normalizeTrackingPath(url.pathname),
    referrerDomain,
    utmSource: url.searchParams.get("utm_source") || undefined,
    utmMedium: url.searchParams.get("utm_medium") || undefined,
    utmCampaign: url.searchParams.get("utm_campaign") || undefined,
  };
  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
}

export function initializeAnalytics() {
  if (!hasAnalyticsConsent()) return;
  if (posthogClient) {
    posthogClient.opt_in_capturing();
    return;
  }
  void loadPosthog();
}

export function setSessionReplayEnabled(enabled: boolean) {
  if (posthogClient) {
    if (enabled) posthogClient.startSessionRecording();
    else posthogClient.stopSessionRecording();
    return;
  }
  if (enabled) void loadPosthog().then((posthog) => posthog?.startSessionRecording());
}

export function identifyAnalytics(userId: string, role: string) {
  if (posthogClient) posthogClient.identify(userId, { role });
  else void loadPosthog().then((posthog) => posthog?.identify(userId, { role }));
}

export function resetAnalyticsIdentity() {
  if (posthogClient) {
    posthogClient.opt_out_capturing();
    posthogClient.reset();
  }
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
  const attribution = firstTouchAttribution();
  const safeProperties = sanitizeTrackingProperties(event, {
    ...properties,
    landing_path: attribution.landingPath,
    first_referrer_domain: attribution.referrerDomain,
    first_utm_source: attribution.utmSource,
    first_utm_medium: attribution.utmMedium,
    first_utm_campaign: attribution.utmCampaign,
  });
  const browserContext = currentContext();
  const payload = {
    event,
    ...browserContext,
    consentVersion: ANALYTICS_POLICY_VERSION,
    businessSlug: eventContext?.businessSlug,
    properties: safeProperties,
  };

  // Keep the internal dashboard independent from any third-party provider.
  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);

  void loadPosthog().then((posthog) => {
    posthog?.capture(event, { ...safeProperties, $current_url: window.location.origin + payload.path });
  });
}

/** Records the user's choice so the server can demonstrate when consent was granted or denied. */
export async function recordAnalyticsConsent(
  decision: "accepted" | "rejected",
  identifiers = typeof window === "undefined" ? undefined : getTrackingIdentifiers(),
) {
  if (typeof window === "undefined") throw new Error("Consentimiento disponible solo en el navegador");
  const response = await fetch("/api/analytics/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({
      decision,
      policyVersion: ANALYTICS_POLICY_VERSION,
      visitorId: identifiers?.visitorId,
      sessionId: identifiers?.sessionId,
    }),
  });
  if (!response.ok) throw new Error("No se pudo guardar la preferencia");
  return response.json() as Promise<{ ok: true; occurredAt: string }>;
}
