import { z } from "zod";
import { assertContactLab, syntheticAddress } from "./policy";

// Controlled certification only. Production remains sealed by assertContactLab.
// A separate credential/subdomain prevents accidental transactional quota reuse.
export function resendTestConfiguration() {
  assertContactLab();
  if (process.env.CONTACT_FLOW_RESEND_TEST_ENABLED !== "1") throw new Error("CONTACT_FLOW_EXTERNAL_DELIVERY_BLOCKED");
  if (process.env.CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT !== "1") throw new Error("COMMERCIAL_PROVIDER_ACCOUNT_SEPARATION_REQUIRED");
  const businessId = z.string().min(1).max(100).parse(process.env.CONTACT_FLOW_RESEND_TEST_BUSINESS_ID);
  const recipients = z.array(z.email().transform(s => s.toLowerCase())).min(1).max(5).parse(JSON.parse(process.env.CONTACT_FLOW_RESEND_TEST_RECIPIENTS ?? "[]"));
  const sender = z.email().parse(process.env.CONTACT_FLOW_RESEND_FROM);
  const domainId = z.string().min(1).parse(process.env.CONTACT_FLOW_RESEND_DOMAIN_ID);
  const key = process.env.CONTACT_FLOW_RESEND_API_KEY ?? "";
  if (!key.startsWith("re_") || !process.env.CONTACT_FLOW_RESEND_WEBHOOK_SECRET) throw new Error("COMMERCIAL_RESEND_CONFIGURATION_REQUIRED");
  const origin = new URL(process.env.CONTACT_FLOW_PUBLIC_ORIGIN ?? "");
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.origin !== process.env.CONTACT_FLOW_PUBLIC_ORIGIN) throw new Error("CONTROLLED_HTTPS_ORIGIN_REQUIRED");
  return { businessId, recipients, sender, domainId, key, origin: origin.origin };
}
export function contactAddressAllowed(businessId: string, email: string) {
  if (syntheticAddress(email)) return true;
  try { const c = resendTestConfiguration(); return c.businessId === businessId && c.recipients.includes(email.toLowerCase()); }
  catch { return false; }
}
export function contactSenderAllowed(businessId: string, email: string) {
  if (syntheticAddress(email)) return true;
  try { const c = resendTestConfiguration(); return c.businessId === businessId && c.sender === email; }
  catch { return false; }
}
export function contactProviderMode(businessId: string) {
  try { return resendTestConfiguration().businessId === businessId ? "CONTROLLED_RESEND_TEST" : "SIMULATED_ONLY"; }
  catch { return "SIMULATED_ONLY"; }
}
