import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs/promises", () => ({
  access: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    widgetAsset: {
      aggregate: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    widgetDesignEvent: { count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

import { access, unlink, writeFile } from "fs/promises";
import sharp from "sharp";
import { prisma } from "@/server/db/prisma";
import {
  archiveWidgetAsset,
  cleanupOrphanedWidgetAssets,
  isWidgetAssetAvailable,
  uploadWidgetAsset,
} from "@/server/services/widget-assets.service";

function validPngFile() {
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  return new File([bytes], "promo.png", { type: "image/png" });
}

const transaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

describe("Widget Studio asset lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(unlink).mockResolvedValue(undefined);
    vi.mocked(prisma.widgetDesignEvent.count).mockResolvedValue(0);
    vi.mocked(prisma.widgetAsset.findMany).mockResolvedValue([]);
    vi.mocked(prisma.widgetAsset.aggregate).mockResolvedValue({
      _count: { _all: 0 },
      _sum: { byteSize: 0 },
    } as never);
  });

  it("removes the local file if the database transaction fails", async () => {
    vi.mocked(prisma.widgetAsset.create).mockRejectedValueOnce(new Error("database unavailable"));

    await expect(uploadWidgetAsset({
      businessId: "business_1",
      userId: "user_1",
      file: validPngFile(),
    })).rejects.toThrow("database unavailable");

    expect(writeFile).toHaveBeenCalledOnce();
    expect(unlink).toHaveBeenCalledWith(expect.stringMatching(
      /public[\\/]uploads[\\/]widget-assets[\\/]business_1[\\/].+\.webp$/,
    ));
  });

  it("rejects a forged MIME type before writing a file", async () => {
    const bytes = Buffer.alloc(24, 0);
    const forged = new File([bytes], "fake.png", { type: "image/png" });

    await expect(uploadWidgetAsset({
      businessId: "business_1",
      userId: "user_1",
      file: forged,
    })).rejects.toThrow(/firma del archivo/i);

    expect(writeFile).not.toHaveBeenCalled();
    expect(prisma.widgetAsset.create).not.toHaveBeenCalled();
  });

  it("treats a missing local file as unavailable even when the database row is READY", async () => {
    vi.mocked(access).mockRejectedValueOnce(new Error("ENOENT"));

    await expect(isWidgetAssetAvailable({
      provider: "local",
      publicId: "business_1/missing.png",
    })).resolves.toBe(false);
  });

  it("rejects local asset paths that escape the widget uploads directory", async () => {
    await expect(isWidgetAssetAvailable({
      provider: "local",
      publicId: "../../private.png",
    })).resolves.toBe(false);

    expect(access).not.toHaveBeenCalled();
  });

  it("rejects a new upload before writing when the business asset quota is full", async () => {
    vi.mocked(prisma.widgetAsset.aggregate).mockResolvedValueOnce({
      _count: { _all: 100 },
      _sum: { byteSize: 10_000 },
    } as never);

    await expect(uploadWidgetAsset({
      businessId: "business_1",
      userId: "user_1",
      file: validPngFile(),
    })).rejects.toThrow(/máximo de 100 imágenes/i);

    expect(writeFile).not.toHaveBeenCalled();
    expect(prisma.widgetAsset.create).not.toHaveBeenCalled();
  });

  it("rate-limits successful uploads by business and user before processing the file", async () => {
    vi.mocked(prisma.widgetDesignEvent.count).mockResolvedValueOnce(20);

    await expect(uploadWidgetAsset({
      businessId: "business_1",
      userId: "user_1",
      file: validPngFile(),
    })).rejects.toThrow(/muchas imágenes/i);

    expect(writeFile).not.toHaveBeenCalled();
    expect(prisma.widgetAsset.aggregate).not.toHaveBeenCalled();
  });

  it("decodes, compresses and strips metadata before storing the image", async () => {
    const input = await sharp({
      create: { width: 24, height: 16, channels: 3, background: "#7C3AED" },
    }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const asset = {
      id: "asset_1",
      mimeType: "image/webp",
      byteSize: 100,
      width: 16,
      height: 24,
    };
    vi.mocked(prisma.widgetAsset.create).mockResolvedValueOnce(asset as never);

    await uploadWidgetAsset({
      businessId: "business_1",
      userId: "user_1",
      file: new File([Uint8Array.from(input)], "portrait.jpg", { type: "image/jpeg" }),
    });

    const storedBytes = vi.mocked(writeFile).mock.calls[0][1] as Buffer;
    const storedMetadata = await sharp(storedBytes).metadata();
    expect(storedMetadata.format).toBe("webp");
    expect(storedMetadata.exif).toBeUndefined();
    expect(storedMetadata.orientation).toBeUndefined();
    expect(prisma.widgetAsset.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        mimeType: "image/webp",
        blurDataUrl: expect.stringMatching(/^data:image\/webp;base64,/),
      }),
    }));
  });

  it("deletes only archived, unreferenced assets after the safety period", async () => {
    vi.mocked(prisma.widgetAsset.findMany).mockResolvedValueOnce([{
      id: "asset_old",
      provider: "local",
      publicId: "business_1/old.webp",
    }] as never);

    const result = await cleanupOrphanedWidgetAssets({
      now: new Date("2026-08-04T12:00:00.000Z"),
      limit: 25,
    });

    expect(prisma.widgetAsset.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "ARCHIVED",
        references: { none: {} },
      }),
      take: 25,
    }));
    expect(unlink).toHaveBeenCalledWith(expect.stringMatching(/old\.webp$/));
    expect(prisma.widgetAsset.delete).toHaveBeenCalledWith({ where: { id: "asset_old" } });
    expect(result).toEqual({ examined: 1, deleted: 1, failed: 0 });
  });

  it("does not archive an asset referenced by a design", async () => {
    vi.mocked(prisma.widgetAsset.findFirst).mockResolvedValueOnce({
      id: "asset_1",
      _count: { references: 2 },
    } as never);

    await expect(archiveWidgetAsset({
      businessId: "business_1",
      userId: "user_1",
      assetId: "asset_1",
    })).rejects.toThrow(/está siendo usada/i);

    expect(prisma.widgetAsset.update).not.toHaveBeenCalled();
  });
});
