import type { Prisma } from "@prisma/client";
import type { LocationHoursInput } from "./location.service";

/** Shared by Settings and Setup. Caller authorizes and validates before writing. */
export async function writeBusinessHours(tx: Prisma.TransactionClient, businessId: string, hours: LocationHoursInput[], locationId?: string) {
  const location = await tx.businessLocation.findFirst({ where: { businessId, isActive: true, ...(locationId ? { id: locationId } : { isPrimary: true }) }, select: { id: true, isPrimary: true } });
  if (locationId && !location) throw new Error("Sucursal no encontrada.");
  for (const h of hours) {
    const data = { startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen, breakStart: h.breakStart || null, breakEnd: h.breakEnd || null };
    if (!locationId || location?.isPrimary) await tx.businessHours.upsert({ where: { businessId_dayOfWeek: { businessId, dayOfWeek: h.dayOfWeek } }, create: { businessId, dayOfWeek: h.dayOfWeek, ...data }, update: data });
    if (location) await tx.locationHours.upsert({ where: { locationId_dayOfWeek: { locationId: location.id, dayOfWeek: h.dayOfWeek } }, create: { locationId: location.id, dayOfWeek: h.dayOfWeek, ...data }, update: data });
  }
}
