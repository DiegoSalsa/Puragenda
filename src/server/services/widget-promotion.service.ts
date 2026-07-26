import { prisma } from "@/server/db/prisma";
import { calculateWidgetPromotion } from "@/core/widget-promotion";

export async function resolveWidgetPromotion(params: {
  promotionId?: string;
  businessId: string;
  subtotal: number;
  now?: Date;
}) {
  if (!params.promotionId) return { promotion: null, quote: null };

  const promotion = await prisma.widgetPromoBlock.findFirst({
    where: {
      id: params.promotionId,
      businessId: params.businessId,
      isVisible: true,
    },
    select: {
      id: true,
      title: true,
      discountType: true,
      discountValue: true,
      discountStartsAt: true,
      discountEndsAt: true,
      discountMinSubtotal: true,
    },
  });

  if (!promotion) return { error: "La promoción seleccionada ya no está disponible" };

  const result = calculateWidgetPromotion({
    subtotal: params.subtotal,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    discountStartsAt: promotion.discountStartsAt,
    discountEndsAt: promotion.discountEndsAt,
    discountMinSubtotal: promotion.discountMinSubtotal,
    now: params.now,
  });

  if (!result.quote) return { error: result.error || "La promoción no se puede aplicar" };
  return { promotion, quote: result.quote };
}
