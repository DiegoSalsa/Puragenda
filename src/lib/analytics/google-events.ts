import type { TrackingEventName, TrackingProperties } from "./events";
import { toGoogleAnalyticsPagePath } from "./path";

export type GoogleAnalyticsEvent = {
  name: string;
  params: TrackingProperties;
};

const ATTRIBUTION_KEYS = new Set([
  "landing_path",
  "first_referrer_domain",
  "first_utm_source",
  "first_utm_medium",
  "first_utm_campaign",
]);

function withoutAttribution(properties: TrackingProperties): TrackingProperties {
  const next: TrackingProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (ATTRIBUTION_KEYS.has(key) || value === undefined) continue;
    next[key] = value;
  }
  return next;
}

function pick(properties: TrackingProperties, keys: readonly string[]): TrackingProperties {
  const next: TrackingProperties = {};
  for (const key of keys) {
    const value = properties[key];
    if (value !== undefined) next[key] = value;
  }
  return next;
}

/**
 * Maps first-party tracking events to GA4 event names. Page views are omitted
 * here: gtag config owns the initial hit, and SPA navigations are sent separately.
 */
export function googleAnalyticsEventsFor(
  event: TrackingEventName,
  properties: TrackingProperties,
  context: { pagePath: string },
): GoogleAnalyticsEvent[] {
  const sourcePage = toGoogleAnalyticsPagePath(context.pagePath);
  const safe = withoutAttribution(properties);

  if (event === "page_view") return [];

  if (event === "registration_completed") {
    const events: GoogleAnalyticsEvent[] = [
      { name: "sign_up", params: { method: "email", ...pick(safe, ["plan", "intent", "country"]) } },
      { name: "business_created", params: pick(safe, ["plan", "intent", "country"]) },
    ];
    if (safe.intent !== "subscription") {
      events.push({ name: "trial_started", params: pick(safe, ["plan", "intent"]) });
    }
    return events;
  }

  if (event === "login_completed") {
    return [{ name: "login", params: { method: "email" } }];
  }

  if (event === "booking_service_selected") {
    return [{
      name: "booking_started",
      params: { ...pick(safe, ["booking_mode", "service_count", "has_deposit", "has_options"]), booking_source: "widget" },
    }];
  }

  if (event === "booking_created") {
    return [{
      name: "booking_completed",
      params: { ...pick(safe, ["has_deposit", "service_count", "payment_required"]), booking_source: "widget" },
    }];
  }

  if (event === "landing_cta_clicked" && safe.cta === "register") {
    return [{
      name: "sign_up_cta_clicked",
      params: {
        source_page: sourcePage,
        cta_location: typeof safe.placement === "string" ? safe.placement : "unknown",
      },
    }];
  }

  return [{ name: event, params: { ...safe, source_page: sourcePage } }];
}
