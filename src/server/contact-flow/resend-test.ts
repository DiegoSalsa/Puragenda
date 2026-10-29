import { z } from "zod";
import { assertContactLab, syntheticAddress } from "./policy";
import { productionResendConfiguration } from "./resend-release";
import { assertCommercialSandbox } from "@/server/services/commercial-internal";
import { sharedTeamCertificate } from "./resend-certification";

// Controlled certification only; production uses its separate release settings.
export function resendTestConfiguration() {
  assertContactLab();
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview" || process.env.CONTACT_FLOW_DELIVERY_MODE === "production") throw new Error("CONTROLLED_TEST_ENVIRONMENT_REQUIRED");
  assertCommercialSandbox();
  if (process.env.CONTACT_FLOW_RESEND_TEST_ENABLED !== "1") throw new Error("CONTACT_FLOW_EXTERNAL_DELIVERY_BLOCKED");
  const businessId = z.string().min(1).max(100).parse(process.env.CONTACT_FLOW_RESEND_TEST_BUSINESS_ID);
  const recipients = z.array(z.email().transform(s => s.toLowerCase())).min(1).max(5).parse(JSON.parse(process.env.CONTACT_FLOW_RESEND_TEST_RECIPIENTS ?? "[]"));
  const sender = z.email().parse(process.env.CONTACT_FLOW_RESEND_FROM);
  const domainId = z.string().min(1).parse(process.env.CONTACT_FLOW_RESEND_DOMAIN_ID);
  const key = process.env.CONTACT_FLOW_RESEND_API_KEY ?? "";
  if (!key.startsWith("re_") || !process.env.CONTACT_FLOW_RESEND_WEBHOOK_SECRET) throw new Error("COMMERCIAL_RESEND_CONFIGURATION_REQUIRED");
  const origin = new URL(process.env.CONTACT_FLOW_PUBLIC_ORIGIN ?? "");
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.origin !== process.env.CONTACT_FLOW_PUBLIC_ORIGIN) throw new Error("CONTROLLED_HTTPS_ORIGIN_REQUIRED");
  const readKey = process.env.CONTACT_FLOW_RESEND_READ_API_KEY ?? key;
  const config = { businessId, businessIds: [businessId], recipients, sender, domainId, key, readKey, secret: process.env.CONTACT_FLOW_RESEND_WEBHOOK_SECRET!, origin: origin.origin };
  if (process.env.CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT !== "1" && !process.env.CONTACT_FLOW_RESEND_CERTIFICATION_JSON) throw new Error("COMMERCIAL_PROVIDER_ACCOUNT_SEPARATION_REQUIRED");
  const certification = process.env.CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT === "1" ? undefined : sharedTeamCertificate(config);
  return { ...config, certification };
}
export function contactResendConfiguration(businessId?: string, forReceipts = false) {
  if (process.env.CONTACT_FLOW_DELIVERY_MODE === "production") {
    return productionResendConfiguration(businessId, !forReceipts);
  }
  const config = resendTestConfiguration();
  if (businessId && config.businessId !== businessId) throw new Error("CONTROLLED_RECIPIENT_REQUIRED");
  return config;
}
/** Incoming receipts remain verifiable after outbound delivery is killed. */
export function contactResendWebhookSecret() {
  const productionRuntime = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview";
  if (process.env.CONTACT_FLOW_DELIVERY_MODE === "production" && !productionRuntime) throw new Error("COMMERCIAL_PROVIDER_ENVIRONMENT_MISMATCH");
  const production = productionRuntime;
  if (!production) assertCommercialSandbox();
  const secret = process.env[production ? "CONTACT_FLOW_PRODUCTION_RESEND_WEBHOOK_SECRET" : "CONTACT_FLOW_RESEND_WEBHOOK_SECRET"];
  if (!secret) throw new Error("INVALID_WEBHOOK_SIGNATURE");
  return secret;
}
export function contactReceiptsEnabled() {
  try { return !!contactResendWebhookSecret() && (process.env.CONTACT_FLOW_TOKEN_SECRET ?? "").length >= 32; }
  catch { return false; }
}
export function contactResendWebhookSecrets() {
  const current = contactResendWebhookSecret();
  const previous = isProductionContactRuntime() ? process.env.CONTACT_FLOW_PRODUCTION_PREVIOUS_WEBHOOK_SECRET : undefined;
  return [...new Set([current, ...(previous?.startsWith("whsec_") ? [previous] : [])])];
}
export function contactOptOutEnabled() {
  return isProductionContactRuntime() ? (process.env.CONTACT_FLOW_TOKEN_SECRET ?? "").length >= 32 : (() => { try { assertContactLab(); return true; } catch { return false; } })();
}
export function contactAddressAllowed(businessId: string, email: string) {
  if (syntheticAddress(email)) return true;
  try { const c = contactResendConfiguration(businessId, isProductionContactRuntime()); return c.recipients === null || c.recipients.includes(email.toLowerCase()); }
  catch { return false; }
}
export function contactSenderAllowed(businessId: string, email: string) {
  if (syntheticAddress(email)) return true;
  try { const c = contactResendConfiguration(businessId, isProductionContactRuntime()); return c.sender === email; }
  catch { return false; }
}
export function contactProviderMode(businessId: string) {
  if (isProductionContactRuntime()) return "PRODUCTION_RESEND";
  try { contactResendConfiguration(businessId); return process.env.CONTACT_FLOW_DELIVERY_MODE === "production" ? "PRODUCTION_RESEND" : "CONTROLLED_RESEND_TEST"; }
  catch { return "SIMULATED_ONLY"; }
}
export function isProductionContactRuntime() {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview";
}
