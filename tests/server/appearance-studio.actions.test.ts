import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/auth/user-session", () => ({
  getCurrentSessionUser: vi.fn(),
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: vi.fn(),
}));

vi.mock("@/server/services/permissions.service", () => ({
  hasBusinessPermission: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    widgetPromoBlock: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/lib/cloudinary", () => ({
  cloudinary: {
    uploader: {
      upload: vi.fn(),
      destroy: vi.fn(),
    },
  },
}));

import {
  createWidgetPromoBlockAction,
  updateWidgetPromoBlockAction,
} from "@/server/actions/appearance-studio.actions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { cloudinary } from "@/server/lib/cloudinary";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

const createdBlock = {
  id: "promo-1",
  title: "Promoción de invierno",
  subtitle: "Solo durante julio",
  imageUrl: "https://res.cloudinary.com/demo/image/upload/promo.jpg",
  linkUrl: null,
  placement: "HEADER" as const,
  position: 0,
  isVisible: true,
  textAlign: "center",
  discountType: null,
  discountValue: null,
  discountStartsAt: null,
  discountEndsAt: null,
  discountMinSubtotal: 0,
};

function promoFormData() {
  const formData = new FormData();
  formData.set("title", createdBlock.title);
  formData.set("subtitle", createdBlock.subtitle);
  formData.set("placement", createdBlock.placement);
  formData.set("textAlign", createdBlock.textAlign);
  formData.set("image", new File(["image-bytes"], "promo.webp", { type: "image/webp" }));
  return formData;
}

describe("createWidgetPromoBlockAction", () => {
  beforeEach(() => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue({
      id: "user-1",
      email: "owner@example.com",
      name: "Owner",
      role: "ADMIN",
      isSuperAdmin: false,
      tokenVersion: 1,
      adminAccess: false,
    });
    vi.mocked(getBusinessForUser).mockResolvedValue({
      id: "business-1",
      slug: "business-one",
      ownerId: "user-1",
    } as never);
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
    vi.mocked(cloudinary.uploader.upload).mockResolvedValue({
      secure_url: createdBlock.imageUrl,
      public_id: "puragenda_widget_promos/promo-1",
    } as never);
    vi.mocked(prisma.widgetPromoBlock.count).mockResolvedValue(0);
    vi.mocked(prisma.widgetPromoBlock.create).mockResolvedValue(createdBlock as never);
    vi.mocked(prisma.widgetPromoBlock.findMany).mockResolvedValue([createdBlock] as never);
  });

  it("returns the created block so the editor can show it immediately", async () => {
    const result = await createWidgetPromoBlockAction(promoFormData());

    expect(result).toEqual({ success: true, block: createdBlock, blocks: [createdBlock] });
    expect(prisma.widgetPromoBlock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: createdBlock.imageUrl,
          cloudinaryPublicId: "puragenda_widget_promos/promo-1",
          textAlign: "center",
        }),
      }),
    );
  });

  it("removes the Cloudinary asset if saving the database row fails", async () => {
    vi.mocked(prisma.widgetPromoBlock.create).mockRejectedValueOnce(new Error("database error"));

    const result = await createWidgetPromoBlockAction(promoFormData());

    expect(result).toEqual({ error: "No se pudo subir la imagen promocional" });
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      "puragenda_widget_promos/promo-1",
      { resource_type: "image" },
    );
  });
});

describe("updateWidgetPromoBlockAction", () => {
  beforeEach(() => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue({
      id: "user-1",
      email: "owner@example.com",
      name: "Owner",
      role: "ADMIN",
      isSuperAdmin: false,
      tokenVersion: 1,
      adminAccess: false,
    });
    vi.mocked(getBusinessForUser).mockResolvedValue({
      id: "business-1",
      slug: "business-one",
      ownerId: "user-1",
    } as never);
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
    vi.mocked(prisma.widgetPromoBlock.findFirst).mockResolvedValue({
      ...createdBlock,
      placement: "FOOTER",
    } as never);
    vi.mocked(prisma.widgetPromoBlock.findMany)
      .mockResolvedValueOnce([{ id: "promo-1", placement: "FOOTER" }] as never)
      .mockResolvedValueOnce([{ ...createdBlock, placement: "BETWEEN_SERVICES" }] as never);
    vi.mocked(prisma.widgetPromoBlock.update).mockResolvedValue(createdBlock as never);
    const transactionMock = prisma.$transaction as unknown as {
      mockImplementation: (
        implementation: (callback: (tx: typeof prisma) => Promise<unknown>) => Promise<unknown>,
      ) => void;
    };
    transactionMock.mockImplementation((callback) => callback(prisma));
  });

  it("moves a lone block to the previous widget zone when pressing up", async () => {
    const result = await updateWidgetPromoBlockAction("promo-1", { direction: "up" });

    expect(prisma.widgetPromoBlock.update).toHaveBeenCalledWith({
      where: { id: "promo-1" },
      data: { placement: "BETWEEN_SERVICES", position: 0 },
    });
    expect(result).toEqual({
      success: true,
      blocks: [{ ...createdBlock, placement: "BETWEEN_SERVICES" }],
    });
  });
});
