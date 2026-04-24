"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
import { revalidatePath } from "next/cache";

type AppointmentStatusAction = "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "NO_SHOW";

/**
 * Update appointment status via Server Action.
 */
export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: AppointmentStatusAction
) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId: business.id },
  });

  if (!appointment) return { error: "Cita no encontrada" };

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Save business hours via Server Action.
 */
export async function saveBusinessHoursAction(
  hours: { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean }[]
) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const operations = hours.map((h) =>
    prisma.businessHours.upsert({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: h.dayOfWeek } },
      create: { businessId: business.id, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen },
      update: { startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen },
    })
  );

  await prisma.$transaction(operations);
  revalidatePath("/dashboard/settings");
  return { success: true };
}
