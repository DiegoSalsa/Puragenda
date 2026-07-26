import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    widgetPromoBlock: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/server/db/prisma";
import { resolveWidgetPromotion } from "@/server/services/widget-promotion.service";

describe("resolveWidgetPromotion", () => {
  beforeEach(() => {
    vi.mocked(prisma.widgetPromoBlock.findFirst).mockReset();
  });

  it("scopes promotions to the business and visible blocks", async () => {
    vi.mocked(prisma.widgetPromoBlock.findFirst).mockResolvedValue({
      id: "promo-1",
      title: "Primera reserva",
      discountType: "PERCENTAGE",
      discountValue: 15,
      discountStartsAt: null,
      discountEndsAt: null,
      discountMinSubtotal: 0,
    } as never);

    const result = await resolveWidgetPromotion({
      promotionId: "promo-1",
      businessId: "business-1",
      subtotal: 20_000,
    });

    expect(prisma.widgetPromoBlock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "promo-1",
          businessId: "business-1",
          isVisible: true,
        },
      }),
    );
    expect(result.quote?.discountedTotal).toBe(17_000);
  });

  it("rejects a promotion that cannot be found in that business", async () => {
    vi.mocked(prisma.widgetPromoBlock.findFirst).mockResolvedValue(null);

    const result = await resolveWidgetPromotion({
      promotionId: "promo-other-business",
      businessId: "business-1",
      subtotal: 20_000,
    });

    expect(result).toEqual({
      error: "La promoción seleccionada ya no está disponible",
    });
  });
});
