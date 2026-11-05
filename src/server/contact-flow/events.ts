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
import { contactResendConfiguration, contactResendWebhookSecrets, isProductionContactRuntime } from "./resend-test";
import { withProviderDeadline } from "./providers";
import { suppress } from "./consent";
import { settleContactQuota } from "./quotas";

const eventSchema = z
  .object({
    id: z.string().min(1).max(150),
    providerId: z.string().min(1).max(150),
    kind: z.enum(["ACCEPTED", "DELAYED", "DELIVERED", "BOUNCED", "COMPLAINED", "FAILED"]),
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
  const secrets = contactResendWebhookSecrets();
  if (raw.length > 16384)
    throw new Error("INVALID_WEBHOOK_SIGNATURE");
  let event: ReturnType<Resend["webhooks"]["verify"]> | undefined;
  for (const secret of secrets) {
    try { event = new Resend("verification-only").webhooks.verify({
    payload: raw,
    headers: {
      id: headers.get("svix-id") ?? "",
      timestamp: headers.get("svix-timestamp") ?? "",
      signature: headers.get("svix-signature") ?? "",
    },
    webhookSecret: secret,
    }); break; } catch { /* Try the single previous key during an explicit rotation. */ }
  }
  if (!event) throw new Error("INVALID_WEBHOOK_SIGNATURE");
  const kinds: Record<string, string> = {
    "email.sent": "ACCEPTED",
    "email.delivered": "DELIVERED",
    "email.delivery_delayed": "DELAYED",
    "email.bounced": "BOUNCED",
    "email.complained": "COMPLAINED",
    "email.failed": "FAILED",
    "email.suppressed": "FAILED",
  };
  if (!kinds[event.type]) return { ignored: true };
  const data = event.data as { email_id?: string; from?: string; tags?: Record<string, string> };
  // A shared-team lab webhook also receives transactional events. Authenticate
  // first, then discard other senders without querying or retaining their data.
  if (data.from) {
    const sender = (data.from.match(/<([^<>]+)>\s*$/)?.[1] ?? data.from).trim().toLowerCase();
    const configuredSender = isProductionContactRuntime() ? process.env.CONTACT_FLOW_PRODUCTION_FROM : process.env.CONTACT_FLOW_RESEND_CERTIFICATION_JSON ? process.env.CONTACT_FLOW_RESEND_FROM : undefined;
    if (configuredSender && sender !== configuredSender.toLowerCase()) return { ignored: true };
  }
  const messageRef = data.tags?.cf_message;
  const correlatedId = messageRef && signatureMatches(`resend:${messageRef}`, data.tags?.cf_proof ?? "") ? messageRef : undefined;
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
    correlatedId,
    event.type === "email.suppressed" ? "ADMIN_BLOCK" : undefined,
  );
}
async function applyProviderEvent(
  provider: string,
  input: z.infer<typeof eventSchema>,
  payloadHash: string,
  now: Date,
  correlatedMessageId?: string,
  suppressionReason?: string,
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
          : correlatedMessageId ? { id: correlatedMessageId } : { providerId: input.providerId }),
      },
      include: { enrollment: { include: { version: true } } },
    });
    if (!message) throw new Error("PROVIDER_EVENT_NOT_CORRELATED"); // retry safely; don't store untrusted PII payloads
    if (message.providerId && message.providerId !== input.providerId) throw new Error("PROVIDER_MESSAGE_CONFLICT");
    await tx.cfProviderEvent.create({
      data: {
        id: key,
        businessId: message.businessId,
        messageId: message.id,
        provider,
        providerId: input.providerId,
        kind: input.kind === "DELAYED" ? "ACCEPTED" : input.kind,
        payloadHash,
        occurredAt: new Date(input.occurredAt),
        receivedAt: now,
      },
    });
    if (input.kind === "DELAYED") await tx.cfAudit.create({ data: {
      key: `provider-delay:${key}`, businessId: message.businessId,
      campaignId: message.enrollment.version.campaignId, event: "RESEND_DELIVERY_DELAYED",
      details: { messageId: message.id, providerEventId: key },
    } });
    const rank: Record<string, number> = {
      QUEUED: 0,
      UNKNOWN: 0,
      ACCEPTED: 1,
      DELIVERED: 2,
      FAILED: 3,
      BOUNCED: 4,
      COMPLAINED: 5,
    };
    // A provider delay confirms acceptance; it must never trigger another send
    // or downgrade a delivery, bounce, complaint or persistent suppression.
    const state = input.kind === "DELAYED" ? "ACCEPTED" : input.kind;
    if ((rank[state] ?? 0) >= (rank[message.state] ?? 0)) {
      await tx.cfMessage.update({
        where: { id: message.id },
        data: {
          state,
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
    if (input.kind === "BOUNCED" || input.kind === "COMPLAINED" || suppressionReason) {
      const e = message.enrollment;
      await suppress(
        tx,
        {
          businessId: message.businessId,
          clientId: e.clientId,
          addressHash: e.addressHash,
          reason: suppressionReason ?? (input.kind === "BOUNCED" ? "HARD_BOUNCE" : "SPAM"),
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

export async function reconcileResendDeliveries(limit = 5, businessId?: string) {
  const config = contactResendConfiguration(businessId, true);
  const client = new Resend(config.readKey);
  const messages = await prisma.cfMessage.findMany({ where: {
    ...(businessId ? { businessId } : config.businessIds ? { businessId: { in: config.businessIds } } : {}), provider: "RESEND", providerId: { not: null }, state: { in: ["ACCEPTED", "UNKNOWN"] },
  }, orderBy: { createdAt: "asc" }, take: Math.max(1, Math.min(5, limit)) });
  const kinds: Record<string, "ACCEPTED" | "DELAYED" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED"> = { sent: "ACCEPTED", delivery_delayed: "DELAYED", delivered: "DELIVERED", bounced: "BOUNCED", complained: "COMPLAINED", failed: "FAILED", suppressed: "FAILED" };
  let reconciled = 0;
  for (const m of messages) {
    const result = await withProviderDeadline(() => client.emails.get(m.providerId!), AbortSignal.timeout(3000));
    if (!result.data || !kinds[result.data.last_event]) continue;
    const tags = Object.fromEntries((result.data.tags ?? []).map(t => [t.name, t.value]));
    if (tags.cf_message !== m.id || !signatureMatches(`resend:${m.id}`, tags.cf_proof ?? "")) throw new Error("PROVIDER_MESSAGE_CONFLICT");
    const input = { id: `reconcile:${m.providerId}:${result.data.last_event}`, providerId: m.providerId!, kind: kinds[result.data.last_event], occurredAt: result.data.created_at };
    const r = await applyProviderEvent("RESEND", input, digest(JSON.stringify(input)), new Date(), m.id, result.data.last_event === "suppressed" ? "ADMIN_BLOCK" : undefined);
    if ("accepted" in r) reconciled++;
  }
  return { reconciled, simulated: false };
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
