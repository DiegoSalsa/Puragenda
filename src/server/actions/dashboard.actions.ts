"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
import { revalidatePath } from "next/cache";

// ─── Appointment Status ───
export async function updateAppointmentStatusAction(appointmentId: string, status: "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "NO_SHOW") {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return { error: "No tienes un negocio" };
  const apt = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId: business.id } });
  if (!apt) return { error: "Cita no encontrada" };
  await prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Business Hours ───
export async function saveBusinessHoursAction(hours: { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean }[]) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return { error: "No tienes un negocio" };
  const ops = hours.map((h) =>
    prisma.businessHours.upsert({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: h.dayOfWeek } },
      create: { businessId: business.id, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen },
      update: { startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen },
    })
  );
  await prisma.$transaction(ops);
  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Staff CRUD ───

// Plan limits: max staff allowed (base, before extras)
const PLAN_STAFF_LIMITS: Record<string, number> = { INDIVIDUAL: 1, BASIC: 3, PRO: 5 };

export async function getStaffLimitInfo(businessId: string) {
  const [subscription, currentCount] = await Promise.all([
    prisma.subscription.findUnique({ where: { businessId } }),
    prisma.staff.count({ where: { businessId } }),
  ]);
  const plan = subscription?.plan || "INDIVIDUAL";
  const baseLimit = PLAN_STAFF_LIMITS[plan] ?? 1;
  const extras = subscription?.extraStaffCount || 0;
  const maxAllowed = baseLimit + extras;
  return { plan, currentCount, maxAllowed, canAdd: currentCount < maxAllowed };
}

export async function createStaffAction(data: { name: string; email?: string }) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return { error: "No tienes un negocio" };

  // Enforce staff limit
  const limitInfo = await getStaffLimitInfo(business.id);
  if (!limitInfo.canAdd) {
    const planLabels: Record<string, string> = { INDIVIDUAL: "Individual", BASIC: "Base", PRO: "Pro" };
    return { error: `Has alcanzado el límite de ${limitInfo.maxAllowed} profesional(es) del plan ${planLabels[limitInfo.plan] || limitInfo.plan}. Mejora tu plan para añadir más.` };
  }

  try {
    await prisma.staff.create({ data: { name: data.name, email: data.email || null, businessId: business.id, isActive: true } });
  } catch { return { error: "Error al crear. ¿Email duplicado?" }; }
  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function toggleStaffActiveAction(staffId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return { error: "No tienes un negocio" };
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
  if (!staff) return { error: "Staff no encontrado" };
  await prisma.staff.update({ where: { id: staffId }, data: { isActive: !staff.isActive } });
  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function saveStaffScheduleAction(staffId: string, schedule: { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean }[]) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return { error: "No tienes un negocio" };
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
  if (!staff) return { error: "Staff no encontrado" };
  const ops = schedule.map((s) =>
    prisma.staffSchedule.upsert({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek: s.dayOfWeek } },
      create: { staffId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking },
      update: { startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking },
    })
  );
  await prisma.$transaction(ops);
  revalidatePath("/dashboard/staff");
  return { success: true };
}

// ─── Appearance ───
export async function saveAppearanceAction(data: { primaryColor: string; secondaryColor: string; backgroundColor: string; logoUrl?: string }) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return { error: "No tienes un negocio" };
  await prisma.business.update({
    where: { id: business.id },
    data: {
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      backgroundColor: data.backgroundColor,
      logoUrl: data.logoUrl || null,
      brandColor: data.primaryColor.replace("#", ""),
    },
  });
  revalidatePath("/dashboard/appearance");
  revalidatePath("/dashboard/settings");
  return { success: true };
}
