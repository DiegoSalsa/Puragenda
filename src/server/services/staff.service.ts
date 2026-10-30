import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { assertStaffCapacity, withStaffCapacityLock } from "./staff-capacity.service";

/**
 * Get all active staff for a business.
 */
export async function getStaffByBusinessId(businessId: string) {
  return prisma.staff.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Get a staff member by ID, verifying it belongs to the business.
 */
export async function getStaffByIdAndBusiness(
  staffId: string,
  businessId: string
) {
  return prisma.staff.findFirst({
    where: { id: staffId, businessId, isActive: true },
  });
}

/**
 * Create a new staff member.
 */
export async function createStaff(data: {
  name: string;
  email?: string;
  businessId: string;
  userId?: string;
}) {
  return withStaffCapacityLock(data.businessId, async (tx) => {
    await assertStaffCapacity(data.businessId, tx);
    const locationIds = await resolveNewStaffLocations(tx, data.businessId);
    return tx.staff.create({
      data: {
        name: data.name,
        email: data.email,
        businessId: data.businessId,
        userId: data.userId,
        isActive: true,
        locations: { create: locationIds.map(locationId => ({ locationId })) },
        ...(locationIds.length ? { schedule: { create: initialStaffSchedule() } } : {}),
      },
    });
  });
}

export class StaffLifecycleError extends Error {}

/** Empty assignments remain supported only for businesses with no locations (legacy). */
export async function resolveNewStaffLocations(tx: Prisma.TransactionClient, businessId: string, requested?: string[]) {
  await tx.$queryRaw`SELECT "id" FROM "BusinessLocation" WHERE "businessId" = ${businessId} ORDER BY "id" FOR SHARE`;
  const locations = await tx.businessLocation.findMany({ where: { businessId }, select: { id: true, isActive: true } });
  const active = locations.filter(l => l.isActive);
  const ids = [...new Set(requested ?? [])];
  if (!ids.length && active.length === 1) ids.push(active[0].id);
  if (!ids.length && locations.length) throw new StaffLifecycleError(active.length ? "Selecciona al menos una sucursal donde atenderá el profesional" : "Activa una sucursal antes de agregar profesionales");
  if (ids.some(id => !active.some(l => l.id === id))) throw new StaffLifecycleError("Selecciona sucursales activas de este negocio");
  return ids;
}

export const initialStaffSchedule = () => Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "18:00", isWorking: false }));

/** Row lock is shared with booking guards; a concurrent reservation cannot be missed. */
export async function changeStaffActive(businessId: string, staffId: string, desired?: boolean) {
  return withStaffCapacityLock(businessId, async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Staff" WHERE "id" = ${staffId} AND "businessId" = ${businessId} FOR UPDATE`;
    const staff = await tx.staff.findFirst({ where: { id: staffId, businessId } });
    if (!staff) throw new StaffLifecycleError("Profesional no encontrado");
    const isActive = desired ?? !staff.isActive;
    if (isActive === staff.isActive) return staff;
    if (isActive) await assertStaffCapacity(businessId, tx);
    else {
      const now = new Date();
      const appointments = await tx.appointment.count({
        where: {
          businessId, staffId, endTime: { gt: now },
          OR: [
            // An ongoing session remains active regardless of its payment status.
            { status: "CHECKED_IN" },
            { status: { in: ["PENDING", "CONFIRMED", "AWAITING_PAYMENT"] }, paymentStatus: { not: "REJECTED" } },
          ],
        },
      });
      const recurring = await tx.recurringBooking.count({ where: { businessId, staffId, endDate: { gt: now }, status: { in: ["ACTIVE", "PAUSED", "PENDING_APPROVAL"] } } });
      if (appointments || recurring) throw new StaffLifecycleError(`Tiene ${appointments} reserva(s) futura(s) y ${recurring} plan(es) recurrente(s) vigente(s). Revisa Agenda y Planes recurrentes para reasignar o resolver esas reservas antes de desactivar.`);
    }
    return tx.staff.update({ where: { id: staffId, businessId }, data: { isActive } });
  });
}
