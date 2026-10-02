import { hasOperationalSubscriptionAccess, type OperationalSubscription } from "@/core/subscription-access";
import { hasWebsiteEntitlement, type WebsiteAccess } from "./policy";
import { websiteTrialState, type WebsiteOffer } from "./offers";
export function websiteSupportReasons(site: { status: string; publishedConfig: unknown } | null, addon: WebsiteAccess | null, offer: WebsiteOffer | null, base: OperationalSubscription | null, domains: { status: string }[] = [], now = new Date()) {
  const reasons: string[] = [];
  if (!hasOperationalSubscriptionAccess(base, now)) reasons.push("BASE_INACTIVE");
  if (!hasWebsiteEntitlement(addon, now, offer)) {
    if (addon?.status === "PAST_DUE") reasons.push("WEBSITE_PAST_DUE");
    else if (websiteTrialState(offer, now) === "EXPIRED") reasons.push("TRIAL_EXPIRED");
    else reasons.push("WEBSITE_NOT_PAID");
  }
  if (!site || site.status !== "PUBLISHED" || !site.publishedConfig) reasons.push("NOT_PUBLISHED");
  if (domains.some(d => d.status === "PENDING" || d.status === "VERIFIED")) reasons.push("DOMAIN_PENDING");
  if (domains.some(d => d.status === "FAILED" || d.status === "MISCONFIGURED")) reasons.push("DOMAIN_MISCONFIGURED");
  return reasons;
}
