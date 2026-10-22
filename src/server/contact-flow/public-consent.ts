import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { commercialHash } from "@/server/services/commercial-internal";
import { COMMERCIAL_CONSENT_TEXT, COMMERCIAL_CONSENT_VERSION } from "@/core/commercial-consent";
import { addressHash, assertContactLab, contactLabEnabled, contactLock, signature } from "./policy";
import { receiptHash, suppress, verifyConsentReceipt } from "./consent";

export function publicConsentEnabled() {
  return process.env.CONTACT_FLOW_PUBLIC_CONSENT_ENABLED === "1" && contactLabEnabled();
}

// Anonymous form acceptance records intent, never proof of mailbox ownership.
// Only a verified portal session for this exact address can grant eligibility.
export async function recordPublicConsent(input: {
  businessId: string; clientId: string; accepted: boolean; textVersion: string;
  verifiedAccount?: { id: string; email: string } | null;
  evidenceRef?: string;
  tx?: Prisma.TransactionClient;
}) {
  if (!input.accepted || !publicConsentEnabled()) return { recorded: false };
  assertContactLab();
  if (input.textVersion !== COMMERCIAL_CONSENT_VERSION) throw new Error("CONSENT_TEXT_CHANGED");
  const persist = async (tx: Prisma.TransactionClient) => {
    await contactLock(tx);
    const client = await tx.client.findFirstOrThrow({ where: { id: input.clientId, businessId: input.businessId } });
    const account = input.verifiedAccount ? await tx.clientPortalAccount.findFirst({ where: {
      id: input.verifiedAccount.id, email: client.email.toLowerCase(), emailVerifiedAt: { not: null },
    }, select: { id: true, email: true } }) : null;
    const verified = !!account && input.verifiedAccount?.email.toLowerCase() === account.email;
    const source = verified ? "CLIENT_PORTAL" : "PUBLIC_WIDGET";
    const receipt = {
      businessId: client.businessId, clientId: client.id,
      addressHash: addressHash(client.businessId, client.email), source,
      recordedById: verified ? `portal:${input.verifiedAccount!.id}` : "public-widget",
      textVersion: COMMERCIAL_CONSENT_VERSION, acceptedText: COMMERCIAL_CONSENT_TEXT,
      evidenceRef: input.evidenceRef ?? `form:${randomUUID()}`,
      evidenceHash: commercialHash({ accepted: true, source, version: COMMERCIAL_CONSENT_VERSION, client: client.id }),
      grantedAt: new Date(),
    };
    const prior = await tx.cfConsent.findUnique({ where: { businessId_evidenceRef: { businessId: client.businessId, evidenceRef: receipt.evidenceRef } } });
    if (prior) {
      if (prior.clientId !== client.id || prior.addressHash !== receipt.addressHash || prior.source !== source) throw new Error("CONSENT_IDEMPOTENCY_CONFLICT");
      return { recorded: true, state: prior.state };
    }
    const consent = await tx.cfConsent.create({ data: {
      ...receipt, state: verified ? "GRANTED" : "PENDING_VERIFICATION",
      evidenceSignature: signature(`consent:${receiptHash(receipt)}`),
    } });
    await tx.cfAudit.create({ data: {
      businessId: client.businessId, event: "PUBLIC_CONSENT_RECORDED", key: `consent:${consent.id}`,
      details: { consentId: consent.id, source, state: consent.state, textVersion: receipt.textVersion },
    } });
    return { recorded: true, state: consent.state };
  };
  return input.tx ? persist(input.tx) : prisma.$transaction(persist);
}

export async function portalCommercialPreferences(account: { id: string; email: string }) {
  assertContactLab();
  if (!publicConsentEnabled()) throw new Error("CONSENT_DISABLED");
  if (!await prisma.clientPortalAccount.findFirst({ where: { id: account.id, email: account.email, emailVerifiedAt: { not: null } }, select: { id: true } })) throw new Error("VERIFIED_ACCOUNT_REQUIRED");
  const clients = await prisma.client.findMany({
    where: { email: { equals: account.email, mode: "insensitive" }, business: { deletedAt: null } },
    select: { id: true, businessId: true, email: true, business: { select: { name: true } } }, take: 100,
  });
  return Promise.all(clients.map(async c => {
    const hash = addressHash(c.businessId, c.email);
    const [consent, suppression] = await Promise.all([
      prisma.cfConsent.findFirst({ where: { businessId: c.businessId, clientId: c.id, addressHash: hash }, orderBy: { grantedAt: "desc" } }),
      prisma.cfSuppression.findFirst({ where: { businessId: c.businessId, OR: [{ clientId: c.id }, { addressHash: hash }], purpose: { in: ["COMMERCIAL", "ALL"] }, channel: { in: ["EMAIL", "ALL"] } } }),
    ]);
    return { businessId: c.businessId, name: c.business.name,
      state: suppression ? "SUPPRESSED" : consent && verifyConsentReceipt(consent) ? consent.state : "NOT_GRANTED" };
  }));
}

export async function updatePortalCommercialPreference(account: { id: string; email: string }, businessId: string, accepted: boolean) {
  assertContactLab();
  if (!publicConsentEnabled()) throw new Error("CONSENT_DISABLED");
  if (!await prisma.clientPortalAccount.findFirst({ where: { id: account.id, email: account.email, emailVerifiedAt: { not: null } }, select: { id: true } })) throw new Error("VERIFIED_ACCOUNT_REQUIRED");
  const client = await prisma.client.findFirstOrThrow({ where: { businessId, email: { equals: account.email, mode: "insensitive" }, business: { deletedAt: null } } });
  if (accepted) {
    // Suppressions remain authoritative even after another explicit opt-in.
    return recordPublicConsent({ businessId, clientId: client.id, accepted: true, textVersion: COMMERCIAL_CONSENT_VERSION, verifiedAccount: account });
  }
  await prisma.$transaction(async tx => {
    await contactLock(tx);
    await suppress(tx, { businessId, clientId: client.id, addressHash: addressHash(businessId, client.email), reason: "WITHDRAWAL", sourceRef: `portal:${account.id}:${client.id}` });
    await tx.cfConsent.updateMany({ where: { businessId, clientId: client.id, state: "PENDING_VERIFICATION" }, data: { state: "REVOKED", revokedAt: new Date() } });
    await tx.cfAudit.upsert({ where: { key: `portal-revoked:${account.id}:${client.id}` }, update: {}, create: {
      businessId, event: "CONSENT_REVOKED", key: `portal-revoked:${account.id}:${client.id}`, details: { source: "CLIENT_PORTAL" },
    } });
  });
  return { recorded: true, state: "REVOKED" };
}
