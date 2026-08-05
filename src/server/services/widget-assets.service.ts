import crypto from "crypto";
import path from "path";
import { access, mkdir, unlink, writeFile } from "fs/promises";
import sharp from "sharp";
import { WidgetAssetStatus, WidgetDesignEventType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const MAX_ASSET_DIMENSION = 6000;
const MAX_ASSET_PIXELS = 24_000_000;
const MAX_ACTIVE_ASSETS_PER_BUSINESS = 100;
const MAX_ACTIVE_ASSET_BYTES_PER_BUSINESS = 250 * 1024 * 1024;
const MAX_UPLOADS_PER_WINDOW = 20;
const UPLOAD_WINDOW_MS = 15 * 60 * 1000;
const ORPHAN_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CLEANUP_BATCH_SIZE = 100;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const LOCAL_ASSET_ROOT = path.resolve(process.cwd(), "public", "uploads", "widget-assets");

export class WidgetAssetRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Has subido muchas imágenes en poco tiempo. Intenta nuevamente en ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minutos.`);
    this.name = "WidgetAssetRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function resolveLocalWidgetAssetPath(publicId: string) {
  const normalized = publicId.replaceAll("\\", "/");
  if (!normalized || path.isAbsolute(normalized)) return null;
  const resolved = path.resolve(LOCAL_ASSET_ROOT, normalized);
  if (resolved !== LOCAL_ASSET_ROOT && !resolved.startsWith(`${LOCAL_ASSET_ROOT}${path.sep}`)) return null;
  return resolved;
}

export async function isWidgetAssetAvailable(asset: { provider: string; publicId: string }) {
  if (asset.provider !== "local") return true;
  const localPath = resolveLocalWidgetAssetPath(asset.publicId);
  if (!localPath) return false;
  try {
    await access(localPath);
    return true;
  } catch {
    return false;
  }
}

type ImageMetadata = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  extension: "jpg" | "png" | "webp";
};

type NormalizedWidgetImage = {
  bytes: Buffer;
  blurDataUrl: string;
  mimeType: "image/webp";
  width: number;
  height: number;
  extension: "webp";
};

function readJpegSize(bytes: Buffer) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    const isStartOfFrame = [
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
    ].includes(marker);
    if (isStartOfFrame) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    if (length < 2) break;
    offset += length + 2;
  }
  throw new Error("No fue posible leer las dimensiones del JPEG.");
}

function readWebpSize(bytes: Buffer) {
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X" && bytes.length >= 30) {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    const data = 20;
    if (bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a) {
      throw new Error("WebP VP8 inválido.");
    }
    return {
      width: bytes.readUInt16LE(data + 6) & 0x3fff,
      height: bytes.readUInt16LE(data + 8) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const data = 20;
    if (bytes[data] !== 0x2f) throw new Error("WebP VP8L inválido.");
    const b1 = bytes[data + 1];
    const b2 = bytes[data + 2];
    const b3 = bytes[data + 3];
    const b4 = bytes[data + 4];
    return {
      width: 1 + (b1 | ((b2 & 0x3f) << 8)),
      height: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)),
    };
  }
  throw new Error("Formato WebP no compatible.");
}

function inspectImage(bytes: Buffer, claimedType: string): ImageMetadata {
  let metadata: ImageMetadata;
  if (
    bytes.length >= 24
    && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    metadata = {
      mimeType: "image/png",
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      extension: "png",
    };
  } else if (bytes.length >= 12 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    metadata = { mimeType: "image/jpeg", ...readJpegSize(bytes), extension: "jpg" };
  } else if (
    bytes.length >= 30
    && bytes.toString("ascii", 0, 4) === "RIFF"
    && bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    metadata = { mimeType: "image/webp", ...readWebpSize(bytes), extension: "webp" };
  } else {
    throw new Error("La firma del archivo no corresponde a PNG, JPG o WebP.");
  }

  if (metadata.mimeType !== claimedType) {
    throw new Error("El tipo declarado no coincide con el contenido real del archivo.");
  }
  if (
    metadata.width < 1
    || metadata.height < 1
    || metadata.width > MAX_ASSET_DIMENSION
    || metadata.height > MAX_ASSET_DIMENSION
    || metadata.width * metadata.height > MAX_ASSET_PIXELS
  ) {
    throw new Error("La imagen supera las dimensiones seguras permitidas.");
  }
  return metadata;
}

async function enforceWidgetAssetUploadRateLimit(input: {
  businessId: string;
  userId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const recentUploads = await prisma.widgetDesignEvent.count({
    where: {
      businessId: input.businessId,
      actorUserId: input.userId,
      type: WidgetDesignEventType.ASSET_UPLOADED,
      createdAt: { gte: new Date(now.getTime() - UPLOAD_WINDOW_MS) },
    },
  });
  if (recentUploads >= MAX_UPLOADS_PER_WINDOW) {
    throw new WidgetAssetRateLimitError(Math.ceil(UPLOAD_WINDOW_MS / 1000));
  }
}

async function normalizeWidgetImage(bytes: Buffer): Promise<NormalizedWidgetImage> {
  try {
    const decoded = sharp(bytes, {
      failOn: "error",
      limitInputPixels: MAX_ASSET_PIXELS,
      sequentialRead: true,
    }).rotate();
    const [optimized, blur] = await Promise.all([
      decoded
        .clone()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84, effort: 4 })
        .toBuffer({ resolveWithObject: true }),
      decoded
        .clone()
        .resize({ width: 32, height: 32, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 35, effort: 2 })
        .toBuffer(),
    ]);
    if (!optimized.info.width || !optimized.info.height) {
      throw new Error("La imagen no tiene dimensiones válidas.");
    }
    return {
      bytes: optimized.data,
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
      mimeType: "image/webp",
      width: optimized.info.width,
      height: optimized.info.height,
      extension: "webp",
    };
  } catch {
    throw new Error("No pudimos procesar la imagen de forma segura. Exporta el archivo nuevamente como PNG, JPG o WebP e inténtalo otra vez.");
  }
}

export async function uploadWidgetAsset(input: {
  businessId: string;
  userId: string;
  file: File;
  altDefault?: string;
}) {
  if (!ACCEPTED_TYPES.has(input.file.type)) {
    throw new Error("Usa una imagen PNG, JPG o WebP.");
  }
  if (input.file.size < 16 || input.file.size > MAX_ASSET_BYTES) {
    throw new Error("La imagen debe pesar entre 16 bytes y 8 MB.");
  }
  await enforceWidgetAssetUploadRateLimit({
    businessId: input.businessId,
    userId: input.userId,
  });
  const originalBytes = Buffer.from(await input.file.arrayBuffer());
  const originalMetadata = inspectImage(originalBytes, input.file.type);
  const normalized = await normalizeWidgetImage(originalBytes);
  const usage = await prisma.widgetAsset.aggregate({
    where: {
      businessId: input.businessId,
      deletedAt: null,
      status: WidgetAssetStatus.READY,
    },
    _count: { _all: true },
    _sum: { byteSize: true },
  });
  if (usage._count._all >= MAX_ACTIVE_ASSETS_PER_BUSINESS) {
    throw new Error("La biblioteca alcanzó el máximo de 100 imágenes activas. Archiva una imagen sin uso antes de subir otra.");
  }
  if ((usage._sum.byteSize || 0) + normalized.bytes.byteLength > MAX_ACTIVE_ASSET_BYTES_PER_BUSINESS) {
    throw new Error("La biblioteca alcanzó el límite de 250 MB. Archiva imágenes sin uso antes de continuar.");
  }
  const assetToken = crypto.randomUUID();
  let provider: string;
  let publicId: string;
  let url: string;
  let width = normalized.width;
  let height = normalized.height;
  let localPath: string | null = null;

  if (process.env.NODE_ENV === "production") {
    const { cloudinary } = await import("@/server/lib/cloudinary");
    const base64 = `data:${normalized.mimeType};base64,${normalized.bytes.toString("base64")}`;
    publicId = `business_${input.businessId}_${assetToken}`;
    const upload = await cloudinary.uploader.upload(base64, {
      folder: "puragenda_widget_studio",
      public_id: publicId,
      resource_type: "image",
      transformation: [{ width: 2400, height: 2400, crop: "limit" }],
      fetch_format: "auto",
      quality: "auto",
    });
    provider = "cloudinary";
    publicId = upload.public_id;
    url = upload.secure_url;
    width = upload.width;
    height = upload.height;
  } else {
    provider = "local";
    publicId = `${input.businessId}/${assetToken}.${normalized.extension}`;
    const directory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "widget-assets",
      input.businessId,
    );
    await mkdir(directory, { recursive: true });
    localPath = path.join(directory, `${assetToken}.${normalized.extension}`);
    await writeFile(localPath, normalized.bytes, {
      flag: "wx",
    });
    url = `/uploads/widget-assets/${publicId.replaceAll("\\", "/")}`;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const asset = await tx.widgetAsset.create({
        data: {
          businessId: input.businessId,
          provider,
          publicId,
          url,
          mimeType: normalized.mimeType,
          byteSize: normalized.bytes.byteLength,
          width,
          height,
          altDefault: input.altDefault?.trim().slice(0, 240) || null,
          blurDataUrl: normalized.blurDataUrl,
          status: WidgetAssetStatus.READY,
          createdByUserId: input.userId,
        },
      });
      await tx.widgetDesignEvent.create({
        data: {
          businessId: input.businessId,
          actorUserId: input.userId,
          type: WidgetDesignEventType.ASSET_UPLOADED,
          metadata: {
            assetId: asset.id,
            provider,
            mimeType: asset.mimeType,
            byteSize: asset.byteSize,
            width: asset.width,
            height: asset.height,
            originalMimeType: originalMetadata.mimeType,
            originalByteSize: originalBytes.byteLength,
            metadataStripped: true,
            normalizedFormat: normalized.mimeType,
          },
        },
      });
      return asset;
    });
  } catch (error) {
    if (provider === "local" && localPath) {
      await unlink(localPath).catch(() => undefined);
    } else if (provider === "cloudinary") {
      const { cloudinary } = await import("@/server/lib/cloudinary");
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" }).catch(() => undefined);
    }
    throw error;
  }
}

async function removeWidgetAssetFromProvider(asset: {
  provider: string;
  publicId: string;
}) {
  if (asset.provider === "local") {
    const localPath = resolveLocalWidgetAssetPath(asset.publicId);
    if (!localPath) throw new Error("Ruta local de imagen inválida.");
    try {
      await unlink(localPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return;
  }
  if (asset.provider === "cloudinary") {
    const { cloudinary } = await import("@/server/lib/cloudinary");
    await cloudinary.uploader.destroy(asset.publicId, { resource_type: "image" });
    return;
  }
  throw new Error("Proveedor de imagen no compatible con cleanup automático.");
}

export async function cleanupOrphanedWidgetAssets(input?: {
  now?: Date;
  gracePeriodMs?: number;
  limit?: number;
}) {
  const now = input?.now ?? new Date();
  const gracePeriodMs = Math.max(
    ORPHAN_GRACE_PERIOD_MS,
    input?.gracePeriodMs ?? ORPHAN_GRACE_PERIOD_MS,
  );
  const limit = Math.min(
    MAX_CLEANUP_BATCH_SIZE,
    Math.max(1, input?.limit ?? MAX_CLEANUP_BATCH_SIZE),
  );
  const cutoff = new Date(now.getTime() - gracePeriodMs);
  const candidates = await prisma.widgetAsset.findMany({
    where: {
      status: WidgetAssetStatus.ARCHIVED,
      deletedAt: { lte: cutoff },
      references: { none: {} },
    },
    orderBy: { deletedAt: "asc" },
    take: limit,
    select: { id: true, provider: true, publicId: true },
  });
  const result = { examined: candidates.length, deleted: 0, failed: 0 };
  for (const asset of candidates) {
    try {
      await removeWidgetAssetFromProvider(asset);
      await prisma.widgetAsset.delete({ where: { id: asset.id } });
      result.deleted += 1;
    } catch (error) {
      result.failed += 1;
      console.error("[Widget Asset Cleanup] No se pudo eliminar un activo archivado:", {
        assetId: asset.id,
        provider: asset.provider,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
  return result;
}

export async function archiveWidgetAsset(input: {
  businessId: string;
  userId: string;
  assetId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.widgetAsset.findFirst({
      where: { id: input.assetId, businessId: input.businessId, deletedAt: null },
      include: { _count: { select: { references: true } } },
    });
    if (!asset) throw new Error("Imagen no encontrada.");
    if (asset._count.references > 0) {
      throw new Error("No puedes archivar una imagen que está siendo usada.");
    }
    const archived = await tx.widgetAsset.update({
      where: { id: asset.id },
      data: { status: WidgetAssetStatus.ARCHIVED, deletedAt: new Date() },
    });
    await tx.widgetDesignEvent.create({
      data: {
        businessId: input.businessId,
        actorUserId: input.userId,
        type: WidgetDesignEventType.ASSET_ARCHIVED,
        metadata: { assetId: asset.id },
      },
    });
    return archived;
  });
}
