import { Resend } from "resend";
import { assertCertificationHeadroom } from "./resend-certification";
import type { Prisma, CfMessage } from "@prisma/client";
import {
  assertContactLab,
  simulationSchema,
  signature,
} from "./policy";
import { contactResendConfiguration } from "./resend-test";
import { contactFlowProductionRequested } from "./release-switch";

export type DeliveryPayload = {
  to: string;
  from: string;
  subject: string;
  text: string;
  unsubscribeUrl: string;
  bookingUrl: string;
  senderName?: string;
  replyTo?: string;
};
export type DeliveryResult = {
  outcome: "ACCEPTED" | "TEMPORARY" | "PERMANENT" | "UNKNOWN";
  providerId?: string;
  code?: string;
  retryAfterMs?: number;
  idempotent: boolean;
};
export interface ContactProvider {
  readonly name: string;
  readonly idempotencyWindowMs: number;
  send(
    tx: Prisma.TransactionClient,
    message: CfMessage,
    payload: DeliveryPayload,
    attempt: number,
    signal: AbortSignal,
  ): Promise<DeliveryResult>;
}
export function providerFailure(
  status: number | null,
  retryAfter: string | null,
  now = Date.now(),
): DeliveryResult {
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  const retryAfterMs = Number.isFinite(seconds)
    ? Math.max(0, seconds * 1000)
    : retryAfter
      ? Math.max(0, Date.parse(retryAfter) - now)
      : 0;
  return {
    outcome:
      status === 429 || (status !== null && status >= 500)
        ? "TEMPORARY"
        : status !== null && status >= 400 && status < 500
          ? "PERMANENT"
          : "UNKNOWN",
    code:
      status === 429
        ? "RATE_LIMIT"
        : status
          ? `PROVIDER_${status}`
          : "RESULT_UNKNOWN",
    idempotent: true,
    retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : 0,
  };
}
export async function withProviderDeadline<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) throw new Error("PROVIDER_TIMEOUT");
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error("PROVIDER_TIMEOUT"));
    signal.addEventListener("abort", abort, { once: true });
    operation()
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}
export class SimulatedContactProvider implements ContactProvider {
  readonly name = "SIMULATED";
  readonly idempotencyWindowMs = 23 * 3600000;
  async send(
    tx: Prisma.TransactionClient,
    m: CfMessage,
    _payload: DeliveryPayload,
    attempt: number,
    signal: AbortSignal,
  ): Promise<DeliveryResult> {
    assertContactLab();
    if (signal.aborted)
      return { outcome: "UNKNOWN", code: "TIMEOUT", idempotent: true };
    const scenario = simulationSchema.parse(m.simulation);
    const receipt = await tx.cfSimulatedReceipt.findUnique({
      where: { idempotencyKey: m.idempotencyKey },
    });
    if (receipt)
      return {
        outcome: "ACCEPTED",
        providerId: receipt.providerId,
        idempotent: true,
      };
    if (scenario === "REJECT")
      return { outcome: "PERMANENT", code: "REJECTED", idempotent: true };
    if (scenario === "NO_IDEMPOTENCY_TIMEOUT")
      return { outcome: "UNKNOWN", code: "TIMEOUT", idempotent: false };
    if (scenario === "TIMEOUT_UNKNOWN")
      return { outcome: "UNKNOWN", code: "TIMEOUT", idempotent: true };
    if (scenario === "RATE_LIMIT" && attempt < 3)
      return {
        outcome: "TEMPORARY",
        code: "RATE_LIMIT",
        retryAfterMs: 60000,
        idempotent: true,
      };
    if (scenario === "TEMPORARY" && attempt < 3)
      return { outcome: "TEMPORARY", code: "PROVIDER_503", idempotent: true };
    const r = await tx.cfSimulatedReceipt.create({
      data: {
        businessId: m.businessId,
        messageId: m.id,
        idempotencyKey: m.idempotencyKey,
        providerId: `sim_${m.id}`,
      },
    });
    if (scenario === "TIMEOUT_ACCEPTED" && attempt === 1)
      return { outcome: "UNKNOWN", code: "RESPONSE_LOST", idempotent: true };
    return { outcome: "ACCEPTED", providerId: r.providerId, idempotent: true };
  }
}
export function resendRequest(payload: DeliveryPayload, key: string) {
  return {
    body: {
      from: payload.senderName ? `${payload.senderName.replace(/[<>\r\n"]/g, "")} <${payload.from}>` : payload.from,
      to: payload.to,
      subject: payload.subject,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      text: `${payload.text}\nReservar: ${payload.bookingUrl}\nBaja: ${payload.unsubscribeUrl}`,
      headers: {
        "List-Unsubscribe": `<${payload.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
    options: { idempotencyKey: key },
  };
}
// Production requires a bound release approval and existing quota reservations.
// Constructing this adapter does not read credentials or create network clients.
export class ResendContactProvider implements ContactProvider {
  readonly name = "RESEND";
  readonly idempotencyWindowMs = 23 * 3600000;
  async send(
    _tx: Prisma.TransactionClient,
    m: CfMessage,
    payload: DeliveryPayload,
    _attempt: number,
    signal: AbortSignal,
  ): Promise<DeliveryResult> {
    if (!contactFlowProductionRequested() && process.env.CONTACT_FLOW_RESEND_TEST_ENABLED !== "1")
      throw new Error("CONTACT_FLOW_EXTERNAL_DELIVERY_BLOCKED");
    const config = contactResendConfiguration(m.businessId);
    if (config.certification && !config.certification.messageIds.includes(m.id))
      throw new Error("CONTROLLED_MESSAGE_REQUIRED");
    if (m.provider !== "RESEND" || config.recipients !== null && !config.recipients.includes(payload.to.toLowerCase()) || payload.from !== config.sender)
      throw new Error("CONTROLLED_RECIPIENT_REQUIRED");
    for (const link of [payload.unsubscribeUrl, payload.bookingUrl])
      if (new URL(link).origin !== config.origin) throw new Error("CONTROLLED_HTTPS_ORIGIN_REQUIRED");
    if (signal.aborted)
      return { outcome: "UNKNOWN", code: "TIMEOUT", idempotent: true };
    const client = new Resend(config.key);
    const reader = new Resend(config.readKey);
    if (config.certification) {
      const usage = await withProviderDeadline(() => reader.get("/usage"), signal);
      assertCertificationHeadroom(usage.data);
    }
    const domain = await withProviderDeadline(() => reader.domains.get(config.domainId), signal);
    if (!domain.data || domain.data.status !== "verified" || payload.from.split("@")[1] !== domain.data.name)
      throw new Error("COMMERCIAL_SENDER_DOMAIN_UNVERIFIED");
    if (process.env.CONTACT_FLOW_DELIVERY_MODE === "production") {
      const reserved = await _tx.cfQuotaReservation.findUnique({ where: { messageId: m.id } });
      if (reserved?.state !== "RESERVED") throw new Error("CONTACT_QUOTA_RESERVATION_REQUIRED");
    }
    const request = resendRequest({ ...payload, ...("replyTo" in config ? { replyTo: config.replyTo } : {}) }, m.idempotencyKey);
    const result = await withProviderDeadline(
      () => client.emails.send({ ...request.body, tags: [
        { name: "cf_message", value: m.id }, { name: "cf_proof", value: signature(`resend:${m.id}`) },
      ] }, request.options),
      signal,
    ).catch(() => null);
    // The SDK operation may still be accepted after our deadline. UNKNOWN is
    // reconciled or retried with the same key inside the provider's 24h window.
    if (!result)
      return { outcome: "UNKNOWN", code: "PROVIDER_TIMEOUT", idempotent: true };
    if (result.data)
      return {
        outcome: "ACCEPTED",
        providerId: result.data.id,
        idempotent: true,
      };
    return providerFailure(
      result.error?.statusCode ?? null,
      result.headers?.["retry-after"] ?? null,
    );
  }
}
