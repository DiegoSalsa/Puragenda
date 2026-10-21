import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export const PAYMENT_HOLD_DURATION_MS = 10 * 60 * 1000;

export function paymentHoldExpiresAt(createdAt = new Date()) {
  return new Date(createdAt.getTime() + PAYMENT_HOLD_DURATION_MS);
}

/**
 * Releases only the short-lived, integrated Mercado Pago holds created by the
 * public booking flow. Manual payment links and older appointment workflows
 * never get a paymentHoldExpiresAt value and are therefore untouched.
 *
 * The advisory lock makes this safe across Vercel instances and serializes it
 * with appointment creation and payment confirmation for the same business.
 */
export async function releaseExpiredPaymentHolds(input: {
  businessId?: string;
  now?: Date;
  tx?: Prisma.TransactionClient;
} = {}): Promise<{ released: number; at: Date }> {
  const now = input.now ?? new Date();
  if (!input.tx && !input.businessId) {
    const findMany = (prisma.appointment as { findMany?: (args: unknown) => Promise<Array<{ businessId: string }>> }).findMany;
    if (typeof findMany !== "function") return { released: 0, at: now };
    const candidates = await findMany({
      where: {
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
        paymentHoldExpiresAt: { lte: now },
        depositPaymentUrl: null,
        recurringBookingId: null,
      },
      select: { businessId: true },
      distinct: ["businessId"],
    });
    let released = 0;
    for (const candidate of candidates) {
      released += (await releaseExpiredPaymentHolds({ businessId: candidate.businessId, now })).released;
    }
    return { released, at: now };
  }
  if (!input.tx && typeof (prisma as { $transaction?: unknown }).$transaction === "function") {
    return prisma.$transaction((tx) => releaseExpiredPaymentHolds({ ...input, tx }));
  }
  const db = input.tx ?? prisma;
  const businessIds = input.businessId ? [input.businessId] : null;

  if (businessIds && typeof (db as { $queryRaw?: unknown }).$queryRaw === "function") {
    await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`booking-capacity:${input.businessId}`}, 0))::text`;
  }

  // Some read-only service consumers provide a deliberately small Prisma
  // facade. Expiry is best-effort there; real Prisma clients always expose the
  // mutation below.
  if (typeof (db.appointment as { updateMany?: unknown }).updateMany !== "function") {
    return { released: 0, at: now };
  }

  const result = await db.appointment.updateMany({
    where: {
      ...(businessIds ? { businessId: { in: businessIds } } : {}),
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      paymentHoldExpiresAt: { lte: now },
      depositPaymentUrl: null,
      recurringBookingId: null,
    },
    data: {
      status: "CANCELLED",
    },
  });

  return { released: result.count, at: now };
}

