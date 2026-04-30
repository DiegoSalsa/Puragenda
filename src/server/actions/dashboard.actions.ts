"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { SALT_ROUNDS } from "@/core/constants";
import { sendStaffInviteEmail } from "@/server/email/send";

// ─── Appointment Status ───
export async function updateAppointmentStatusAction(appointmentId: string, status: "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "NO_SHOW") {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
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
  const business = await getBusinessForUser(user.id);
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

export async function createStaffAction(data: { name: string; email: string; role?: "ADMIN" | "RECEPTIONIST" | "STAFF" }) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  // Only ADMIN can create staff
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return { error: "No tienes permisos para agregar profesionales" };
  }

  // Validate email
  const email = data.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Debes proporcionar un email válido" };
  }

  // Validate role
  const assignedRole = data.role || "STAFF";
  if (!["ADMIN", "RECEPTIONIST", "STAFF"].includes(assignedRole)) {
    return { error: "Rol inválido" };
  }

  // Enforce staff limit
  const limitInfo = await getStaffLimitInfo(business.id);
  if (!limitInfo.canAdd) {
    const planLabels: Record<string, string> = { INDIVIDUAL: "Individual", BASIC: "Base", PRO: "Pro" };
    return { error: `Has alcanzado el límite de ${limitInfo.maxAllowed} profesional(es) del plan ${planLabels[limitInfo.plan] || limitInfo.plan}. Mejora tu plan para añadir más.` };
  }

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Ya existe un usuario con ese email. Usa otro email." };
  }

  try {
    // Generate secure random password
    const tempPassword = crypto.randomBytes(5).toString("hex"); // 10 char hex string
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    // Create User + Staff in a transaction
    await prisma.$transaction(async (tx) => {
      const staffUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: data.name.trim(),
          role: assignedRole,
        },
      });

      await tx.staff.create({
        data: {
          name: data.name.trim(),
          email,
          businessId: business.id,
          userId: staffUser.id,
          isActive: true,
        },
      });
    });

    // Send invite email with temporary password (fire and forget)
    sendStaffInviteEmail(email, data.name.trim(), business.name, tempPassword).catch(() => {});
  } catch {
    return { error: "Error al crear. ¿Email duplicado?" };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function toggleStaffActiveAction(staffId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
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
  const business = await getBusinessForUser(user.id);
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
export async function saveAppearanceAction(data: {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor?: string;
  textMutedColor?: string;
  widgetFontSize?: number;
  logoUrl?: string;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  await prisma.business.update({
    where: { id: business.id },
    data: {
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      backgroundColor: data.backgroundColor,
      textColor: data.textColor || "#FFFFFF",
      textMutedColor: data.textMutedColor || "#FFFFFF66",
      widgetFontSize: data.widgetFontSize || 14,
      logoUrl: data.logoUrl || null,
      brandColor: data.primaryColor.replace("#", ""),
    },
  });
  revalidatePath("/dashboard/appearance");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Max Services Per Booking ───
export async function updateMaxServicesAction(maxServices: number) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const clamped = Math.max(1, Math.min(10, Math.floor(maxServices)));
  await prisma.business.update({
    where: { id: business.id },
    data: { maxServicesPerBooking: clamped },
  });
  revalidatePath("/dashboard/services");
  return { success: true };
}

// ─── Staff Deletion (Soft Delete) ───
export async function deleteStaffAction(staffId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
  if (!staff) return { error: "Profesional no encontrado" };

  // Soft delete: deactivate + disconnect from future appointments
  await prisma.$transaction([
    // Nullify staffId on all appointments referencing this staff
    prisma.appointment.updateMany({ where: { staffId }, data: { staffId: null } }),
    // Delete schedules
    prisma.staffSchedule.deleteMany({ where: { staffId } }),
    // Delete the staff record
    prisma.staff.delete({ where: { id: staffId } }),
  ]);

  revalidatePath("/dashboard/staff");
  return { success: true };
}

// ─── Business Name ───
export async function updateBusinessNameAction(name: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { error: "El nombre debe tener entre 2 y 100 caracteres" };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: { name: trimmed },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Update Staff → Service assignments ──
export async function updateStaffServicesAction(staffId: string, serviceIds: string[]) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
  if (!staff) return { error: "Profesional no encontrado" };

  await prisma.staff.update({
    where: { id: staffId },
    data: {
      services: {
        set: serviceIds.map((id) => ({ id })),
      },
    },
  });

  revalidatePath("/dashboard/staff");
  return { success: true };
}
