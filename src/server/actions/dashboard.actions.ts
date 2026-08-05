"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { SALT_ROUNDS, STAFF_LIMITS } from "@/core/constants";
import { sendStaffInviteEmail } from "@/server/email/send";
import { isValidTime, isValidTimeRange } from "@/lib/time";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { calculatePriorityReleaseAt } from "@/server/services/schedule-block.service";
import { normalizeLoyaltyCodePrefix } from "@/server/services/loyalty-code.service";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";
import {
  getMercadoPagoCurrency,
  isMercadoPagoCurrencyCompatible,
  isSupportedCountryCode,
  isValidTimeZone,
} from "@/core/countries";
import { createBusinessLocation, getLocationForBusiness, updateBusinessLocation } from "@/server/services/location.service";

type DailyHours = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen?: boolean;
  isWorking?: boolean;
  breakStart?: string | null;
  breakEnd?: string | null;
};

function validateDailyHours(entries: DailyHours[]): string | null {
  if (entries.length === 0 || entries.length > 7 || new Set(entries.map((entry) => entry.dayOfWeek)).size !== entries.length) {
    return "La configuración de días es inválida";
  }

  for (const entry of entries) {
    if (!Number.isInteger(entry.dayOfWeek) || entry.dayOfWeek < 0 || entry.dayOfWeek > 6) {
      return "Día de la semana inválido";
    }
    if (!isValidTime(entry.startTime) || !isValidTime(entry.endTime)) {
      return "Usa horas válidas en formato HH:mm";
    }
    const isActive = entry.isOpen ?? entry.isWorking ?? true;
    if (isActive && !isValidTimeRange(entry.startTime, entry.endTime)) {
      return "La hora de inicio debe ser anterior a la hora de fin";
    }
    if (isActive && (entry.breakStart || entry.breakEnd)) {
      if (!entry.breakStart || !entry.breakEnd || !isValidTimeRange(entry.breakStart, entry.breakEnd)) {
        return "Revisa el horario de la pausa";
      }
      if (entry.breakStart < entry.startTime || entry.breakEnd > entry.endTime) {
        return "La pausa debe estar dentro del horario laboral";
      }
    }
  }

  return null;
}

// â”€â”€â”€ Appointment Status â”€â”€â”€
export async function updateAppointmentStatusAction(appointmentId: string, status: "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "NO_SHOW") {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  const [canManageAll, canManageOwn] = await Promise.all([
    hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_ALL),
    hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN),
  ]);
  if (!canManageAll && !canManageOwn) {
    return { error: "No tienes permisos para modificar citas" };
  }
  const apt = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId: business.id } });
  if (!apt) return { error: "Cita no encontrada" };
  const agendaScope = await getStaffAgendaScope(user, business);
  if (!canManageAll && (!agendaScope.ownStaffId || apt.staffId !== agendaScope.ownStaffId)) {
    return { error: "No tienes permisos para modificar esta cita" };
  }
  await prisma.appointment.update({ where: { id: appointmentId }, data: { status } });
  await syncAppointmentToGoogle(appointmentId);
  revalidatePath("/dashboard");
  return { success: true };
}

// â”€â”€â”€ Business Hours â”€â”€â”€
export async function saveBusinessHoursAction(hours: { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean; breakStart?: string | null; breakEnd?: string | null }[], locationId?: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para modificar los horarios del negocio" };
  }
  const validationError = validateDailyHours(hours);
  if (validationError) return { error: validationError };
  if (locationId) {
    const location = await prisma.businessLocation.findFirst({ where: { id: locationId, businessId: business.id, isActive: true }, select: { id: true } });
    if (!location) return { error: "Sucursal no encontrada" };
    await prisma.$transaction(hours.map((h) => prisma.locationHours.upsert({
      where: { locationId_dayOfWeek: { locationId: location.id, dayOfWeek: h.dayOfWeek } },
      create: { locationId: location.id, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen, breakStart: h.breakStart || null, breakEnd: h.breakEnd || null },
      update: { startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen, breakStart: h.breakStart || null, breakEnd: h.breakEnd || null },
    })));
    revalidatePath("/dashboard/settings");
    revalidatePath(`/widget/${business.slug}`);
    return { success: true };
  }
  const ops = hours.map((h) =>
    prisma.businessHours.upsert({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: h.dayOfWeek } },
      create: { businessId: business.id, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen, breakStart: h.breakStart || null, breakEnd: h.breakEnd || null },
      update: { startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen, breakStart: h.breakStart || null, breakEnd: h.breakEnd || null },
    })
  );
  const primaryLocation = await prisma.businessLocation.findFirst({
    where: { businessId: business.id, isPrimary: true },
    select: { id: true },
  });
  const locationOps = primaryLocation
    ? hours.map((h) => prisma.locationHours.upsert({
        where: { locationId_dayOfWeek: { locationId: primaryLocation.id, dayOfWeek: h.dayOfWeek } },
        create: { locationId: primaryLocation.id, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen, breakStart: h.breakStart || null, breakEnd: h.breakEnd || null },
        update: { startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen, breakStart: h.breakStart || null, breakEnd: h.breakEnd || null },
      }))
    : [];
  await prisma.$transaction([...ops, ...locationOps]);
  revalidatePath("/dashboard/settings");
  return { success: true };
}

// â”€â”€â”€ Staff CRUD â”€â”€â”€

export async function getStaffLimitInfo(businessId: string) {
  const [subscription, currentCount] = await Promise.all([
    prisma.subscription.findUnique({ where: { businessId } }),
    prisma.staff.count({ where: { businessId } }),
  ]);
  const plan = subscription?.plan || "INDIVIDUAL";
  const baseLimit = STAFF_LIMITS[plan as keyof typeof STAFF_LIMITS] ?? STAFF_LIMITS.INDIVIDUAL;
  const extras = subscription?.extraStaffCount || 0;
  const maxAllowed = baseLimit + extras;
  return { plan, currentCount, maxAllowed, canAdd: currentCount < maxAllowed };
}

export async function createStaffAction(data: { name: string; email: string; role?: "ADMIN" | "RECEPTIONIST" | "STAFF"; serviceIds?: string[] }) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
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
  const canAssignPrivilegedRole = business.ownerId === user.id || user.role === "SUPERADMIN";
  if (!canAssignPrivilegedRole && assignedRole !== "STAFF") {
    return { error: "Solo la cuenta owner puede asignar roles con acceso administrativo" };
  }

  const serviceIds = [...new Set(data.serviceIds || [])];
  if (serviceIds.length > 0) {
    const scopedServiceCount = await prisma.service.count({
      where: { businessId: business.id, id: { in: serviceIds } },
    });
    if (scopedServiceCount !== serviceIds.length) {
      return { error: "Uno o más servicios no pertenecen a este negocio" };
    }
  }

  // Enforce staff limit
  const limitInfo = await getStaffLimitInfo(business.id);
  if (!limitInfo.canAdd) {
    const planLabels: Record<string, string> = { INDIVIDUAL: "Individual", EQUIPO: "Equipo" };
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

    // Build service connections if provided
    const serviceConnect = serviceIds.length > 0
      ? { connect: serviceIds.map((id) => ({ id })) }
      : undefined;

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
          ...(serviceConnect ? { services: serviceConnect } : {}),
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
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return { error: "No tienes permisos para administrar profesionales" };
  }
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
  if (!staff) return { error: "Staff no encontrado" };
  await prisma.staff.update({ where: { id: staffId }, data: { isActive: !staff.isActive } });
  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function saveStaffScheduleAction(staffId: string, schedule: { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean; breakStart?: string | null; breakEnd?: string | null }[], locationId?: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return { error: "No tienes permisos para modificar horarios profesionales" };
  }
  const validationError = validateDailyHours(schedule);
  if (validationError) return { error: validationError };
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
  if (!staff) return { error: "Staff no encontrado" };
  if (locationId) {
    const staffLocation = await prisma.staffLocation.findFirst({
      where: { staffId, locationId, isActive: true, location: { businessId: business.id, isActive: true } },
      select: { id: true },
    });
    if (!staffLocation) return { error: "El profesional no atiende en esta sucursal" };
    await prisma.$transaction(schedule.map((s) => prisma.staffLocationSchedule.upsert({
      where: { staffLocationId_dayOfWeek: { staffLocationId: staffLocation.id, dayOfWeek: s.dayOfWeek } },
      create: { staffLocationId: staffLocation.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking, breakStart: s.breakStart || null, breakEnd: s.breakEnd || null },
      update: { startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking, breakStart: s.breakStart || null, breakEnd: s.breakEnd || null },
    })));
    revalidatePath("/dashboard/staff");
    revalidatePath(`/widget/${business.slug}`);
    return { success: true };
  }
  const ops = schedule.map((s) =>
    prisma.staffSchedule.upsert({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek: s.dayOfWeek } },
      create: { staffId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking, breakStart: s.breakStart || null, breakEnd: s.breakEnd || null },
      update: { startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking, breakStart: s.breakStart || null, breakEnd: s.breakEnd || null },
    })
  );
  await prisma.$transaction(ops);
  revalidatePath("/dashboard/staff");
  return { success: true };
}

// â”€â”€â”€ Appearance â”€â”€â”€
export async function setStaffLocationAssignmentAction(staffId: string, locationId: string, isActive: boolean) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) return { error: "No tienes permisos para administrar profesionales" };

  const [staff, location] = await Promise.all([
    prisma.staff.findFirst({ where: { id: staffId, businessId: business.id }, select: { id: true } }),
    prisma.businessLocation.findFirst({ where: { id: locationId, businessId: business.id, isActive: true }, select: { id: true } }),
  ]);
  if (!staff || !location) return { error: "El profesional o la sucursal no pertenecen a este negocio" };

  const initialSchedule = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "19:00",
    isWorking: false,
    breakStart: null,
    breakEnd: null,
  }));
  await prisma.staffLocation.upsert({
    where: { staffId_locationId: { staffId, locationId } },
    create: {
      staffId,
      locationId,
      isActive,
      schedule: { create: initialSchedule.map((entry) => ({ dayOfWeek: entry.dayOfWeek, startTime: entry.startTime, endTime: entry.endTime, isWorking: entry.isWorking, breakStart: entry.breakStart || null, breakEnd: entry.breakEnd || null })) },
    },
    update: { isActive },
  });
  revalidatePath("/dashboard/staff");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

export async function saveAppearanceAction(data: {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor?: string;
  textMutedColor?: string;
  widgetFontSize?: number;
  widgetCornerRadius?: number;
  widgetShadowStyle?: string;
  widgetHeaderAlign?: string;
  logoUrl?: string;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE))) {
    return { error: "No tienes permisos para modificar el widget" };
  }
  const shadowStyle = ["none", "soft", "strong"].includes(data.widgetShadowStyle || "")
    ? data.widgetShadowStyle
    : "soft";
  const headerAlign = ["left", "center", "right"].includes(data.widgetHeaderAlign || "")
    ? data.widgetHeaderAlign
    : "left";
  await prisma.business.update({
    where: { id: business.id },
    data: {
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      backgroundColor: data.backgroundColor,
      textColor: data.textColor || "#FFFFFF",
      textMutedColor: data.textMutedColor || "#FFFFFF66",
      widgetFontSize: data.widgetFontSize || 14,
      widgetCornerRadius: Math.max(0, Math.min(40, Math.floor(data.widgetCornerRadius ?? 16))),
      widgetShadowStyle: shadowStyle,
      widgetHeaderAlign: headerAlign,
      logoUrl: data.logoUrl || null,
      brandColor: data.primaryColor.replace("#", ""),
    },
  });
  revalidatePath("/dashboard/appearance");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

// â”€â”€â”€ Max Services Per Booking â”€â”€â”€
export async function updateMaxServicesAction(maxServices: number) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
    return { error: "No tienes permisos para modificar los servicios" };
  }

  const clamped = Math.max(1, Math.min(10, Math.floor(maxServices)));
  await prisma.business.update({
    where: { id: business.id },
    data: { maxServicesPerBooking: clamped },
  });
  revalidatePath("/dashboard/services");
  return { success: true };
}

export async function updateServiceCategoryGroupingAction(enabled: boolean) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
    return { error: "No tienes permisos para modificar la organización de servicios" };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: { groupServicesByCategory: Boolean(enabled) },
  });
  revalidatePath("/dashboard/services");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

// â”€â”€â”€ Staff Deletion (Soft Delete) â”€â”€â”€
export async function deleteStaffAction(staffId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return { error: "No tienes permisos para eliminar profesionales" };
  }
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

// â”€â”€â”€ Business Name â”€â”€â”€
export async function updateBusinessNameAction(name: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para modificar la configuración" };
  }

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

// â”€â”€ Update Staff → Service assignments â”€â”€
export async function updateStaffServicesAction(staffId: string, serviceIds: string[]) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return { error: "No tienes permisos para asignar servicios al equipo" };
  }
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
  if (!staff) return { error: "Profesional no encontrado" };
  const uniqueServiceIds = [...new Set(serviceIds)];
  if (uniqueServiceIds.length > 0) {
    const scopedServiceCount = await prisma.service.count({
      where: { businessId: business.id, id: { in: uniqueServiceIds } },
    });
    if (scopedServiceCount !== uniqueServiceIds.length) {
      return { error: "Uno o más servicios no pertenecen a este negocio" };
    }
  }

  await prisma.staff.update({
    where: { id: staffId },
    data: {
      services: {
        set: uniqueServiceIds.map((id) => ({ id })),
      },
    },
  });

  revalidatePath("/dashboard/staff");
  return { success: true };
}

// â”€â”€â”€ Business Logo Upload (Cloudinary) â”€â”€â”€

export async function updateStaffRoleAction(staffId: string, role: "ADMIN" | "RECEPTIONIST" | "STAFF") {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (business.ownerId !== user.id) {
    return { error: "Solo la cuenta owner puede cambiar roles del equipo" };
  }

  if (!["ADMIN", "RECEPTIONIST", "STAFF"].includes(role)) {
    return { error: "Rol invalido" };
  }

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, businessId: business.id },
    select: { userId: true },
  });
  if (!staff) return { error: "Profesional no encontrado" };
  if (!staff.userId) return { error: "Este profesional no tiene una cuenta vinculada" };
  if (staff.userId === business.ownerId) {
    return { error: "No puedes cambiar el rol de la cuenta owner" };
  }

  await prisma.user.update({
    where: { id: staff.userId },
    data: { role },
  });

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateBusinessLogoAction(formData: FormData) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para modificar el logo del negocio" };
  }

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { error: "No se recibió ninguna imagen" };

  // Validate file type
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return { error: "Formato no soportado. Usa PNG, JPG, WebP o SVG." };
  }

  // Validate size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { error: "La imagen es muy pesada. Máximo 5MB." };
  }

  try {
    // Convert File to base64 data URI for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Dynamic import to avoid issues if env vars aren't set yet
    const { cloudinary } = await import("@/server/lib/cloudinary");

    // Upload with auto-resize and optimization
    const result = await cloudinary.uploader.upload(base64, {
      folder: "puragenda_logos",
      public_id: `business_${business.id}`,
      overwrite: true,
      transformation: [
        {
          width: 400,
          height: 400,
          crop: "fill",
          gravity: "center",
        },
      ],
      fetch_format: "auto",
      quality: "auto",
    });

    // Save the optimized URL to DB
    await prisma.business.update({
      where: { id: business.id },
      data: { logoUrl: result.secure_url },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true, url: result.secure_url };
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return { error: "Error al subir la imagen. Verifica tu configuración de Cloudinary." };
  }
}

export async function removeBusinessLogoAction() {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para modificar el logo del negocio" };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: { logoUrl: null },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

const DASHBOARD_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DASHBOARD_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

async function uploadDashboardImage(file: File | null, folder: string, publicId: string, size = 640) {
  if (!file || file.size === 0) return { error: "No se recibio ninguna imagen" };
  if (!DASHBOARD_IMAGE_TYPES.includes(file.type)) {
    return { error: "Formato no soportado. Usa PNG, JPG o WebP." };
  }
  if (file.size > DASHBOARD_IMAGE_MAX_SIZE) {
    return { error: "La imagen es muy pesada. Maximo 5MB." };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
  const { cloudinary } = await import("@/server/lib/cloudinary");
  const result = await cloudinary.uploader.upload(base64, {
    folder,
    public_id: publicId,
    overwrite: true,
    transformation: [
      {
        width: size,
        height: size,
        crop: "fill",
        gravity: "center",
      },
    ],
    fetch_format: "auto",
    quality: "auto",
  });

  return { success: true, url: result.secure_url };
}

export async function uploadServiceImageAssetAction(formData: FormData) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
    return { error: "No tienes permisos para modificar imágenes de servicios" };
  }

  const file = formData.get("image") as File | null;
  try {
    return await uploadDashboardImage(
      file,
      "puragenda_services",
      `business_${business.id}_service_${crypto.randomUUID()}`
    );
  } catch (err) {
    console.error("Service image upload error:", err);
    return { error: "Error al subir la imagen." };
  }
}

export async function updateStaffImageAction(staffId: string, formData: FormData) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return { error: "No tienes permisos para modificar profesionales" };
  }

  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
  if (!staff) return { error: "Profesional no encontrado" };

  const file = formData.get("image") as File | null;
  try {
    const result = await uploadDashboardImage(file, "puragenda_staff", `staff_${staffId}`);
    if (result.error || !result.url) return result;

    await prisma.staff.update({ where: { id: staffId }, data: { imageUrl: result.url } });
    revalidatePath("/dashboard/staff");
    revalidatePath(`/widget/${business.slug}`);
    return { success: true, url: result.url };
  } catch (err) {
    console.error("Staff image upload error:", err);
    return { error: "Error al subir la imagen." };
  }
}

export async function removeStaffImageAction(staffId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return { error: "No tienes permisos para modificar profesionales" };
  }

  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
  if (!staff) return { error: "Profesional no encontrado" };

  await prisma.staff.update({ where: { id: staffId }, data: { imageUrl: null } });
  revalidatePath("/dashboard/staff");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

// â”€â”€â”€ Schedule Blocks (Breaks / Manual Blocks) â”€â”€â”€

export async function createScheduleBlockAction(data: {
  staffId: string;
  date: string;      // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  reason?: string;
  type?: "UNAVAILABLE" | "PRIORITY";
  releaseHoursBefore?: number | null;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return { error: "No tienes permisos para administrar bloqueos del equipo" };
  }

  // Validate staff belongs to business
  const staff = await prisma.staff.findFirst({ where: { id: data.staffId, businessId: business.id } });
  if (!staff) return { error: "Profesional no encontrado" };

  // Build DateTimes from the business timezone (Vercel runs in UTC).
  // Instead of new Date(`${date}T${time}:00`) which parses as UTC on Vercel
  const { fromZonedTime } = await import("date-fns-tz");
  const start = fromZonedTime(`${data.date}T${data.startTime}:00`, business.timezone);
  const end = fromZonedTime(`${data.date}T${data.endTime}:00`, business.timezone);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: "Fecha u hora inválida" };
  if (end <= start) return { error: "La hora de fin debe ser posterior a la de inicio" };

  const blockType = data.type ?? "UNAVAILABLE";
  if (!["UNAVAILABLE", "PRIORITY"].includes(blockType)) {
    return { error: "Tipo de bloqueo inválido" };
  }
  const allowedReleaseHours = new Set([24, 48, 72]);
  if (
    blockType === "PRIORITY" &&
    data.releaseHoursBefore != null &&
    !allowedReleaseHours.has(data.releaseHoursBefore)
  ) {
    return { error: "El plazo de liberación no es válido" };
  }
  const releaseAt =
    blockType === "PRIORITY"
      ? calculatePriorityReleaseAt(start, data.releaseHoursBefore)
      : null;
  if (releaseAt && releaseAt <= new Date()) {
    return { error: "El cupo ya estaría liberado. Elige una fecha posterior o un plazo menor." };
  }

  // Check for overlapping blocks
  const overlap = await prisma.scheduleBlock.findFirst({
    where: {
      staffId: data.staffId,
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });
  if (overlap) return { error: "Ya existe un bloqueo en ese rango horario" };

  if (blockType === "PRIORITY") {
    const occupied = await prisma.appointment.findFirst({
      where: {
        staffId: data.staffId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: { id: true },
    });
    if (occupied) return { error: "Ese horario ya tiene una cita y no puede reservarse como prioritario" };
  }

  const block = await prisma.scheduleBlock.create({
    data: {
      staffId: data.staffId,
      startTime: start,
      endTime: end,
      reason: data.reason?.trim() || null,
      type: blockType,
      releaseAt,
    },
  });

  // ── Logic 3: Check if this block collides with any active recurring appointments ──
  if (blockType === "UNAVAILABLE") {
    try {
      const collidingAppointments = await prisma.appointment.findMany({
        where: {
          staffId: data.staffId,
          startTime: { lt: block.endTime },
          endTime: { gt: block.startTime },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          recurringBookingId: { not: null },
        },
        include: {
          recurringBooking: { select: { id: true, customerName: true, customerEmail: true } },
          service: { select: { name: true } },
          business: { select: { name: true, timezone: true } },
        },
      });

      if (collidingAppointments.length > 0) {
        const { sendRecurringSessionCancelledClient } = await import("@/server/email/send");

        for (const apt of collidingAppointments) {
          // Cancel the appointment
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { status: "CANCELLED" },
          });
          await syncAppointmentToGoogle(apt.id);

          // Create a session override record
          await prisma.recurringSessionOverride.create({
            data: {
              recurringBookingId: apt.recurringBookingId!,
              originalDate: apt.startTime,
              action: "CANCELLED",
              reason: "Bloqueo de agenda",
              requestedByClient: false,
            },
          });

          // Notify the client
          await sendRecurringSessionCancelledClient({
            customerEmail: apt.recurringBooking!.customerEmail,
            customerName: apt.recurringBooking!.customerName,
            serviceName: apt.service.name,
            sessionDate: apt.startTime,
            businessName: apt.business.name,
            timezone: apt.business.timezone,
          });
        }

        console.log(`[ScheduleBlock] Cancelled ${collidingAppointments.length} recurring appointments due to block`);
      }
    } catch (err) {
      console.error("[ScheduleBlock] Error checking recurring collisions:", err);
    }
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteScheduleBlockAction(blockId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return { error: "No tienes permisos para administrar bloqueos del equipo" };
  }

  // Verify block belongs to a staff in this business
  const block = await prisma.scheduleBlock.findUnique({
    where: { id: blockId },
    include: { staff: { select: { businessId: true } } },
  });
  if (!block || block.staff.businessId !== business.id) return { error: "Bloqueo no encontrado" };

  await prisma.scheduleBlock.delete({ where: { id: blockId } });
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
  return { success: true };
}

// â”€â”€â”€ Loyalty / Fidelización Config â”€â”€â”€

export async function saveLoyaltyConfigAction(data: {
  isLoyaltyEnabled: boolean;
  stampsRequired: number;
  rewardName: string;
  discountType: string;
  discountValue: number;
  loyaltyCodePrefix: string;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.LOYALTY_MANAGE))) {
    return { error: "No tienes permisos para configurar la fidelización" };
  }

  const stamps = Math.max(1, Math.min(50, Math.floor(data.stampsRequired)));
  const discountVal = Math.max(0, Math.floor(data.discountValue || 0));
  const loyaltyCodePrefix = normalizeLoyaltyCodePrefix(data.loyaltyCodePrefix);

  if (data.discountType && !["PERCENTAGE", "FIXED"].includes(data.discountType)) {
    return { error: "Tipo de descuento inválido" };
  }

  if (data.discountType === "PERCENTAGE" && discountVal > 100) {
    return { error: "El porcentaje no puede ser mayor a 100" };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: {
      isLoyaltyEnabled: data.isLoyaltyEnabled,
      stampsRequired: stamps,
      rewardName: data.rewardName?.trim() || null,
      discountType: data.discountType || null,
      discountValue: discountVal || null,
      loyaltyCodePrefix,
    },
  });

  revalidatePath("/dashboard/loyalty");
  return { success: true };
}

// â”€â”€â”€ Business Location â”€â”€â”€
export async function updateBusinessCountryAction(
  data: { countryCode: string; timezone: string; currencyCode: string },
  confirmedImpact = false,
) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para modificar la configuración" };
  }
  const countryCode = data.countryCode.trim().toUpperCase();
  const currencyCode = data.currencyCode.trim().toUpperCase();
  if (!isSupportedCountryCode(countryCode)) {
    return { error: "El país seleccionado no está soportado" };
  }
  if (!isValidTimeZone(data.timezone)) return { error: "La zona horaria no es válida" };
  if (!/^[A-Z]{3}$/.test(currencyCode)) return { error: "La moneda debe usar un código ISO de 3 letras" };
  const unchanged = business.countryCode === countryCode && business.timezone === data.timezone && business.currencyCode === currencyCode;
  if (unchanged) return { success: true };
  if (business.mpAccessToken && business.countryCode !== countryCode) {
    return { error: "Desconecta primero la cuenta de Mercado Pago antes de cambiar el país" };
  }
  if (business.mpAccessToken && !isMercadoPagoCurrencyCompatible(countryCode, currencyCode)) {
    const expectedCurrency = getMercadoPagoCurrency(countryCode);
    return {
      error: expectedCurrency
        ? `Mercado Pago conectado requiere ${expectedCurrency}. Desconéctalo antes de usar otra moneda.`
        : "Desconecta primero Mercado Pago antes de usar esta moneda.",
    };
  }
  if (!confirmedImpact) {
    return { error: "Debes confirmar el impacto sobre horarios y precios existentes" };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: {
      countryCode,
      currencyCode,
      timezone: data.timezone,
    },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

export async function updateBusinessLocationAction(data: { address: string; mapsUrl: string }) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para modificar la ubicación" };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: {
      address: data.address.trim() || null,
      mapsUrl: data.mapsUrl.trim() || null,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Business locations / sucursales ───────────────────────────────────────
export async function createBusinessLocationAction(data: { name: string; address: string; mapsUrl?: string; timezone: string }) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) return { error: "No tienes permisos para administrar sucursales" };
  if (data.name.trim().length < 2 || data.address.trim().length < 5) return { error: "Indica el nombre y una dirección válida" };
  if (!isValidTimeZone(data.timezone)) return { error: "La zona horaria no es válida" };
  await createBusinessLocation({ businessId: business.id, ...data });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

export async function updateBusinessLocationRecordAction(locationId: string, data: { name: string; address: string; mapsUrl?: string; timezone: string; isActive: boolean }) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) return { error: "No tienes permisos para administrar sucursales" };
  if (data.name.trim().length < 2 || data.address.trim().length < 5) return { error: "Indica el nombre y una dirección válida" };
  if (!isValidTimeZone(data.timezone)) return { error: "La zona horaria no es válida" };
  try {
    const result = await updateBusinessLocation(business.id, locationId, data);
    if (!result) return { error: "Sucursal no encontrada" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo actualizar la sucursal" };
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

// ─── Deposit / Abono Config ───

export async function deleteBusinessLocationAction(locationId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) return { error: "No tienes permisos para administrar sucursales" };

  const location = await prisma.businessLocation.findFirst({
    where: { id: locationId, businessId: business.id },
    select: { id: true, isPrimary: true },
  });
  if (!location) return { error: "Sucursal no encontrada" };
  if (location.isPrimary) return { error: "La sucursal principal no puede eliminarse" };

  const [appointments, recurringBookings, productionOrders, scheduleBlocks] = await Promise.all([
    prisma.appointment.count({ where: { locationId } }),
    prisma.recurringBooking.count({ where: { locationId } }),
    prisma.productionOrder.count({ where: { locationId } }),
    prisma.scheduleBlock.count({ where: { locationId } }),
  ]);
  if (appointments + recurringBookings + productionOrders + scheduleBlocks > 0) {
    return { error: "No puedes eliminar una sucursal con historial o agenda. Archívala para dejar de mostrarla al público." };
  }

  await prisma.businessLocation.delete({ where: { id: location.id } });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

export async function setLocationServiceAvailabilityAction(locationId: string, serviceId: string, isAvailable: boolean) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) return { error: "No tienes permisos para administrar sucursales" };

  const [location, service] = await Promise.all([
    prisma.businessLocation.findFirst({ where: { id: locationId, businessId: business.id }, select: { id: true } }),
    prisma.service.findFirst({ where: { id: serviceId, businessId: business.id }, select: { id: true } }),
  ]);
  if (!location || !service) return { error: "La sucursal o el servicio no pertenecen a este negocio" };

  if (isAvailable) {
    await prisma.locationService.upsert({
      where: { locationId_serviceId: { locationId, serviceId } },
      create: { locationId, serviceId },
      update: {},
    });
  } else {
    await prisma.locationService.deleteMany({ where: { locationId, serviceId } });
  }
  revalidatePath("/dashboard/settings");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

export async function saveDepositConfigAction(data: {
  depositRequired: boolean;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para configurar los abonos" };
  }

  // If enabling deposits, check that MP is connected
  if (data.depositRequired && !business.mpAccessToken) {
    return { error: "Debes conectar tu cuenta de Mercado Pago antes de activar abonos." };
  }
  if (data.depositRequired && !isMercadoPagoCurrencyCompatible(business.countryCode, business.currencyCode)) {
    const expectedCurrency = getMercadoPagoCurrency(business.countryCode);
    return {
      error: expectedCurrency
        ? `Para cobrar abonos con Mercado Pago en ${business.countryCode}, usa ${expectedCurrency}.`
        : "Mercado Pago no está disponible para el país de este negocio.",
    };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: {
      depositRequired: data.depositRequired,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Business Policies (recurring) ───

export async function updateBusinessPoliciesAction(data: {
  allowRescheduling: boolean;
  rescheduleHoursLimit: number;
  includeAppointmentActionsInConfirmationEmail: boolean;
  requiresClientRut: boolean;
  allowSameDayBookings: boolean;
  slotInterval: number;
  minAdvanceBookingMinutes: number;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para configurar las políticas" };
  }
  if (
    !Number.isFinite(data.rescheduleHoursLimit) ||
    !Number.isFinite(data.slotInterval) ||
    !Number.isFinite(data.minAdvanceBookingMinutes)
  ) {
    return { error: "Usa valores numéricos válidos para las políticas de reserva" };
  }

  const hoursLimit = Math.max(1, Math.min(168, Math.floor(data.rescheduleHoursLimit)));

  // Any useful interval is valid. Five-minute precision keeps the widget
  // predictable while still allowing fully custom schedules.
  const slotInterval = Math.max(5, Math.min(240, Math.round(data.slotInterval / 5) * 5));

  // Clamp minAdvanceBookingMinutes between 0 and 1440 (24h)
  const minAdvance = Math.max(0, Math.min(1440, Math.floor(data.minAdvanceBookingMinutes)));

  await prisma.business.update({
    where: { id: business.id },
    data: {
      allowRescheduling: data.allowRescheduling,
      rescheduleHoursLimit: hoursLimit,
      includeAppointmentActionsInConfirmationEmail: Boolean(data.includeAppointmentActionsInConfirmationEmail),
      requiresClientRut: data.requiresClientRut,
      allowSameDayBookings: data.allowSameDayBookings,
      slotInterval,
      minAdvanceBookingMinutes: minAdvance,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Encargos personalizados ───

export async function updateProductionOrdersEnabledAction(enabled: boolean) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para configurar los encargos" };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: { productionOrdersEnabled: Boolean(enabled) },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/services");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

// ─── Disconnect Mercado Pago ───

export async function disconnectMercadoPagoAction() {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para desconectar Mercado Pago" };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: {
      mpAccessToken: null,
      mpRefreshToken: null,
      mpUserId: null,
      mpTokenExpiresAt: null,
      depositRequired: false,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Changelog ───

export async function markChangelogSeenAction(version: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  (await cookies()).set("puragenda_changelog_seen", version, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { success: true };
}

// ─── Schedule Overrides ───

export async function saveScheduleOverrideAction(data: {
  locationId?: string;
  date: string;        // YYYY-MM-DD
  isOpen: boolean;
  startTime?: string;
  endTime?: string;
  breakStart?: string | null;
  breakEnd?: string | null;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para modificar los horarios del negocio" };
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { error: "Formato de fecha inválido" };
  }
  const dateObj = new Date(`${data.date}T00:00:00.000Z`);
  if (isNaN(dateObj.getTime())) {
    return { error: "Fecha inválida" };
  }

  if (data.isOpen) {
    if (!data.startTime || !data.endTime) {
      return { error: "Debes indicar hora de inicio y fin cuando el día está abierto" };
    }
    if (!isValidTime(data.startTime) || !isValidTime(data.endTime)) {
      return { error: "Usa horas válidas en formato HH:mm" };
    }
    if (!isValidTimeRange(data.startTime, data.endTime)) {
      return { error: "La hora de inicio debe ser anterior a la hora de fin" };
    }
    if (data.breakStart || data.breakEnd) {
      if (!data.breakStart || !data.breakEnd || !isValidTimeRange(data.breakStart, data.breakEnd)) {
        return { error: "Revisa el horario de la pausa" };
      }
      if (data.breakStart < data.startTime || data.breakEnd > data.endTime) {
        return { error: "La pausa debe estar dentro del horario laboral" };
      }
    }
  }

  const location = await getLocationForBusiness(business.id, data.locationId);
  if (!location) return { error: "Sucursal no encontrada" };
  await prisma.locationScheduleOverride.upsert({
    where: { locationId_date: { locationId: location.id, date: dateObj } },
    create: {
      locationId: location.id,
      date: dateObj,
      isOpen: data.isOpen,
      startTime: data.isOpen ? data.startTime || null : null,
      endTime: data.isOpen ? data.endTime || null : null,
      breakStart: data.isOpen ? data.breakStart || null : null,
      breakEnd: data.isOpen ? data.breakEnd || null : null,
    },
    update: {
      isOpen: data.isOpen,
      startTime: data.isOpen ? data.startTime || null : null,
      endTime: data.isOpen ? data.endTime || null : null,
      breakStart: data.isOpen ? data.breakStart || null : null,
      breakEnd: data.isOpen ? data.breakEnd || null : null,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

export async function deleteScheduleOverrideAction(date: string, locationId?: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para modificar los horarios del negocio" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Formato de fecha inválido" };
  }

  const dateObj = new Date(`${date}T00:00:00.000Z`);

  const location = await getLocationForBusiness(business.id, locationId);
  if (!location) return { error: "Sucursal no encontrada" };
  await prisma.locationScheduleOverride.deleteMany({ where: { locationId: location.id, date: dateObj } });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/widget/${business.slug}`);
  return { success: true };
}

export async function getScheduleOverridesAction(locationId?: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado", overrides: [] };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio", overrides: [] };

  const location = await getLocationForBusiness(business.id, locationId);
  if (!location) return { error: "Sucursal no encontrada", overrides: [] };
  const overrides = await prisma.locationScheduleOverride.findMany({
    where: { locationId: location.id },
    orderBy: { date: "asc" },
  });

  return {
    overrides: overrides.map((o) => ({
      id: o.id,
      date: o.date.toISOString().split("T")[0],
      isOpen: o.isOpen,
      startTime: o.startTime,
      endTime: o.endTime,
      breakStart: o.breakStart,
      breakEnd: o.breakEnd,
    })),
  };
}
