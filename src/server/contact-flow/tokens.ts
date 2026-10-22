import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";
import {
  assertContactLab,
  contactLock,
  signature,
  signatureMatches,
  digest,
  addressHash,
} from "./policy";
import { suppress } from "./consent";

export async function enrollmentToken(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  businessId: string,
  kind: "UNSUBSCRIBE" | "BOOKING",
  expiresAt: Date,
) {
  const token = await tx.cfToken.upsert({
    where: { enrollmentId_kind: { enrollmentId, kind } },
    create: {
      id: randomBytes(32).toString("base64url"),
      businessId,
      enrollmentId,
      kind,
      expiresAt,
    },
    update: {},
  });
  return `${token.id}.${signature(`${kind}:${token.id}:${token.expiresAt.toISOString()}`)}`;
}
export async function resolveToken(
  tx: Prisma.TransactionClient,
  value: string,
  kind: "UNSUBSCRIBE" | "BOOKING",
  now = new Date(),
) {
  assertContactLab();
  if (!/^[\w-]{43}\.[\w-]{43}$/.test(value))
    throw new Error("INVALID_CONTACT_TOKEN");
  const [id, signed] = value.split(".");
  const token = await tx.cfToken.findUnique({
    where: { id },
    include: { enrollment: { include: { version: true, message: true } } },
  });
  if (
    !token ||
    token.kind !== kind ||
    token.expiresAt <= now ||
    !signatureMatches(`${kind}:${id}:${token.expiresAt.toISOString()}`, signed)
  )
    throw new Error("INVALID_CONTACT_TOKEN");
  return token;
}
export async function unsubscribe(value: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    await contactLock(tx);
    const token = await resolveToken(tx, value, "UNSUBSCRIBE", now),
      e = token.enrollment;
    await suppress(
      tx,
      {
        businessId: e.businessId,
        clientId: e.clientId,
        addressHash: e.addressHash,
        reason: "UNSUBSCRIBE",
        sourceRef: `unsubscribe:${token.id}`,
      },
      now,
    );
    await tx.cfToken.update({
      where: { id: token.id },
      data: { usedAt: token.usedAt ?? now },
    });
    await tx.cfAudit.upsert({
      where: { key: `unsubscribe:${token.id}` },
      create: {
        businessId: e.businessId,
        campaignId: e.version.campaignId,
        event: "UNSUBSCRIBED",
        key: `unsubscribe:${token.id}`,
      },
      update: {},
    });
    return { unsubscribed: true };
  });
}
// Called inside the existing booking transaction, only for a newly created
// appointment with a matching contact. Forwarded links cannot attribute others.
export async function attributeBooking(
  tx: Prisma.TransactionClient,
  value: string,
  appointment: {
    id: string;
    businessId: string;
    clientId: string | null;
    customerEmail: string;
    serviceId: string;
    locationId: string | null;
  },
  now = new Date(),
) {
  const token = await resolveToken(tx, value, "BOOKING", now),
    e = token.enrollment,
    v = e.version;
  const c = await tx.cfCampaign.findUniqueOrThrow({
    where: { id: v.campaignId },
  });
  if (
    !e.eligible ||
    !e.message?.acceptedAt ||
    appointment.businessId !== e.businessId ||
    appointment.clientId !== e.clientId ||
    appointment.serviceId !== v.serviceId ||
    (c.locationId && appointment.locationId !== c.locationId) ||
    addressHash(e.businessId, appointment.customerEmail) !== e.addressHash ||
    token.usedAt
  )
    throw new Error("ATTRIBUTION_NOT_VERIFIABLE");
  // Single token redemption, even concurrent booking transactions.
  const claim = await tx.cfToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claim.count !== 1) throw new Error("ATTRIBUTION_ALREADY_USED");
  await tx.cfAttribution.create({
    data: {
      businessId: e.businessId,
      enrollmentId: e.id,
      appointmentId: appointment.id,
      tokenHash: digest(value),
    },
  });
}
export async function bookingDestination(value: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const token = await resolveToken(tx, value, "BOOKING", now),
      v = token.enrollment.version;
    if (!token.enrollment.message?.acceptedAt)
      throw new Error("ATTRIBUTION_NOT_VERIFIABLE");
    // Tracking is off by default: redirects do not assert a human click.
    const c = await tx.cfCampaign.findUniqueOrThrow({
      where: { id: v.campaignId },
      include: { location: { select: { slug: true } } },
    });
    return `/widget/${encodeURIComponent(v.businessSlug)}?service=${encodeURIComponent(v.serviceId)}${c.location ? `&location=${encodeURIComponent(c.location.slug)}` : ""}&cf_ref=${encodeURIComponent(value)}`;
  });
}
