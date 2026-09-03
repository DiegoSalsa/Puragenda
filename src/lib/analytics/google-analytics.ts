import { ADMIN_SECRET_PATH } from "@/core/constants";
import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_CONSENT_VERSION_KEY,
} from "./consent";
import { ANALYTICS_POLICY_VERSION } from "./policy";

export const GOOGLE_ANALYTICS_ID_PATTERN = /^G-[A-Z0-9]+$/i;

export function getGoogleAnalyticsId(value = process.env.NEXT_PUBLIC_GA_ID) {
  const id = value?.trim() ?? "";
  return GOOGLE_ANALYTICS_ID_PATTERN.test(id) ? id : null;
}

export function isGoogleAnalyticsPath(pathname: string) {
  return !pathname.startsWith(ADMIN_SECRET_PATH);
}

/** Runs before gtag config so the tag is present while storage stays denied until consent. */
export function getGoogleConsentBootstrapScript() {
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
var granted = false;
try {
  granted = localStorage.getItem(${JSON.stringify(ANALYTICS_CONSENT_KEY)}) === "accepted"
    && localStorage.getItem(${JSON.stringify(ANALYTICS_CONSENT_VERSION_KEY)}) === ${JSON.stringify(ANALYTICS_POLICY_VERSION)};
} catch (e) {}
gtag("consent", "default", {
  analytics_storage: granted ? "granted" : "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied"
});
`.trim();
}
