export const TRACKING_EVENTS = [
  "page_view",
  "landing_cta_clicked",
  "contact_lead_submitted",
  "whatsapp_clicked",
  "pricing_plan_selected",
  "registration_started",
  "registration_completed",
  "checkout_started",
  "login_completed",
  "widget_opened",
  "booking_service_selected",
  "booking_slot_selected",
  "booking_details_submitted",
  "booking_created",
  "booking_payment_required",
  "booking_failed",
  "booking_feedback_shown",
  "booking_feedback_positive",
  "booking_feedback_improve",
  "booking_feedback_comment_submitted",
  "google_review_cta_shown",
  "google_review_cta_clicked",
  "dashboard_service_created",
  "dashboard_availability_configured",
  "dashboard_widget_link_copied",
  "changelog_launch_viewed",
  "changelog_launch_cta_clicked",
  "directory_view",
  "directory_search",
  "directory_filter",
  "directory_booking_clicked",
] as const;

export type TrackingEventName = (typeof TRACKING_EVENTS)[number];

export type TrackingPropertyValue = string | number | boolean | null;
export type TrackingProperties = Record<string, TrackingPropertyValue>;

// This is a deny-by-default schema. Adding an event or property is an explicit
// product decision and makes accidental collection of PII much harder.
export const SAFE_EVENT_PROPERTIES: Record<TrackingEventName, readonly string[]> = {
  page_view: ["page_type", "landing_path", "first_referrer_domain", "first_utm_source", "first_utm_medium", "first_utm_campaign"],
  landing_cta_clicked: ["cta", "placement", "landing_path", "first_referrer_domain", "first_utm_source", "first_utm_medium", "first_utm_campaign"],
  contact_lead_submitted: ["placement", "landing_path", "first_referrer_domain", "first_utm_source", "first_utm_medium", "first_utm_campaign"],
  whatsapp_clicked: ["placement", "landing_path", "first_referrer_domain", "first_utm_source", "first_utm_medium", "first_utm_campaign"],
  pricing_plan_selected: ["plan", "intent", "extra_staff", "billing_cycle", "landing_path", "first_referrer_domain", "first_utm_source", "first_utm_medium", "first_utm_campaign"],
  registration_started: ["plan", "intent", "extra_staff", "landing_path", "first_referrer_domain", "first_utm_source", "first_utm_medium", "first_utm_campaign"],
  registration_completed: ["plan", "intent", "country", "landing_path", "first_referrer_domain", "first_utm_source", "first_utm_medium", "first_utm_campaign"],
  checkout_started: ["plan", "provider", "extra_staff", "landing_path", "first_referrer_domain", "first_utm_source", "first_utm_medium", "first_utm_campaign"],
  login_completed: [],
  widget_opened: ["embedded", "has_locations", "has_preselected_service", "preview_mode"],
  booking_service_selected: ["booking_mode", "service_count", "has_deposit", "has_options"],
  booking_slot_selected: ["lead_days", "has_staff", "service_count"],
  booking_details_submitted: ["has_deposit", "service_count"],
  booking_created: ["has_deposit", "service_count", "payment_required"],
  booking_payment_required: ["payment_mode"],
  booking_failed: ["reason", "stage"],
  booking_feedback_shown: ["source", "authenticated"],
  booking_feedback_positive: ["source", "rating", "authenticated"],
  booking_feedback_improve: ["source", "rating", "authenticated"],
  booking_feedback_comment_submitted: ["source", "rating", "authenticated"],
  google_review_cta_shown: ["source", "rating", "authenticated"],
  google_review_cta_clicked: ["source", "rating", "authenticated"],
  dashboard_service_created: ["booking_mode", "has_deposit", "has_options"],
  dashboard_availability_configured: ["scope"],
  dashboard_widget_link_copied: ["placement"],
  changelog_launch_viewed: [],
  changelog_launch_cta_clicked: ["feature"],
  directory_view: ["page_type"],
  directory_search: ["has_query"],
  directory_filter: ["has_category", "has_locality"],
  directory_booking_clicked: ["placement"],
};

const MAX_PROPERTY_LENGTH = 120;

export function isTrackingEvent(value: string): value is TrackingEventName {
  return (TRACKING_EVENTS as readonly string[]).includes(value);
}

export function sanitizeTrackingProperties(
  event: TrackingEventName,
  properties: unknown,
): TrackingProperties {
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return {};

  const allowed = new Set(SAFE_EVENT_PROPERTIES[event]);
  const sanitized: TrackingProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!allowed.has(key)) continue;
    if (typeof value === "string") {
      sanitized[key] = value.trim().slice(0, MAX_PROPERTY_LENGTH);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = value;
    } else if (typeof value === "boolean" || value === null) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
