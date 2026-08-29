import { ANALYTICS_POLICY_VERSION } from "./policy";

export { ANALYTICS_POLICY_VERSION } from "./policy";

export const ANALYTICS_CONSENT_KEY = "puragenda_cookie_consent";
export const ANALYTICS_CONSENT_VERSION_KEY = "puragenda_cookie_consent_version";
export const ANALYTICS_CONSENT_AT_KEY = "puragenda_cookie_consent_at";
export const ANALYTICS_CONSENT_CHANGED = "puragenda:analytics-consent-changed";

export type AnalyticsConsent = "accepted" | "rejected" | null;

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return null;
  if (window.localStorage.getItem(ANALYTICS_CONSENT_VERSION_KEY) !== ANALYTICS_POLICY_VERSION) return null;
  const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function getAnalyticsConsentAt() {
  if (typeof window === "undefined" || !getAnalyticsConsent()) return null;
  return window.localStorage.getItem(ANALYTICS_CONSENT_AT_KEY);
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsent() === "accepted";
}

export function setAnalyticsConsent(value: Exclude<AnalyticsConsent, null>) {
  if (typeof window === "undefined") return;
  const occurredAt = new Date().toISOString();
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  window.localStorage.setItem(ANALYTICS_CONSENT_VERSION_KEY, ANALYTICS_POLICY_VERSION);
  window.localStorage.setItem(ANALYTICS_CONSENT_AT_KEY, occurredAt);
  window.dispatchEvent(new CustomEvent<AnalyticsConsent>(ANALYTICS_CONSENT_CHANGED, { detail: value }));
}
