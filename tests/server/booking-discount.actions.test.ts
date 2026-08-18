import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  business: vi.fn(),
  permission: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: mocks.session }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: mocks.business }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: mocks.permission }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    bookingDiscountCode: {
      create: mocks.create,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
  },
}));

import {
  createBookingDiscountCodeAction,
  deleteBookingDiscountCodeAction,
  toggleBookingDiscountCodeAction,
} from "@/app/dashboard/discounts/actions";

describe("booking discount dashboard actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ id: "user-1" });
    mocks.business.mockResolvedValue({ id: "business-1", slug: "demo" });
    mocks.permission.mockResolvedValue(true);
    mocks.create.mockResolvedValue({ id: "code-1" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("requires the marketing permission before creating", async () => {
    mocks.permission.mockResolvedValue(false);

    const result = await createBookingDiscountCodeAction({
      code: "SUMMER10",
      discountType: "PERCENTAGE",
      discountValue: 10,
    });

    expect(result).toEqual({ error: "No tienes permisos para administrar códigos de descuento" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates normalized, validated business-scoped data", async () => {
    const result = await createBookingDiscountCodeAction({
      code: " summer 10 ",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minSubtotal: 15_000,
      startsAt: "2026-08-20T00:00",
    });

    expect(result).toEqual({ success: true });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: "business-1",
        code: "SUMMER10",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minSubtotal: 15_000,
        isActive: true,
      }),
    });
  });

  it("scopes toggle and delete by the current business", async () => {
    await toggleBookingDiscountCodeAction("code-1", false);
    await deleteBookingDiscountCodeAction("code-1");

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "code-1", businessId: "business-1" },
      data: { isActive: false },
    });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "code-1", businessId: "business-1" } });
  });
});
