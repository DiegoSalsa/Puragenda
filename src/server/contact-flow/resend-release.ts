import { createHash } from "node:crypto";
import { z } from "zod";
import { SITE_URL } from "@/lib/site";
import { commercialHash } from "@/server/services/commercial-internal";
import { commercialUsagePolicy } from "@/server/services/commercial-usage-policy";
import { contactFlowProductionRequested } from "./release-switch";

export const RESEND_CONTACT_EVENTS = ["email.sent", "email.delivered", "email.delivery_delayed", "email.bounced", "email.complained", "email.failed", "email.suppressed"] as const;
const approvalSchema = z.object({ version: z.literal(2), environment: z.literal("production"),
  audience: z.literal("eligible-plus"), capacityMode: z.enum(["shared_free", "shared_pro", "isolated"]),
  domainId: z.string().min(1), webhookId: z.string().min(1), sender: z.email(), replyTo: z.email(), origin: z.url(),
  credentialSha256: z.string().regex(/^[a-f0-9]{64}$/), readCredentialSha256: z.string().regex(/^[a-f0-9]{64}$/),
  webhookSecretSha256: z.string().regex(/^[a-f0-9]{64}$/), tokenSecretSha256: z.string().regex(/^[a-f0-9]{64}$/),
  policySha256: z.string().regex(/^[a-f0-9]{64}$/), capacityPolicySha256: z.string().regex(/^[a-f0-9]{64}$/),
  permanentEndpointsVerified: z.literal(true), replyToVerified: z.literal(true), replyRoutingVerified: z.literal(true), senderVerified: z.literal(true),
  approvedBy: z.string().min(1), approvalReference: z.string().min(1), approvedAt: z.iso.datetime(), expiresAt: z.iso.datetime().optional(),
}).strict();
export const credentialHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function resendCapacityPolicy() {
  return z.object({ dailyReserve: z.coerce.number().int().min(1).max(1000000), monthlyReserve: z.coerce.number().int().min(1).max(10000000),
    pollSeconds: z.coerce.number().int().min(5).max(300), maxAgeSeconds: z.coerce.number().int().min(15).max(300) }).refine(v => v.pollSeconds <= v.maxAgeSeconds).parse({
    dailyReserve: process.env.CONTACT_FLOW_TRANSACTIONAL_DAILY_RESERVE ?? 40,
    monthlyReserve: process.env.CONTACT_FLOW_TRANSACTIONAL_MONTHLY_RESERVE ?? 1000,
    pollSeconds: process.env.CONTACT_FLOW_RESEND_POLL_SECONDS ?? 30,
    maxAgeSeconds: process.env.CONTACT_FLOW_RESEND_MAX_AGE_SECONDS ?? 60,
  });
}
export function permanentContactOrigin() {
  const official = new URL(process.env.APP_URL ?? SITE_URL);
  const origin = new URL(process.env.CONTACT_FLOW_PUBLIC_ORIGIN ?? official.origin);
  if (official.origin !== new URL(SITE_URL).origin || origin.href !== origin.origin + "/" || origin.origin !== official.origin || origin.protocol !== "https:" || origin.username || origin.password)
    throw new Error("PERMANENT_CONTACT_ORIGIN_REQUIRED");
  return origin.origin;
}
/** Static configuration is readable while paused, so receipts can be reconciled. */
export function productionResendBaseConfiguration() {
  if (process.env.CONTACT_FLOW_DELIVERY_MODE !== "production" || process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV !== "production" || process.env.CONTACT_FLOW_RESEND_TEST_ENABLED === "1") throw new Error("COMMERCIAL_PROVIDER_ENVIRONMENT_MISMATCH");
  const key = process.env.CONTACT_FLOW_PRODUCTION_RESEND_API_KEY ?? "", readKey = process.env.CONTACT_FLOW_PRODUCTION_RESEND_READ_API_KEY ?? "";
  const excluded = [process.env.RESEND_API_KEY, process.env.CONTACT_FLOW_RESEND_API_KEY, process.env.CONTACT_FLOW_RESEND_READ_API_KEY].filter(Boolean);
  if (!key.startsWith("re_") || !readKey.startsWith("re_") || key === readKey || excluded.includes(key) || excluded.includes(readKey)) throw new Error("COMMERCIAL_PROVIDER_CREDENTIAL_SEPARATION_REQUIRED");
  const sender = z.email().parse(process.env.CONTACT_FLOW_PRODUCTION_FROM), replyTo = z.email().parse(process.env.CONTACT_FLOW_PRODUCTION_REPLY_TO);
  const domainId = z.string().min(1).parse(process.env.CONTACT_FLOW_PRODUCTION_DOMAIN_ID), webhookId = z.string().min(1).parse(process.env.CONTACT_FLOW_PRODUCTION_WEBHOOK_ID);
  const secret = process.env.CONTACT_FLOW_PRODUCTION_RESEND_WEBHOOK_SECRET ?? "", tokenSecret = process.env.CONTACT_FLOW_TOKEN_SECRET ?? "";
  if (!secret.startsWith("whsec_") || tokenSecret.length < 32 || sender.split("@")[1] !== "contacto.puragenda.cl" || /@(example\.invalid|resend\.dev)$/.test(replyTo)) throw new Error("COMMERCIAL_RESEND_CONFIGURATION_REQUIRED");
  const capacityMode = z.enum(["shared_free", "shared_pro", "isolated"]).parse(process.env.CONTACT_FLOW_PROVIDER_CAPACITY_MODE);
  const origin = permanentContactOrigin(), policy = commercialUsagePolicy(), capacityPolicy = resendCapacityPolicy();
  if (!policy?.global.contactFlow || !policy.trial.PURAGENDA_PLUS?.contactFlow || !policy.paid.PURAGENDA_PLUS?.contactFlow || policy.global.contactFlow.monthlyLimit < 1 || policy.global.contactFlow.dailyLimit < 1 || policy.global.contactFlow.senderEmail !== sender)
    throw new Error("COMMERCIAL_USAGE_LIMITS_UNDEFINED");
  return { key, readKey, sender, replyTo, domainId, webhookId, secret, tokenSecret, origin, capacityMode, policy, capacityPolicy,
    businessIds: null, recipients: null, certification: undefined };
}
export function contactReleaseApprovalBindings(config: ReturnType<typeof productionResendBaseConfiguration>) {
  return { version: 2 as const, environment: "production" as const, audience: "eligible-plus" as const, capacityMode: config.capacityMode,
    domainId: config.domainId, webhookId: config.webhookId, sender: config.sender, replyTo: config.replyTo, origin: config.origin,
    credentialSha256: credentialHash(config.key), readCredentialSha256: credentialHash(config.readKey), webhookSecretSha256: credentialHash(config.secret), tokenSecretSha256: credentialHash(config.tokenSecret),
    policySha256: commercialHash(config.policy), capacityPolicySha256: commercialHash(config.capacityPolicy) };
}
export function productionResendConfiguration(businessId?: string, enforceRelease = true, now = new Date()) {
  const config = productionResendBaseConfiguration();
  const approval = approvalSchema.parse(JSON.parse(process.env.CONTACT_FLOW_PRODUCTION_APPROVAL_JSON ?? "null"));
  const bindings = contactReleaseApprovalBindings(config);
  if (Object.entries(bindings).some(([k,v]) => approval[k as keyof typeof approval] !== v) || Date.parse(approval.approvedAt) > +now || approval.expiresAt && Date.parse(approval.expiresAt) <= +now)
    throw new Error("COMMERCIAL_RELEASE_APPROVAL_MISMATCH");
  if (enforceRelease && (!contactFlowProductionRequested() || process.env.COMMERCIAL_WORKER_ENABLED !== "1" || process.env.COMMERCIAL_WORKER_KILLED === "1" || (process.env.COMMERCIAL_WORKER_SECRET ?? "").length < 32 || process.env.PURAGENDA_NEXT_ENABLED !== "1" || config.policy.global.contactFlow?.killed || !config.policy.global.contactFlow?.emailEnabled))
    throw new Error("CONTACT_FLOW_EXTERNAL_DELIVERY_BLOCKED");
  return { ...config, businessId };
}
export function resendReleaseReadiness() {
  let configurationValid = false, deliveryEnabled = false, code = "COMMERCIAL_RESEND_CONFIGURATION_REQUIRED";
  try { productionResendConfiguration(undefined, false); configurationValid = true; productionResendConfiguration(); deliveryEnabled = true; code = "CONFIGURATION_VALID"; }
  catch (error) { if (error instanceof Error && /^[A-Z_]+$/.test(error.message)) code = error.message; }
  return { activationRequested: contactFlowProductionRequested(), configurationValid, code, deliveryEnabled };
}
