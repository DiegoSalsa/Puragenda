import { hasOperationalSubscriptionAccess, type OperationalSubscription } from "@/core/subscription-access";

export type WebsiteAccess = { status: string; validUntil?: Date | string | null; cancelAt?: Date | string | null };
export function hasWebsiteEntitlement(addon: WebsiteAccess | null | undefined, now = new Date()) {
  if (!addon || !["ACTIVE", "TRIALING"].includes(addon.status)) return false;
  if (!addon.validUntil) return false;
  const dates = [addon.validUntil, ...(addon.cancelAt ? [addon.cancelAt] : [])].map(value => new Date(value).getTime());
  return dates.every(until => Number.isFinite(until) && until > now.getTime());
}
export function websiteIsVisible(site: { status: string; publishedConfig: unknown } | null, addon: WebsiteAccess | null | undefined, subscription: OperationalSubscription | null | undefined, deletedAt?: Date | null, now = new Date()) {
  return !deletedAt && !!site && site.status === "PUBLISHED" && !!site.publishedConfig && hasWebsiteEntitlement(addon, now) && hasOperationalSubscriptionAccess(subscription, now);
}
const reserved = new Set(["www", "api", "app", "admin", "dashboard", "mail", "support", "status", "puragenda", "localhost"]);
export function validSubdomain(slug: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) && !reserved.has(slug);
}
export function normalizeHostname(value: string) {
  const raw = value.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  if (raw.length > 253 || !/^[a-z0-9.-]+$/.test(raw) || raw.split(".").some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new Error("Hostname inválido");
  return raw;
}
export function websiteSubdomain(hostname: string, root = "puragenda.cl") {
  const host = normalizeHostname(hostname), base = normalizeHostname(root);
  if (!host.endsWith(`.${base}`)) return null;
  const subdomain = host.slice(0, -(base.length + 1));
  return validSubdomain(subdomain) ? subdomain : null;
}
