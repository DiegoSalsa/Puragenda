import { z } from "zod";
import type { Prisma, CfConsent } from "@prisma/client";
import { commercialHash } from "@/server/services/commercial-internal";
import { prisma } from "@/server/db/prisma";
import { type GrowthScope } from "@/server/puri/growth/access";
import {
  addressHash,
  contactLock,
  requireContactScope,
  syntheticAddress,
  signature,
  signatureMatches,
} from "./policy";

const consentInput = z
  .object({
    clientId: z.string().min(1).max(100),
    source: z.literal("SYNTHETIC_FORM"),
    textVersion: z.literal("cf-commercial-email-v1"),
    accepted: z.literal(true),
    evidenceRef: z.string().regex(/^synthetic:[a-zA-Z0-9:_-]{1,150}$/),
    evidenceHash: z.string().regex(/^[a-f0-9]{64}$/),
    grantedAt: z.iso.datetime(),
  })
  .strict();
export const COMMERCIAL_CONSENT_TEXT =
  "Acepto recibir comunicaciones comerciales por correo de este negocio. Puedo retirar mi consentimiento mediante el enlace de baja. Esta autorización es independiente de las notificaciones necesarias de mis reservas.";
function receiptHash(
  c: Pick<
    CfConsent,
    | "businessId"
    | "clientId"
    | "addressHash"
    | "source"
    | "textVersion"
    | "acceptedText"
    | "evidenceRef"
    | "evidenceHash"
    | "grantedAt"
    | "recordedById"
  >,
) {
  return commercialHash({
    businessId: c.businessId,
    clientId: c.clientId,
    addressHash: c.addressHash,
    source: c.source,
    textVersion: c.textVersion,
    acceptedText: c.acceptedText,
    evidenceRef: c.evidenceRef,
    evidenceHash: c.evidenceHash,
    grantedAt: c.grantedAt,
    recordedById: c.recordedById,
    purpose: "COMMERCIAL",
    channel: "EMAIL",
    accepted: true,
  });
}
export function verifyConsentReceipt(c: CfConsent) {
  return (
    c.textVersion === "cf-commercial-email-v1" &&
    c.acceptedText === COMMERCIAL_CONSENT_TEXT &&
    signatureMatches(`consent:${receiptHash(c)}`, c.evidenceSignature)
  );
}
// No historical backfill from acceptsMarketing. Lab evidence must explicitly
// attest a synthetic form acceptance; a future collector needs its own review.
export async function recordConsent(scope: GrowthScope, input: unknown) {
  await requireContactScope(scope, true);
  const a = consentInput.parse(input);
  const client = await prisma.client.findFirstOrThrow({
    where: { id: a.clientId, businessId: scope.businessId },
  });
  if (
    !syntheticAddress(client.email) ||
    new Date(a.grantedAt) > new Date() ||
    Date.now() - Date.parse(a.grantedAt) > 300000
  )
    throw new Error("INVALID_CONSENT_EVIDENCE");
  return prisma.$transaction(async (tx) => {
    await contactLock(tx);
    const existing = await tx.cfConsent.findUnique({
      where: {
        businessId_evidenceRef: {
          businessId: scope.businessId,
          evidenceRef: a.evidenceRef,
        },
      },
    });
    const hash = addressHash(scope.businessId, client.email);
    if (existing) {
      if (
        existing.clientId !== a.clientId ||
        existing.addressHash !== hash ||
        existing.evidenceHash !== a.evidenceHash ||
        existing.textVersion !== a.textVersion
      )
        throw new Error("CONSENT_IDEMPOTENCY_CONFLICT");
      return existing;
    }
    const { accepted, ...fields } = a;
    const receipt = {
      ...fields,
      recordedById: scope.actorId,
      grantedAt: new Date(a.grantedAt),
      businessId: scope.businessId,
      addressHash: hash,
      acceptedText: COMMERCIAL_CONSENT_TEXT,
    };
    if (!accepted) throw new Error("EXPLICIT_CONSENT_REQUIRED");
    const consent = await tx.cfConsent.create({
      data: {
        ...receipt,
        evidenceSignature: signature(`consent:${receiptHash(receipt)}`),
      },
    });
    await tx.cfAudit.create({
      data: {
        businessId: scope.businessId,
        actorId: scope.actorId,
        event: "CONSENT_RECORDED",
        key: `consent:${consent.id}`,
        details: {
          consentId: consent.id,
          source: a.source,
          textVersion: a.textVersion,
          evidenceHash: a.evidenceHash,
        },
      },
    });
    return consent;
  });
}
export async function suppress(
  tx: Prisma.TransactionClient,
  a: {
    businessId: string;
    clientId: string;
    addressHash: string;
    reason: string;
    sourceRef: string;
    purpose?: string;
    channel?: string;
  },
  now = new Date(),
) {
  const { purpose = "COMMERCIAL", channel = "EMAIL", ...rest } = a;
  await tx.cfSuppression.upsert({
    where: {
      businessId_sourceRef: {
        businessId: a.businessId,
        sourceRef: a.sourceRef,
      },
    },
    create: { ...rest, purpose, channel, createdAt: now },
    update: {},
  });
  // A commercial opt-out never changes the operational reminder preference.
  await tx.cfConsent.updateMany({
    where: {
      businessId: a.businessId,
      clientId: a.clientId,
      purpose: "COMMERCIAL",
      channel: "EMAIL",
      state: "GRANTED",
    },
    data: { state: "REVOKED", revokedAt: now },
  });
}
export async function revokeConsent(
  scope: GrowthScope,
  clientId: string,
  reason = "WITHDRAWAL",
) {
  await requireContactScope(scope, true);
  const c = await prisma.client.findFirstOrThrow({
    where: { id: clientId, businessId: scope.businessId },
  });
  await prisma.$transaction(async (tx) => {
    await contactLock(tx);
    await suppress(tx, {
      businessId: scope.businessId,
      clientId: c.id,
      addressHash: addressHash(scope.businessId, c.email),
      reason,
      sourceRef: `admin:${c.id}:${reason}`,
    });
    await tx.cfAudit.upsert({
      where: { key: `revoked:${scope.businessId}:${c.id}:${reason}` },
      create: {
        businessId: scope.businessId,
        actorId: scope.actorId,
        event: "CONSENT_REVOKED",
        key: `revoked:${scope.businessId}:${c.id}:${reason}`,
        details: { reason },
      },
      update: {},
    });
  });
}
export async function consentEligibility(
  tx: Prisma.TransactionClient,
  businessId: string,
  clientId: string,
  hash: string,
  now = new Date(),
) {
  const suppression = await tx.cfSuppression.findFirst({
    where: {
      businessId,
      OR: [{ clientId }, { addressHash: hash }],
      channel: { in: ["EMAIL", "ALL"] },
      purpose: { in: ["COMMERCIAL", "ALL"] },
    },
  });
  if (suppression) return { reason: "SUPPRESSED", consentId: null };
  const consent = await tx.cfConsent.findFirst({
    where: {
      businessId,
      clientId,
      addressHash: hash,
      state: "GRANTED",
      purpose: "COMMERCIAL",
      channel: "EMAIL",
      grantedAt: { lte: now },
    },
    orderBy: { grantedAt: "desc" },
  });
  return {
    reason:
      consent && verifyConsentReceipt(consent) ? null : "NO_VERIFIED_CONSENT",
    consentId: consent && verifyConsentReceipt(consent) ? consent.id : null,
  };
}
