import { prisma } from "@/server/db/prisma";

/** Declaring an email creates a contact, never verifies an existing identity. */
export async function getOrCreateBookingClient(input: { businessId: string; email: string; name: string; phone?: string | null; rut?: string | null }) {
  const email = input.email.trim().toLowerCase();
  const where = { businessId_email: { businessId: input.businessId, email } };
  try {
    return await prisma.client.upsert({ where, update: {}, create: { ...input, email } });
  } catch (error) {
    // Prisma may emulate an upsert with separate statements. The unique index
    // selects one winner; a losing request can safely reuse that committed row.
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
    const existing = await prisma.client.findUnique({ where });
    if (!existing) throw error;
    return existing;
  }
}
