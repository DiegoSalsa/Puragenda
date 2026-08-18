"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { validateBookingDiscountCode } from "@/server/services/booking-discount.service";
import { prisma } from "@/server/db/prisma";

type DiscountFormData = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minSubtotal?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
};

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getAuthorizedBusiness() {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" as const };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" as const };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.MARKETING_MANAGE))) {
    return { error: "No tienes permisos para administrar códigos de descuento" as const };
  }
  return { user, business };
}

export async function createBookingDiscountCodeAction(data: DiscountFormData) {
  const auth = await getAuthorizedBusiness();
  if ("error" in auth) return { error: auth.error };

  const validation = validateBookingDiscountCode(data.code);
  if (validation.error) return { error: validation.error };
  if (!(data.discountType === "PERCENTAGE" || data.discountType === "FIXED")) {
    return { error: "El tipo de descuento no es válido" };
  }

  const discountValue = Math.floor(Number(data.discountValue));
  const minSubtotal = Math.max(0, Math.floor(Number(data.minSubtotal ?? 0)));
  if (!Number.isFinite(discountValue) || discountValue <= 0) return { error: "El valor debe ser mayor que cero" };
  if (data.discountType === "PERCENTAGE" && discountValue > 100) return { error: "El porcentaje no puede superar 100" };
  if (!Number.isFinite(minSubtotal)) return { error: "El mínimo no es válido" };

  const startsAt = parseDate(data.startsAt);
  const expiresAt = parseDate(data.expiresAt);
  if (data.startsAt && startsAt === undefined) return { error: "La fecha de inicio no es válida" };
  if (data.expiresAt && expiresAt === undefined) return { error: "La fecha de término no es válida" };
  if (startsAt && expiresAt && startsAt >= expiresAt) return { error: "La fecha de inicio debe ser anterior al término" };

  try {
    await prisma.bookingDiscountCode.create({
      data: {
        businessId: auth.business.id,
        code: validation.code,
        discountType: data.discountType,
        discountValue,
        minSubtotal,
        startsAt: startsAt ?? null,
        expiresAt: expiresAt ?? null,
        isActive: true,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { error: "Ya existe un código con ese nombre en este negocio" };
    }
    console.error("[booking-discount] create", error);
    return { error: "No se pudo crear el código" };
  }

  revalidatePath("/dashboard/discounts");
  revalidatePath(`/widget/${auth.business.slug}`);
  return { success: true };
}

export async function toggleBookingDiscountCodeAction(id: string, isActive: boolean) {
  const auth = await getAuthorizedBusiness();
  if ("error" in auth) return { error: auth.error };

  const updated = await prisma.bookingDiscountCode.updateMany({
    where: { id, businessId: auth.business.id },
    data: { isActive: Boolean(isActive) },
  });
  if (updated.count === 0) return { error: "Código no encontrado" };

  revalidatePath("/dashboard/discounts");
  revalidatePath(`/widget/${auth.business.slug}`);
  return { success: true };
}

export async function deleteBookingDiscountCodeAction(id: string) {
  const auth = await getAuthorizedBusiness();
  if ("error" in auth) return { error: auth.error };

  const deleted = await prisma.bookingDiscountCode.deleteMany({
    where: { id, businessId: auth.business.id },
  });
  if (deleted.count === 0) return { error: "Código no encontrado" };

  revalidatePath("/dashboard/discounts");
  revalidatePath(`/widget/${auth.business.slug}`);
  return { success: true };
}
