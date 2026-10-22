import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import {
  assertContactLab,
  contactLock,
  digest,
  signature,
  signatureMatches,
} from "./policy";
import { suppress } from "./consent";
import { settleContactQuota } from "./quotas";

const eventSchema = z
  .object({
    id: z.string().min(1).max(150),
    providerId: z.string().min(1).max(150),
    kind: z.enum(["ACCEPTED", "DELIVERED", "BOUNCED", "COMPLAINED", "FAILED"]),
    occurredAt: z.iso.datetime(),
  })
  .strict();
export function simulatedEventSignature(raw: string, timestamp: string) {
  return signature(`webhook:${timestamp}:${raw}`);
}
export async function receiveSimulatedEvent(
  raw: string,
  timestamp: string,
  signed: string,
  now = new Date(),
) {
  assertContactLab();
  if (
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(+now - Number(timestamp) * 1000) > 300000 ||
    raw.length > 16384 ||
    !signatureMatches(`webhook:${timestamp}:${raw}`, signed)
  )
    throw new Error("INVALID_WEBHOOK_SIGNATURE");
  return applyProviderEvent(
    "SIMULATED",
    eventSchema.parse(JSON.parse(raw)),
    digest(raw),
    now,
  );
}
export async function receiveResendEvent(
  raw: string,
  headers: Headers,
  now = new Date(),
) {
  assertContactLab();
  const secret = process.env.CONTACT_FLOW_RESEND_WEBHOOK_SECRET;
  if (!secret || raw.length > 16384)
    throw new Error("INVALID_WEBHOOK_SIGNATURE");
  const event = new Resend("verification-only").webhooks.verify({
    payload: raw,
    headers: {
      id: headers.get("svix-id") ?? "",
      timestamp: headers.get("svix-timestamp") ?? "",
      signature: headers.get("svix-signature") ?? "",
    },
    webhookSecret: secret,
  });
  const kinds: Record<string, string> = {
    "email.sent": "ACCEPTED",
    "email.delivered": "DELIVERED",
    "email.bounced": "BOUNCED",
    "email.complained": "COMPLAINED",
    "email.failed": "FAILED",
  };
  if (!kinds[event.type]) return { ignored: true };
  const data = event.data as { email_id?: string };
  return applyProviderEvent(
    "RESEND",
    eventSchema.parse({
      id: headers.get("svix-id"),
      providerId: data.email_id,
      kind: kinds[event.type],
      occurredAt: event.created_at,
    }),
    digest(raw),
    now,
  );
}
async function applyProviderEvent(
  provider: string,
  input: z.infer<typeof eventSchema>,
  payloadHash: string,
  now: Date,
) {
  return prisma.$transaction(async (tx) => {
    await contactLock(tx);
    const key = `${provider}:${input.id}`,
      existing = await tx.cfProviderEvent.findUnique({ where: { id: key } });
    if (existing) {
      if (existing.payloadHash !== payloadHash)
        throw new Error("PROVIDER_EVENT_CONFLICT");
      return { duplicate: true };
    }
    const receipt =
      provider === "SIMULATED"
        ? await tx.cfSimulatedReceipt.findUnique({
            where: { providerId: input.providerId },
          })
        : null;
    const message = await tx.cfMessage.findFirst({
      where: {
        provider,
        ...(receipt
          ? { id: receipt.messageId }
          : { providerId: input.providerId }),
      },
      include: { enrollment: { include: { version: true } } },
    });
    if (!message) throw new Error("PROVIDER_EVENT_NOT_CORRELATED"); // retry safely; don't store untrusted PII payloads
    await tx.cfProviderEvent.create({
      data: {
        id: key,
        businessId: message.businessId,
        messageId: message.id,
        provider,
        providerId: input.providerId,
        kind: input.kind,
        payloadHash,
        occurredAt: new Date(input.occurredAt),
        receivedAt: now,
      },
    });
    const rank: Record<string, number> = {
      QUEUED: 0,
      UNKNOWN: 0,
      ACCEPTED: 1,
      DELIVERED: 2,
      FAILED: 3,
      BOUNCED: 4,
      COMPLAINED: 5,
    };
    if ((rank[input.kind] ?? 0) >= (rank[message.state] ?? 0)) {
      await tx.cfMessage.update({
        where: { id: message.id },
        data: {
          state: input.kind,
          providerId: input.providerId,
          acceptedAt: message.acceptedAt ?? new Date(input.occurredAt),
        },
      });
      await tx.cfOutbox.updateMany({
        where: { messageId: message.id },
        data: {
          state: "DONE",
          leaseUntil: null,
          lastError:
            input.kind === "BOUNCED" || input.kind === "COMPLAINED"
              ? input.kind
              : null,
        },
      });
      await settleContactQuota(tx, message.id, "CONSUMED", now);
    }
    if (input.kind === "BOUNCED" || input.kind === "COMPLAINED") {
      const e = message.enrollment;
      await suppress(
        tx,
        {
          businessId: message.businessId,
          clientId: e.clientId,
          addressHash: e.addressHash,
          reason: input.kind === "BOUNCED" ? "HARD_BOUNCE" : "SPAM",
          sourceRef: `provider:${key}`,
        },
        now,
      );
    }
    const campaignId = message.enrollment.version.campaignId;
    if (
      !(await tx.cfOutbox.count({
        where: {
          message: { enrollment: { version: { campaignId } } },
          state: { in: ["PENDING", "LEASED", "SENDING"] },
        },
      }))
    )
      await tx.cfCampaign.updateMany({
        where: { id: campaignId, status: { in: ["READY", "RUNNING"] } },
        data: { status: "COMPLETED" },
      });
    return { accepted: true, simulated: provider === "SIMULATED" };
  });
}
export async function reconcileSimulatedDeliveries(
  businessId: string,
  limit = 20,
  now = new Date(),
) {
  assertContactLab();
  const receipts = await prisma.cfSimulatedReceipt.findMany({
    where: {
      businessId,
      message: { state: { in: ["QUEUED", "ACCEPTED", "UNKNOWN"] } },
    },
    include: { message: true },
    orderBy: { createdAt: "asc" },
    take: Math.min(100, Math.max(1, limit)),
  });
  let reconciled = 0;
  for (const r of receipts) {
    const kind = r.message.simulation === "BOUNCE" ? "BOUNCED" : "DELIVERED";
    const raw = JSON.stringify({
      id: `reconcile:${r.providerId}:${kind}`,
      providerId: r.providerId,
      kind,
      occurredAt: r.createdAt.toISOString(),
    });
    const timestamp = String(Math.floor(+now / 1000));
    const result = await receiveSimulatedEvent(
      raw,
      timestamp,
      simulatedEventSignature(raw, timestamp),
      now,
    );
    if ("accepted" in result) reconciled++;
  }
  return { reconciled, simulated: true };
}
