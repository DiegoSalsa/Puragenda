"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { SALT_ROUNDS } from "@/core/constants";
import { sendStaffInviteEmail } from "@/server/email/send";

// â”€â”€â”€ Appointment Status â”€â”€â”€
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

// â”€â”€â”€ Business Hours â”€â”€â”€
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

// â”€â”€â”€ Staff CRUD â”€â”€â”€

// Plan limits: max staff allowed (base, before extras)
const PLAN_STAFF_LIMITS: Record<string, number> = { INDIVIDUAL: 1, EQUIPO: 3 };

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

export async function createStaffAction(data: { name: string; email: string; role?: "ADMIN" | "RECEPTIONIST" | "STAFF"; serviceIds?: string[] }) {
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
    const serviceConnect = data.serviceIds && data.serviceIds.length > 0
      ? { connect: data.serviceIds.map((id) => ({ id })) }
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

// â”€â”€â”€ Appearance â”€â”€â”€
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

// â”€â”€â”€ Max Services Per Booking â”€â”€â”€
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

// â”€â”€â”€ Staff Deletion (Soft Delete) â”€â”€â”€
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

// â”€â”€â”€ Business Name â”€â”€â”€
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

// â”€â”€ Update Staff → Service assignments â”€â”€
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

// â”€â”€â”€ Business Logo Upload (Cloudinary) â”€â”€â”€

export async function updateBusinessLogoAction(formData: FormData) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") return { error: "Sin permisos" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

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

  await prisma.business.update({
    where: { id: business.id },
    data: { logoUrl: null },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

// â”€â”€â”€ Schedule Blocks (Breaks / Manual Blocks) â”€â”€â”€

export async function createScheduleBlockAction(data: {
  staffId: string;
  date: string;      // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  reason?: string;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  // Validate staff belongs to business
  const staff = await prisma.staff.findFirst({ where: { id: data.staffId, businessId: business.id } });
  if (!staff) return { error: "Profesional no encontrado" };

  // Build DateTimes from date + time in America/Santiago timezone
  // Instead of new Date(`${date}T${time}:00`) which parses as UTC on Vercel
  const { fromZonedTime } = await import("date-fns-tz");
  const start = fromZonedTime(`${data.date}T${data.startTime}:00`, "America/Santiago");
  const end = fromZonedTime(`${data.date}T${data.endTime}:00`, "America/Santiago");

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: "Fecha u hora inválida" };
  if (end <= start) return { error: "La hora de fin debe ser posterior a la de inicio" };

  // Check for overlapping blocks
  const overlap = await prisma.scheduleBlock.findFirst({
    where: {
      staffId: data.staffId,
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });
  if (overlap) return { error: "Ya existe un bloqueo en ese rango horario" };

  await prisma.scheduleBlock.create({
    data: {
      staffId: data.staffId,
      startTime: start,
      endTime: end,
      reason: data.reason?.trim() || null,
    },
  });

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function deleteScheduleBlockAction(blockId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  // Verify block belongs to a staff in this business
  const block = await prisma.scheduleBlock.findUnique({
    where: { id: blockId },
    include: { staff: { select: { businessId: true } } },
  });
  if (!block || block.staff.businessId !== business.id) return { error: "Bloqueo no encontrado" };

  await prisma.scheduleBlock.delete({ where: { id: blockId } });
  revalidatePath("/dashboard/staff");
  return { success: true };
}

// â”€â”€â”€ Loyalty / Fidelización Config â”€â”€â”€

export async function saveLoyaltyConfigAction(data: {
  isLoyaltyEnabled: boolean;
  stampsRequired: number;
  rewardName: string;
  discountType: string;
  discountValue: number;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return { error: "Solo el administrador puede configurar la fidelización" };
  }
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const stamps = Math.max(1, Math.min(50, Math.floor(data.stampsRequired)));
  const discountVal = Math.max(0, Math.floor(data.discountValue || 0));

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
    },
  });

  revalidatePath("/dashboard/loyalty");
  return { success: true };
}

// â”€â”€â”€ Business Location â”€â”€â”€
export async function updateBusinessLocationAction(data: { address: string; mapsUrl: string }) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

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

// ─── Deposit / Abono Config ───

export async function saveDepositConfigAction(data: {
  depositRequired: boolean;
  depositAmount: number;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return { error: "Solo el administrador puede configurar los abonos" };
  }
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const amount = Math.max(0, Math.floor(data.depositAmount || 0));

  // If enabling deposits, check that MP is connected
  if (data.depositRequired && !business.mpAccessToken) {
    return { error: "Debes conectar tu cuenta de Mercado Pago antes de activar abonos." };
  }

  await prisma.business.update({
    where: { id: business.id },
    data: {
      depositRequired: data.depositRequired,
      depositAmount: amount,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Disconnect Mercado Pago ───

export async function disconnectMercadoPagoAction() {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return { error: "Solo el administrador puede desconectar Mercado Pago" };
  }
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  await prisma.business.update({
    where: { id: business.id },
    data: {
      mpAccessToken: null,
      mpRefreshToken: null,
      mpUserId: null,
      mpTokenExpiresAt: null,
      depositRequired: false,
      depositAmount: 0,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
