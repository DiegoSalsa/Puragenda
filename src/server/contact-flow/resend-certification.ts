import { createHash } from "node:crypto";
import { z } from "zod";
import { commercialHash } from "@/server/services/commercial-internal";
import { commercialUsagePolicy } from "@/server/services/commercial-usage-policy";

const certificateSchema = z.object({
  version: z.literal(1), environment: z.literal("controlled-test"),
  businessId: z.string().min(1), domainId: z.string().min(1), sender: z.email(), origin: z.url(),
  recipients: z.array(z.email()).min(1).max(3), messageIds: z.array(z.string().min(1)).max(3),
  credentialSha256: z.string().regex(/^[a-f0-9]{64}$/), databaseSha256: z.string().regex(/^[a-f0-9]{64}$/),
  policySha256: z.string().regex(/^[a-f0-9]{64}$/), approvedBy: z.string().min(1), approvalReference: z.string().min(1),
  issuedAt: z.iso.datetime(), expiresAt: z.iso.datetime(),
}).strict();
type Configuration = { businessId: string; domainId: string; sender: string; origin: string; key: string; readKey: string; recipients: string[] };
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** Three explicitly named messages only; never a substitute for production isolation. */
export function sharedTeamCertificate(config: Configuration, now = new Date()) {
  const c = certificateSchema.parse(JSON.parse(process.env.CONTACT_FLOW_RESEND_CERTIFICATION_JSON ?? "null"));
  const policy = commercialUsagePolicy(), quota = policy?.global.contactFlow;
  const canonicalRecipients = (values: string[]) => [...new Set(values.map(v => v.toLowerCase()))].sort().join("\n");
  if (c.businessId !== config.businessId || c.domainId !== config.domainId || c.sender !== config.sender || c.origin !== config.origin ||
      canonicalRecipients(c.recipients) !== canonicalRecipients(config.recipients) || c.credentialSha256 !== sha256(config.key) ||
      c.databaseSha256 !== sha256(new URL(process.env.DATABASE_URL ?? "").href) || c.policySha256 !== commercialHash(policy) ||
      Date.parse(c.issuedAt) > +now || Date.parse(c.expiresAt) <= +now || Date.parse(c.expiresAt) - Date.parse(c.issuedAt) > 2 * 3600000 ||
      new Set(c.messageIds).size !== c.messageIds.length || config.key === config.readKey || config.key === process.env.RESEND_API_KEY ||
      !config.readKey.startsWith("re_") || !config.sender.endsWith("@contacto.puragenda.cl") ||
      !quota || quota.dailyLimit < 1 || quota.dailyLimit > 3 || quota.monthlyLimit < 1 || quota.monthlyLimit > 3 ||
      quota.senderEmail !== config.sender || !quota.emailEnabled || quota.killed)
    throw new Error("CONTROLLED_CERTIFICATION_MISMATCH");
  return c;
}

/** Keep at least 20 daily and 100 monthly provider slots for transactional mail. */
export function assertCertificationHeadroom(usage: unknown) {
  const counter = z.object({ used: z.number().int().nonnegative(), limit: z.number().int().positive() });
  const u = z.object({ emails: z.object({ daily: counter, monthly: counter }) }).safeParse(usage);
  if (!u.success || u.data.emails.daily.limit - u.data.emails.daily.used < 21 || u.data.emails.monthly.limit - u.data.emails.monthly.used < 101)
    throw new Error("TRANSACTIONAL_CAPACITY_RESERVED");
}
