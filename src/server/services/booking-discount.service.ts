import { prisma } from "@/server/db/prisma";

export type BookingDiscountType = "PERCENTAGE" | "FIXED";

export type BookingDiscountQuote = {
  codeId: string;
  code: string;
  discountType: BookingDiscountType;
  discountValue: number;
  originalTotal: number;
  discountAmount: number;
  discountedTotal: number;
};

export function normalizeBookingDiscountCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function validateBookingDiscountCode(value: string) {
  const normalized = normalizeBookingDiscountCode(value);
  if (!/^[A-Z0-9](?:[A-Z0-9_-]{0,48}[A-Z0-9])?$/.test(normalized)) {
    return { code: normalized, error: "El código debe tener entre 1 y 50 caracteres alfanuméricos, guiones o guiones bajos" };
  }
  return { code: normalized };
}

export function calculateBookingDiscount(params: {
  subtotal: number;
  discountType: BookingDiscountType | string;
  discountValue: number;
  minSubtotal?: number;
  startsAt?: Date | string | null;
  expiresAt?: Date | string | null;
  now?: Date;
}): { quote?: Omit<BookingDiscountQuote, "codeId" | "code">; error?: string } {
  const subtotal = Math.max(0, Math.round(params.subtotal));
  const value = Math.floor(Number(params.discountValue));
  const minSubtotal = Math.max(0, Math.floor(Number(params.minSubtotal ?? 0)));
  const now = params.now ?? new Date();
  const startsAt = params.startsAt ? new Date(params.startsAt) : null;
  const expiresAt = params.expiresAt ? new Date(params.expiresAt) : null;

  if (params.discountType !== "PERCENTAGE" && params.discountType !== "FIXED") {
    return { error: "El código no tiene un tipo de descuento válido" };
  }
  if (value <= 0 || (params.discountType === "PERCENTAGE" && value > 100)) {
    return { error: "El valor del descuento no es válido" };
  }
  if (startsAt && Number.isNaN(startsAt.getTime())) return { error: "La fecha de inicio no es válida" };
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: "La fecha de término no es válida" };
  if (startsAt && expiresAt && startsAt >= expiresAt) return { error: "La fecha de inicio debe ser anterior al término" };
  if (startsAt && now < startsAt) return { error: "Este código todavía no está activo" };
  if (expiresAt && now > expiresAt) return { error: "Este código ya expiró" };
  if (subtotal < minSubtotal) return { error: `Este código requiere un mínimo de ${minSubtotal}` };

  const discountAmount = params.discountType === "PERCENTAGE"
    ? Math.min(subtotal, Math.round(subtotal * value / 100))
    : Math.min(subtotal, value);

  return {
    quote: {
      discountType: params.discountType,
      discountValue: value,
      originalTotal: subtotal,
      discountAmount,
      discountedTotal: Math.max(0, subtotal - discountAmount),
    },
  };
}

export async function resolveBookingDiscount(params: {
  code?: string;
  businessId: string;
  subtotal: number;
  now?: Date;
}) {
  if (!params.code) return { discount: null, quote: null };

  const validated = validateBookingDiscountCode(params.code);
  if (validated.error) return { error: validated.error };

  const discount = await prisma.bookingDiscountCode.findFirst({
    where: {
      businessId: params.businessId,
      code: validated.code,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      minSubtotal: true,
      startsAt: true,
      expiresAt: true,
    },
  });

  if (!discount) return { error: "El código de descuento no está disponible" };

  const result = calculateBookingDiscount({ ...discount, subtotal: params.subtotal, now: params.now });
  if (!result.quote) return { error: result.error || "El código no se puede aplicar" };

  return {
    discount,
    quote: {
      ...result.quote,
      codeId: discount.id,
      code: discount.code,
    },
  };
}
