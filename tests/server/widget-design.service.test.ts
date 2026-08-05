import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    business: { findUnique: vi.fn() },
    widgetDesign: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    widgetDesignVersion: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    widgetDesignEvent: { create: vi.fn() },
    widgetAsset: { findMany: vi.fn() },
    widgetAssetReference: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma };
});

import { prisma } from "@/server/db/prisma";
import { createLegacyWidgetDocument } from "@/core/widget-studio/legacy-adapter";
import {
  createDraftFromLegacy,
  getWidgetEditorState,
  publishWidgetDesign,
  resolveWidgetAssets,
  resolvePublishedWidgetDesign,
  rollbackWidgetDesign,
  saveWidgetDraft,
  WidgetDraftConflictError,
} from "@/server/services/widget-design.service";

const business = {
  id: "business_1",
  name: "Negocio de prueba",
  primaryColor: "#7C3AED",
  secondaryColor: "#5B21B6",
  backgroundColor: "#FFFFFF",
  textColor: "#111111",
  textMutedColor: "#666666",
  widgetFontSize: 14,
  widgetCornerRadius: 16,
  widgetShadowStyle: "soft",
  widgetHeaderAlign: "left",
  widgetPromoBlocks: [{
    id: "promo_1",
    title: "Promoción",
    subtitle: null,
    imageUrl: "/uploads/promo.webp",
    linkUrl: null,
    placement: "HEADER" as const,
    position: 0,
    isVisible: true,
    textAlign: "left",
  }],
};

const document = createLegacyWidgetDocument(business, business.widgetPromoBlocks);
const transaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

describe("Widget design service critical lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    vi.mocked(prisma.widgetAsset.findMany).mockResolvedValue([]);
    vi.mocked(prisma.widgetAssetReference.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.widgetDesignEvent.create).mockResolvedValue({ id: "event_1" } as never);
  });

  it("creates a legacy-compatible draft without mutating the legacy business data", async () => {
    vi.mocked(prisma.widgetDesign.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.business.findUnique).mockResolvedValueOnce(business as never);
    vi.mocked(prisma.widgetDesign.create).mockResolvedValueOnce(({
      id: "design_1",
    }) as never);

    const result = await createDraftFromLegacy({ businessId: business.id, userId: "user_1" });

    expect(result.id).toBe("design_1");
    expect(prisma.widgetDesign.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: business.id,
        draftSchemaVersion: 1,
        draftDocument: expect.objectContaining({
          globalSlots: expect.objectContaining({
            afterHeader: expect.any(Array),
          }),
        }),
      }),
    });
    expect(business.widgetPromoBlocks[0].imageUrl).toBe("/uploads/promo.webp");
  });

  it("rejects a stale save before overwriting another session", async () => {
    vi.mocked(prisma.widgetDesign.findUnique).mockResolvedValueOnce({
      id: "design_1",
      draftRevision: 4,
    } as never);

    await expect(saveWidgetDraft({
      businessId: business.id,
      userId: "user_1",
      document,
      expectedRevision: 3,
    })).rejects.toEqual(expect.objectContaining<Partial<WidgetDraftConflictError>>({
      name: "WidgetDraftConflictError",
      currentRevision: 4,
    }));
    expect(prisma.widgetDesign.updateMany).not.toHaveBeenCalled();
  });

  it("returns a human-readable field error instead of raw schema details", async () => {
    const invalidDocument = structuredClone(document);
    invalidDocument.tokens.colors.primary = "#BAD";

    await expect(saveWidgetDraft({
      businessId: business.id,
      userId: "user_1",
      document: invalidDocument,
      expectedRevision: 3,
    })).rejects.toThrow("Revisa «Color principal»: usa un hexadecimal completo, por ejemplo #7C3AED.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("saves a valid draft with optimistic locking and an audit event", async () => {
    vi.mocked(prisma.widgetDesign.findUnique).mockResolvedValueOnce({
      id: "design_1",
      draftRevision: 3,
    } as never);
    vi.mocked(prisma.widgetDesign.updateMany).mockResolvedValueOnce({ count: 1 });

    const result = await saveWidgetDraft({
      businessId: business.id,
      userId: "user_1",
      document,
      expectedRevision: 3,
    });

    expect(result.revision).toBe(4);
    expect(prisma.widgetDesign.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "design_1", draftRevision: 3 },
      data: expect.objectContaining({ draftRevision: { increment: 1 } }),
    }));
    expect(prisma.widgetDesignEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "DRAFT_SAVED" }),
    });
  });

  it("publishes an immutable version and retains the prior version as fallback", async () => {
    vi.mocked(prisma.widgetDesign.findUnique).mockResolvedValueOnce({
      id: "design_1",
      businessId: business.id,
      draftRevision: 5,
      draftDocument: document,
      publishedVersionId: "version_old",
      publishedVersion: { id: "version_old" },
    } as never);
    vi.mocked(prisma.widgetDesignVersion.aggregate).mockResolvedValueOnce({
      _max: { versionNumber: 2 },
    } as never);
    vi.mocked(prisma.widgetDesignVersion.create).mockResolvedValueOnce({
      id: "version_3",
      versionNumber: 3,
    } as never);

    const result = await publishWidgetDesign({
      businessId: business.id,
      userId: "user_1",
      expectedRevision: 5,
      summary: "Publicación estable",
    });

    expect(result.versionNumber).toBe(3);
    expect(result.idempotent).toBe(false);
    expect(prisma.widgetDesign.update).toHaveBeenCalledWith({
      where: { id: "design_1" },
      data: {
        fallbackVersionId: "version_old",
        publishedVersionId: "version_3",
        rendererEnabled: true,
      },
    });
  });

  it("returns the published version on a retried identical publication", async () => {
    const { checksumWidgetDocument } = await import("@/server/services/widget-design.service");
    const checksum = checksumWidgetDocument(document);
    vi.mocked(prisma.widgetDesign.findUnique).mockResolvedValueOnce({
      id: "design_1",
      businessId: business.id,
      draftRevision: 5,
      draftDocument: document,
      publishedVersionId: "version_3",
      publishedVersion: {
        id: "version_3",
        versionNumber: 3,
        checksum,
      },
    } as never);

    const result = await publishWidgetDesign({
      businessId: business.id,
      userId: "user_1",
      expectedRevision: 5,
    });

    expect(result).toEqual({
      versionId: "version_3",
      versionNumber: 3,
      checksum,
      idempotent: true,
    });
    expect(prisma.widgetDesignVersion.create).not.toHaveBeenCalled();
    expect(prisma.widgetDesign.update).not.toHaveBeenCalled();
  });

  it("falls back to the last valid version if the published document is corrupt", async () => {
    vi.mocked(prisma.widgetDesign.findUnique).mockResolvedValueOnce({
      id: "design_1",
      rendererEnabled: true,
      publishedVersion: {
        id: "version_bad",
        versionNumber: 4,
        document: { invalid: true },
      },
      fallbackVersion: {
        id: "version_good",
        versionNumber: 3,
        document,
      },
    } as never);

    const result = await resolvePublishedWidgetDesign(business.id);

    expect(result).toEqual(expect.objectContaining({
      versionId: "version_good",
      versionNumber: 3,
      usedFallback: true,
    }));
    expect(prisma.widgetDesignEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "RENDER_FALLBACK" }),
    });
  });

  it("does not expose a local asset whose physical file is missing", async () => {
    vi.mocked(prisma.widgetAsset.findMany).mockResolvedValueOnce([{
      id: "asset_missing",
      url: "/uploads/widget-assets/business_1/missing.png",
      width: 1200,
      height: 800,
      altDefault: "Promoción",
      provider: "local",
      publicId: "../../missing.png",
    }] as never);
    const documentWithMissingAsset = structuredClone(document);
    documentWithMissingAsset.globalSlots.afterHeader.push({
      id: "section_missing",
      type: "section",
      name: "Imagen ausente",
      hidden: false,
      locked: false,
      layout: "stack",
      columns: "1",
      align: "stretch",
      gap: 16,
      padding: 16,
      minHeight: 0,
      backgroundColor: "transparent",
      backgroundFit: "cover",
      backgroundFocalPoint: { x: 50, y: 50 },
      overlayColor: "#000000",
      overlayOpacity: 0,
      radius: 0,
      visibility: { mobile: true, tablet: true, desktop: true },
      children: [{
        id: "image_missing",
        type: "image",
        name: "Imagen",
        hidden: false,
        locked: false,
        visibility: { mobile: true, tablet: true, desktop: true },
        assetId: "asset_missing",
        alt: "Promoción",
        decorative: false,
        caption: "",
        linkUrl: "",
        mode: "flow",
        presentation: {
          fit: "cover",
          aspectRatio: "16:9",
          focalPoint: { x: 50, y: 50 },
          width: 100,
          radius: 16,
          opacity: 1,
        },
        overlay: { x: 10, y: 10, width: 36, zIndex: 2, mobileFallback: "flow" },
      }],
    });

    await expect(resolveWidgetAssets(business.id, documentWithMissingAsset)).resolves.toEqual({});
  });

  it("returns an editable recovery placeholder when a draft asset is unavailable", async () => {
    const documentWithMissingAsset = structuredClone(document);
    documentWithMissingAsset.globalSlots.afterHeader.push({
      id: "section_recovery",
      type: "section",
      name: "Imagen recuperable",
      hidden: false,
      locked: false,
      layout: "stack",
      columns: "1",
      align: "stretch",
      gap: 16,
      padding: 16,
      minHeight: 0,
      backgroundColor: "transparent",
      backgroundFit: "cover",
      backgroundFocalPoint: { x: 50, y: 50 },
      overlayColor: "#000000",
      overlayOpacity: 0,
      radius: 0,
      visibility: { mobile: true, tablet: true, desktop: true },
      children: [{
        id: "image_recovery",
        type: "image",
        name: "Imagen",
        hidden: false,
        locked: false,
        visibility: { mobile: true, tablet: true, desktop: true },
        assetId: "asset_missing",
        alt: "Promoción",
        decorative: false,
        caption: "Conservar este bloque",
        linkUrl: "",
        mode: "overlay",
        presentation: {
          fit: "cover",
          aspectRatio: "16:9",
          focalPoint: { x: 50, y: 50 },
          width: 72,
          radius: 16,
          opacity: 1,
        },
        overlay: { x: 14, y: 20, width: 44, zIndex: 3, mobileFallback: "flow" },
      }],
    });
    vi.mocked(prisma.widgetDesign.findUnique).mockResolvedValueOnce({
      id: "design_1",
      businessId: business.id,
      draftDocument: documentWithMissingAsset,
      draftRevision: 7,
      rendererEnabled: false,
      publishedVersion: null,
      fallbackVersion: null,
      versions: [],
    } as never);

    const result = await getWidgetEditorState(business.id);
    const recovered = result?.draftDocument.globalSlots.afterHeader.at(-1)?.children[0];

    expect(prisma.widgetAsset.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "READY" }),
    }));
    expect(result?.assetRepairCount).toBe(1);
    expect(result?.repairedImageBlockIds).toEqual(["image_recovery"]);
    expect(recovered).toEqual(expect.objectContaining({
      id: "image_recovery",
      caption: "Conservar este bloque",
      presentation: expect.objectContaining({ width: 72 }),
      overlay: expect.objectContaining({ x: 14, y: 20, width: 44 }),
    }));
    if (recovered?.type !== "image") throw new Error("Imagen recuperada ausente");
    expect(recovered.assetId).toBeUndefined();
  });

  it("swaps published and fallback versions during rollback", async () => {
    vi.mocked(prisma.widgetDesign.findUnique).mockResolvedValueOnce({
      id: "design_1",
      publishedVersionId: "version_4",
      fallbackVersionId: "version_3",
    } as never);

    await rollbackWidgetDesign({ businessId: business.id, userId: "user_1" });

    expect(prisma.widgetDesign.update).toHaveBeenCalledWith({
      where: { id: "design_1" },
      data: {
        publishedVersionId: "version_3",
        fallbackVersionId: "version_4",
        rendererEnabled: true,
      },
    });
  });
});
