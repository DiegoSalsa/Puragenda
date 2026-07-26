export type WidgetDiscountType = "PERCENTAGE" | "FIXED";

export type WidgetPromotionInput = {
  subtotal: number;
  discountType: string | null;
  discountValue: number | null;
  discountMinSubtotal?: number | null;
  discountStartsAt?: Date | string | null;
  discountEndsAt?: Date | string | null;
  now?: Date;
};

export type WidgetPromotionQuote = {
  originalTotal: number;
  discountAmount: number;
  discountedTotal: number;
};

function toValidDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateWidgetPromotion(
  input: WidgetPromotionInput,
): { quote?: WidgetPromotionQuote; error?: string } {
  const subtotal = Math.max(0, Math.round(input.subtotal));
  const value = Math.floor(Number(input.discountValue ?? 0));
  const minSubtotal = Math.max(0, Math.floor(Number(input.discountMinSubtotal ?? 0)));
  const now = input.now ?? new Date();
  const startsAt = toValidDate(input.discountStartsAt);
  const endsAt = toValidDate(input.discountEndsAt);

  if (input.discountType !== "PERCENTAGE" && input.discountType !== "FIXED") {
    return { error: "La promoción no tiene un descuento válido" };
  }
  if (value <= 0 || (input.discountType === "PERCENTAGE" && value > 100)) {
    return { error: "El valor del descuento no es válido" };
  }
  if (startsAt && now < startsAt) return { error: "La promoción todavía no comienza" };
  if (endsAt && now > endsAt) return { error: "La promoción ya finalizó" };
  if (subtotal < minSubtotal) {
    return { error: `Esta promoción requiere un mínimo de ${minSubtotal}` };
  }

  const discountAmount =
    input.discountType === "PERCENTAGE"
      ? Math.min(subtotal, Math.round(subtotal * value / 100))
      : Math.min(subtotal, value);

  return {
    quote: {
      originalTotal: subtotal,
      discountAmount,
      discountedTotal: Math.max(0, subtotal - discountAmount),
    },
  };
}
