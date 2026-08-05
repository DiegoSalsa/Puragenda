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

vi.mock("@/server/services/widget-design.service", () => {
  class WidgetDraftConflictError extends Error {
    constructor(public readonly currentRevision: number) {
      super("Otra sesión guardó cambios antes que tú.");
      this.name = "WidgetDraftConflictError";
    }
  }
  class WidgetDesignValidationError extends Error {}
  return {
    WidgetDraftConflictError,
    WidgetDesignValidationError,
    createDraftFromLegacy: vi.fn(),
    getWidgetDraftSnapshot: vi.fn(),
    publishWidgetDesign: vi.fn(),
    restoreWidgetVersionToDraft: vi.fn(),
    rollbackWidgetDesign: vi.fn(),
    saveWidgetDraft: vi.fn(),
  };
});

vi.mock("@/server/services/widget-assets.service", () => {
  class WidgetAssetRateLimitError extends Error {
    retryAfterSeconds = 900;
  }
  return {
    WidgetAssetRateLimitError,
    archiveWidgetAsset: vi.fn(),
    uploadWidgetAsset: vi.fn(),
  };
});

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    widgetTheme: { findFirst: vi.fn() },
    widgetDesign: { findUnique: vi.fn() },
  },
}));

import {
  createWidgetStudioDraftAction,
  saveWidgetStudioDraftAction,
} from "@/server/actions/widget-studio.actions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import {
  createDraftFromLegacy,
  getWidgetDraftSnapshot,
  saveWidgetDraft,
  WidgetDraftConflictError,
} from "@/server/services/widget-design.service";

const user = {
  id: "user_1",
  email: "owner@example.com",
  name: "Owner",
  role: "ADMIN" as const,
  isSuperAdmin: false,
  adminAccess: false,
};
const business = {
  id: "business_1",
  slug: "negocio-prueba",
  ownerId: user.id,
};

describe("Widget Studio action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentSessionUser).mockResolvedValue(user);
    vi.mocked(getBusinessForUser).mockResolvedValue(business as never);
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
  });

  it("does not expose draft creation to a user without appearance permission", async () => {
    vi.mocked(hasBusinessPermission).mockResolvedValueOnce(false);

    const result = await createWidgetStudioDraftAction();

    expect(result).toEqual({
      error: "No tienes permisos para editar la apariencia.",
      code: "VALIDATION",
    });
    expect(createDraftFromLegacy).not.toHaveBeenCalled();
  });

  it("scopes draft creation to the current user's business", async () => {
    vi.mocked(createDraftFromLegacy).mockResolvedValueOnce({ id: "design_1" } as never);

    const result = await createWidgetStudioDraftAction();

    expect(result).toEqual({ success: true, designId: "design_1" });
    expect(createDraftFromLegacy).toHaveBeenCalledWith({
      businessId: business.id,
      userId: user.id,
    });
  });

  it("returns the latest server document on an optimistic-lock conflict", async () => {
    const latestDocument = { schemaVersion: 1 };
    vi.mocked(saveWidgetDraft).mockRejectedValueOnce(new WidgetDraftConflictError(8));
    vi.mocked(getWidgetDraftSnapshot).mockResolvedValueOnce({
      revision: 8,
      document: latestDocument,
    } as never);

    const result = await saveWidgetStudioDraftAction({
      document: { schemaVersion: 1 },
      expectedRevision: 7,
    });

    expect(result).toEqual({
      error: "Otra sesión guardó cambios antes que tú.",
      code: "CONFLICT",
      currentRevision: 8,
      currentDocument: latestDocument,
    });
    expect(getWidgetDraftSnapshot).toHaveBeenCalledWith(business.id);
  });
});
