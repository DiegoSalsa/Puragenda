import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { assertContactLab, contactLock } from "./policy";

export const retentionPolicy = z
  .object({
    campaignDays: z.number().int().min(90),
    outboxDays: z.number().int().min(30),
    deliveryDays: z.number().int().min(90),
    providerEventDays: z.number().int().min(30),
    evidenceDays: z.number().int().min(90),
    auditDays: z.number().int().min(365),
    consentDays: z.number().int().min(3650),
    attributionDays: z.number().int().min(3650),
    legalHold: z.literal(true),
  })
  .strict();
export type ContactRetention = z.infer<typeof retentionPolicy>;
// Consent/revocation and accounting attribution are explicitly on legal hold.
// Unknown deliveries and live jobs are never purged. No arbitrary raw payloads
// or email addresses exist in these tables to redact during routine cleanup.
export async function purgeContactFlow(
  input: ContactRetention,
  limit = 50,
  now = new Date(),
) {
  assertContactLab();
  const p = retentionPolicy.parse(input),
    bound = Math.min(100, Math.max(1, limit));
  return prisma.$transaction(async (tx) => {
    await contactLock(tx);
    const before = (days: number) => new Date(+now - days * 86400000);
    const events = await tx.cfProviderEvent.findMany({
      where: {
        receivedAt: { lt: before(p.providerEventDays) },
        message: { state: { notIn: ["QUEUED", "UNKNOWN"] } },
      },
      select: { id: true },
      take: bound,
      orderBy: { receivedAt: "asc" },
    });
    const deletedEvents = await tx.cfProviderEvent.deleteMany({
      where: { id: { in: events.map((e) => e.id) } },
    });
    const attempts = await tx.cfAttempt.findMany({
      where: {
        createdAt: { lt: before(p.deliveryDays) },
        message: { state: { notIn: ["QUEUED", "UNKNOWN"] } },
      },
      select: { id: true },
      take: bound,
      orderBy: { createdAt: "asc" },
    });
    const deletedAttempts = await tx.cfAttempt.deleteMany({
      where: { id: { in: attempts.map((e) => e.id) } },
    });
    const outbox = await tx.cfOutbox.findMany({
      where: {
        state: "DONE",
        message: {
          createdAt: { lt: before(p.outboxDays) },
          state: { not: "UNKNOWN" },
        },
      },
      select: { id: true },
      take: bound,
      orderBy: { id: "asc" },
    });
    const deletedOutbox = await tx.cfOutbox.deleteMany({
      where: { id: { in: outbox.map((e) => e.id) } },
    });
    const campaigns = await tx.cfCampaign.findMany({
      where: {
        status: { in: ["COMPLETED", "CANCELLED"] },
        createdAt: {
          lt: before(
            Math.max(
              p.campaignDays,
              p.evidenceDays,
              p.auditDays,
              p.consentDays,
            ),
          ),
        },
        versions: {
          every: {
            expiresAt: { lt: before(p.consentDays) },
            enrollments: {
              every: {
                attribution: null,
                message: { is: { state: { notIn: ["QUEUED", "UNKNOWN"] } } },
              },
            },
          },
        },
      },
      select: { id: true },
      take: bound,
      orderBy: { createdAt: "asc" },
    });
    const deletedCampaigns = await tx.cfCampaign.deleteMany({
      where: { id: { in: campaigns.map((e) => e.id) } },
    });
    return {
      events: deletedEvents.count,
      attempts: deletedAttempts.count,
      outbox: deletedOutbox.count,
      campaigns: deletedCampaigns.count,
      consents: 0,
      suppressions: 0,
      attribution: 0,
      legalHold: true,
    };
  });
}
