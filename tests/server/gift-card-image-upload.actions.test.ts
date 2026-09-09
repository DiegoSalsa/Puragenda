import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: vi.fn() }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn() }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: vi.fn() }));
vi.mock("@/server/lib/cloudinary", () => ({ cloudinary: { uploader: { upload: uploadMock } } }));

import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { uploadGiftCardImageAssetAction } from "@/server/actions/gift-card.actions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

describe("Gift Card image upload action", () => {
  beforeEach(() => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getBusinessForUser).mockResolvedValue({ id: "business-1" } as never);
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
    uploadMock.mockResolvedValue({ secure_url: "https://res.cloudinary.com/demo/image/upload/card.webp" });
  });

  it("uploads a valid dashboard image to the business Cloudinary folder", async () => {
    const formData = new FormData();
    formData.append("image", new File([new Uint8Array([1, 2, 3])], "card.png", { type: "image/png" }));

    await expect(uploadGiftCardImageAssetAction(formData)).resolves.toEqual({
      success: true,
      url: "https://res.cloudinary.com/demo/image/upload/card.webp",
    });
    expect(hasBusinessPermission).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      expect.objectContaining({ id: "business-1" }),
      DASHBOARD_PERMISSIONS.GIFT_CARDS_MANAGE,
    );
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/png;base64,/),
      expect.objectContaining({
        resource_type: "image",
        folder: "puragenda_gift_cards",
        public_id: expect.stringMatching(/^business_business-1_gift_card_/),
        fetch_format: "auto",
        quality: "auto",
      }),
    );
  });

  it("rejects unsupported files before contacting Cloudinary", async () => {
    const formData = new FormData();
    formData.append("image", new File(["not-an-image"], "card.svg", { type: "image/svg+xml" }));

    await expect(uploadGiftCardImageAssetAction(formData)).resolves.toEqual({
      error: "Formato no soportado. Usa PNG, JPG o WebP.",
    });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("requires the Gift Card management permission", async () => {
    vi.mocked(hasBusinessPermission).mockResolvedValue(false);
    const formData = new FormData();
    formData.append("image", new File([new Uint8Array([1])], "card.png", { type: "image/png" }));

    await expect(uploadGiftCardImageAssetAction(formData)).resolves.toEqual({
      error: "No tienes permisos para gestionar Gift Cards",
    });
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
