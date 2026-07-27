import crypto from "crypto";
import {
  Prisma,
  WidgetAssetStatus,
  WidgetAssetUsage,
  WidgetDesignEventType,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  extractWidgetAssetReferences,
  parseWidgetDesignDocument,
  type WidgetAssetReferenceInput,
  type WidgetDesignDocument,
} from "@/core/widget-studio/schema";
import { createLegacyWidgetDocument } from "@/core/widget-studio/legacy-adapter";

export class WidgetDraftConflictError extends Error {
  constructor(public readonly currentRevision: number) {
    super("Otra sesión guardó cambios antes que tú.");
    this.name = "WidgetDraftConflictError";
  }
}

export class WidgetDesignValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WidgetDesignValidationError";
  }
}

function toJson(document: WidgetDesignDocument): Prisma.InputJsonValue {
  return document as unknown as Prisma.InputJsonValue;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
}

export function checksumWidgetDocument(document: WidgetDesignDocument) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(document)))
    .digest("hex");
}

export async function createDraftFromLegacy(input: {
  businessId: string;
  userId: string;
}) {
  const existing = await prisma.widgetDesign.findUnique({
    where: { businessId: input.businessId },
  });
  if (existing) return existing;

  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    include: {
      widgetPromoBlocks: {
        orderBy: [{ placement: "asc" }, { position: "asc" }],
      },
    },
  });
  if (!business) throw new WidgetDesignValidationError("El negocio no existe.");

  const document = parseWidgetDesignDocument(
    createLegacyWidgetDocument(business, business.widgetPromoBlocks),
  );

  return prisma.$transaction(async (tx) => {
    const design = await tx.widgetDesign.create({
      data: {
        businessId: input.businessId,
        draftDocument: toJson(document),
        draftSchemaVersion: document.schemaVersion,
      },
    });
    await tx.widgetDesignEvent.create({
      data: {
        businessId: input.businessId,
        designId: design.id,
        actorUserId: input.userId,
        type: WidgetDesignEventType.DRAFT_CREATED,
        metadata: { source: "legacy" },
      },
    });
    return design;
  });
}

export async function getWidgetEditorState(businessId: string) {
  const design = await prisma.widgetDesign.findUnique({
    where: { businessId },
    include: {
      publishedVersion: {
        select: {
          id: true,
          versionNumber: true,
          checksum: true,
          changeSummary: true,
          createdAt: true,
        },
      },
      fallbackVersion: {
        select: {
          id: true,
          versionNumber: true,
          createdAt: true,
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 20,
        include: {
          publishedBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!design) return null;
  const document = parseWidgetDesignDocument(design.draftDocument);
  const assets = await prisma.widgetAsset.findMany({
    where: {
      businessId,
      status: { in: [WidgetAssetStatus.READY, WidgetAssetStatus.PROCESSING] },
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      publicId: true,
      provider: true,
      mimeType: true,
      byteSize: true,
      width: true,
      height: true,
      altDefault: true,
      status: true,
      createdAt: true,
    },
  });

  return { ...design, draftDocument: document, assets };
}

async function validateOwnedAssets(
  tx: Prisma.TransactionClient,
  businessId: string,
  references: WidgetAssetReferenceInput[],
) {
  const ids = [...new Set(references.map((reference) => reference.assetId))];
  if (!ids.length) return;
  const assets = await tx.widgetAsset.findMany({
    where: {
      id: { in: ids },
      businessId,
      status: WidgetAssetStatus.READY,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (assets.length !== ids.length) {
    throw new WidgetDesignValidationError(
      "El diseño contiene una imagen no disponible o perteneciente a otro negocio.",
    );
  }
}

function mapAssetReferences(
  references: WidgetAssetReferenceInput[],
  owner: { designId: string } | { versionId: string },
) {
  return references.map((reference) => ({
    assetId: reference.assetId,
    blockId: reference.blockId,
    usage: reference.usage as WidgetAssetUsage,
    ...owner,
  }));
}

export async function saveWidgetDraft(input: {
  businessId: string;
  userId: string;
  document: unknown;
  expectedRevision: number;
}) {
  let document: WidgetDesignDocument;
  try {
    document = parseWidgetDesignDocument(input.document);
  } catch (error) {
    throw new WidgetDesignValidationError(
      error instanceof Error ? error.message : "El documento no es válido.",
    );
  }
  const references = extractWidgetAssetReferences(document);

  return prisma.$transaction(async (tx) => {
    const design = await tx.widgetDesign.findUnique({
      where: { businessId: input.businessId },
      select: { id: true, draftRevision: true },
    });
    if (!design) throw new WidgetDesignValidationError("Primero crea el borrador.");
    if (design.draftRevision !== input.expectedRevision) {
      throw new WidgetDraftConflictError(design.draftRevision);
    }
    await validateOwnedAssets(tx, input.businessId, references);

    const updated = await tx.widgetDesign.updateMany({
      where: {
        id: design.id,
        draftRevision: input.expectedRevision,
      },
      data: {
        draftDocument: toJson(document),
        draftSchemaVersion: document.schemaVersion,
        draftRevision: { increment: 1 },
      },
    });
    if (!updated.count) {
      const current = await tx.widgetDesign.findUniqueOrThrow({
        where: { id: design.id },
        select: { draftRevision: true },
      });
      throw new WidgetDraftConflictError(current.draftRevision);
    }

    await tx.widgetAssetReference.deleteMany({ where: { designId: design.id } });
    if (references.length) {
      await tx.widgetAssetReference.createMany({
        data: mapAssetReferences(references, { designId: design.id }),
      });
    }
    await tx.widgetDesignEvent.create({
      data: {
        businessId: input.businessId,
        designId: design.id,
        actorUserId: input.userId,
        type: WidgetDesignEventType.DRAFT_SAVED,
        metadata: { revision: input.expectedRevision + 1 },
      },
    });
    return {
      document,
      revision: input.expectedRevision + 1,
      savedAt: new Date().toISOString(),
    };
  });
}

export async function getWidgetDraftSnapshot(businessId: string) {
  const design = await prisma.widgetDesign.findUnique({
    where: { businessId },
    select: {
      draftDocument: true,
      draftRevision: true,
    },
  });
  if (!design) throw new WidgetDesignValidationError("Primero crea el borrador.");
  return {
    document: parseWidgetDesignDocument(design.draftDocument),
    revision: design.draftRevision,
  };
}

export async function publishWidgetDesign(input: {
  businessId: string;
  userId: string;
  expectedRevision: number;
  summary?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const design = await tx.widgetDesign.findUnique({
      where: { businessId: input.businessId },
      include: { publishedVersion: true },
    });
    if (!design) throw new WidgetDesignValidationError("Primero crea el borrador.");
    if (design.draftRevision !== input.expectedRevision) {
      throw new WidgetDraftConflictError(design.draftRevision);
    }
    const document = parseWidgetDesignDocument(design.draftDocument);
    const references = extractWidgetAssetReferences(document);
    await validateOwnedAssets(tx, input.businessId, references);

    const latest = await tx.widgetDesignVersion.aggregate({
      where: { designId: design.id },
      _max: { versionNumber: true },
    });
    const versionNumber = (latest._max.versionNumber || 0) + 1;
    const checksum = checksumWidgetDocument(document);
    const version = await tx.widgetDesignVersion.create({
      data: {
        designId: design.id,
        versionNumber,
        schemaVersion: document.schemaVersion,
        document: toJson(document),
        checksum,
        publishedByUserId: input.userId,
        changeSummary: input.summary?.trim().slice(0, 240) || null,
      },
    });
    if (references.length) {
      await tx.widgetAssetReference.createMany({
        data: mapAssetReferences(references, { versionId: version.id }),
      });
    }
    await tx.widgetDesign.update({
      where: { id: design.id },
      data: {
        fallbackVersionId: design.publishedVersionId,
        publishedVersionId: version.id,
        rendererEnabled: true,
      },
    });
    await tx.widgetDesignEvent.create({
      data: {
        businessId: input.businessId,
        designId: design.id,
        actorUserId: input.userId,
        type: WidgetDesignEventType.DESIGN_PUBLISHED,
        metadata: { versionId: version.id, versionNumber, checksum },
      },
    });
    return { versionId: version.id, versionNumber, checksum };
  });
}

export async function restoreWidgetVersionToDraft(input: {
  businessId: string;
  userId: string;
  versionId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.widgetDesignVersion.findFirst({
      where: {
        id: input.versionId,
        design: { businessId: input.businessId },
      },
      include: { design: true },
    });
    if (!version) throw new WidgetDesignValidationError("Versión no encontrada.");
    const document = parseWidgetDesignDocument(version.document);
    const references = extractWidgetAssetReferences(document);
    await validateOwnedAssets(tx, input.businessId, references);

    const updated = await tx.widgetDesign.update({
      where: { id: version.designId },
      data: {
        draftDocument: toJson(document),
        draftSchemaVersion: document.schemaVersion,
        draftRevision: { increment: 1 },
      },
    });
    await tx.widgetAssetReference.deleteMany({ where: { designId: version.designId } });
    if (references.length) {
      await tx.widgetAssetReference.createMany({
        data: mapAssetReferences(references, { designId: version.designId }),
      });
    }
    await tx.widgetDesignEvent.create({
      data: {
        businessId: input.businessId,
        designId: version.designId,
        actorUserId: input.userId,
        type: WidgetDesignEventType.VERSION_RESTORED,
        metadata: { versionId: version.id, versionNumber: version.versionNumber },
      },
    });
    return { revision: updated.draftRevision, document };
  });
}

export async function rollbackWidgetDesign(input: {
  businessId: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const design = await tx.widgetDesign.findUnique({
      where: { businessId: input.businessId },
    });
    if (!design?.publishedVersionId || !design.fallbackVersionId) {
      throw new WidgetDesignValidationError("No existe una versión de respaldo.");
    }
    await tx.widgetDesign.update({
      where: { id: design.id },
      data: {
        publishedVersionId: design.fallbackVersionId,
        fallbackVersionId: design.publishedVersionId,
        rendererEnabled: true,
      },
    });
    await tx.widgetDesignEvent.create({
      data: {
        businessId: input.businessId,
        designId: design.id,
        actorUserId: input.userId,
        type: WidgetDesignEventType.VERSION_ROLLED_BACK,
        metadata: {
          fromVersionId: design.publishedVersionId,
          toVersionId: design.fallbackVersionId,
        },
      },
    });
    return { success: true };
  });
}

export async function resolvePublishedWidgetDesign(businessId: string) {
  const killSwitch = process.env.WIDGET_STUDIO_V2_RENDERER === "off";
  if (killSwitch) return null;

  const design = await prisma.widgetDesign.findUnique({
    where: { businessId },
    include: {
      publishedVersion: true,
      fallbackVersion: true,
    },
  });
  if (!design?.rendererEnabled || !design.publishedVersion) return null;

  const tryParse = (value: unknown) => {
    try {
      return parseWidgetDesignDocument(value);
    } catch {
      return null;
    }
  };
  const published = tryParse(design.publishedVersion.document);
  if (published) {
    return {
      document: published,
      versionId: design.publishedVersion.id,
      versionNumber: design.publishedVersion.versionNumber,
      usedFallback: false,
    };
  }
  const fallback = design.fallbackVersion ? tryParse(design.fallbackVersion.document) : null;
  if (!fallback) return null;

  await prisma.widgetDesignEvent.create({
    data: {
      businessId,
      designId: design.id,
      type: WidgetDesignEventType.RENDER_FALLBACK,
      metadata: {
        failedVersionId: design.publishedVersion.id,
        fallbackVersionId: design.fallbackVersion?.id,
      },
    },
  }).catch(() => undefined);
  return {
    document: fallback,
    versionId: design.fallbackVersion!.id,
    versionNumber: design.fallbackVersion!.versionNumber,
    usedFallback: true,
  };
}

export async function resolveWidgetAssets(
  businessId: string,
  document: WidgetDesignDocument,
) {
  const ids = [...new Set(extractWidgetAssetReferences(document).map((reference) => reference.assetId))];
  if (!ids.length) return {};
  const assets = await prisma.widgetAsset.findMany({
    where: {
      id: { in: ids },
      businessId,
      status: WidgetAssetStatus.READY,
      deletedAt: null,
    },
    select: { id: true, url: true, width: true, height: true, altDefault: true },
  });
  return Object.fromEntries(assets.map((asset) => [asset.id, asset]));
}
