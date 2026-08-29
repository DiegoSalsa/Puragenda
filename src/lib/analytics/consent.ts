export const ANALYTICS_CONSENT_KEY = "puragenda_cookie_consent";
export const ANALYTICS_CONSENT_CHANGED = "puragenda:analytics-consent-changed";

export type AnalyticsConsent = "accepted" | "rejected" | null;

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsent() === "accepted";
}

export function setAnalyticsConsent(value: Exclude<AnalyticsConsent, null>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent<AnalyticsConsent>(ANALYTICS_CONSENT_CHANGED, { detail: value }));
}
