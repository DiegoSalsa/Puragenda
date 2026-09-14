import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const businessFindUnique = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() => vi.fn(() => { throw new Error("NOT_FOUND"); }));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/server/db/prisma", () => ({
  prisma: { business: { findUnique: businessFindUnique } },
}));

import GiftCardsStorePage from "@/app/widget/[slug]/gift-cards/page";

describe("public Gift Card storefront subscription access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not display purchasable cards for an expired trial", async () => {
    businessFindUnique.mockResolvedValue({
      subscription: {
        status: "TRIALING",
        isTrial: true,
        trialEndsAt: new Date("2026-09-14T11:59:59.999Z"),
        gracePeriodEndsAt: null,
      },
    });

    const page = await GiftCardsStorePage({
      params: Promise.resolve({ slug: "expired-business" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("no están disponibles temporalmente");
    expect(html).not.toContain("Comprar");
    expect(notFound).not.toHaveBeenCalled();
  });
});
