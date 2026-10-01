import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { requireWebsiteManager, ensureWebsite } from "./service";
import { WebsiteError } from "./errors";

import { MEDIA_PROFILES, MAX_WEBSITE_IMAGE_BYTES, type MediaUsage, type WebsiteAsset } from "@/websites/media";
import { storedMediaUrls } from "@/websites/stored-media";

export async function normalizeWebsiteImage(file: File, usage: MediaUsage) {
  if (!file.size || file.size > MAX_WEBSITE_IMAGE_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new WebsiteError("Usa JPG, PNG o WebP de hasta 5 MB");
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 });
    const metadata = await image.metadata();
    const mime = ( { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[metadata.format ?? ""];
    if (mime !== file.type || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1 || metadata.width < 16 || metadata.height < 16) throw new WebsiteError("El archivo no es una fotografía compatible");
    // Sharp strips EXIF/GPS by default. Rotate before reducing the long edge.
    return await image.rotate().resize({ width: MEDIA_PROFILES[usage], height: MEDIA_PROFILES[usage], fit: "inside", withoutEnlargement: true }).webp({ quality: usage === "logo" || usage === "favicon" ? 95 : 90 }).toBuffer({ resolveWithObject: true });
  } catch (error) { if (error instanceof WebsiteError) throw error; throw new WebsiteError("No pudimos leer la imagen. Prueba con otra foto."); }
}
export async function storeWebsiteImage(form: FormData): Promise<WebsiteAsset> {
  const { business } = await requireWebsiteManager();
  const rawUsage = form.get("usage") ?? "hero";
  if (typeof rawUsage !== "string" || !Object.hasOwn(MEDIA_PROFILES, rawUsage)) throw new WebsiteError("Elige dónde usar esta foto");
  const file = form.get("image"); if (!(file instanceof File)) throw new WebsiteError("Selecciona una imagen");
  const usage = rawUsage as MediaUsage;
  const normalized = await normalizeWebsiteImage(file, usage);
  const site = await ensureWebsite(business.id, business.slug);
  if (await prisma.websiteMedia.count({ where: { websiteId: site.id, deletedAt: null } }) >= 150) throw new WebsiteError("Tu biblioteca está llena. Retira las fotos que ya no usas.");
  const publicId = `puragenda_websites/${business.id}/${randomUUID()}`;
  let secureUrl: string, provider = "cloudinary";
  if (process.env.NODE_ENV !== "production" && process.env.WEBSITE_QA === "1" && process.env.WEBSITE_MEDIA_MOCK === "1") {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const directory = join(process.cwd(), "public", "website-media-qa", business.id);
    await mkdir(directory, { recursive: true });
    const filename = `${publicId.split("/").at(-1)}.webp`;
    await writeFile(join(directory, filename), normalized.data);
    secureUrl = `/website-media-qa/${business.id}/${filename}`; provider = "local";
  } else {
    const { cloudinary } = await import("@/server/lib/cloudinary");
    const result = await cloudinary.uploader.upload(`data:image/webp;base64,${normalized.data.toString("base64")}`, { resource_type: "image", public_id: publicId, overwrite: false });
    secureUrl = result.secure_url;
  }
  try {
    const asset = await prisma.websiteMedia.create({ data: { websiteId: site.id, publicId, secureUrl, width: normalized.info.width, height: normalized.info.height, format: "webp", bytes: normalized.info.size, usage, provider } });
    return { id: asset.id, publicId: asset.publicId, secureUrl: asset.secureUrl, width: asset.width, height: asset.height, format: "webp", bytes: asset.bytes };
  } catch (error) {
    if (provider === "cloudinary") { const { cloudinary } = await import("@/server/lib/cloudinary"); await cloudinary.uploader.destroy(publicId, { invalidate: true }).catch(() => undefined); }
    throw error;
  }
}
type MediaDb = Pick<Prisma.TransactionClient, "websiteMedia">;
export async function validateWebsiteAssets(db: MediaDb, websiteId: string, config: { mediaAssets?: WebsiteAsset[] }, previous: unknown) {
  const allowedLegacy = new Set(storedMediaUrls(previous));
  const urls = [...new Set(storedMediaUrls(config))];
  const refs = config.mediaAssets ?? [];
  const fresh = urls.filter(url => !allowedLegacy.has(url));
  if (!urls.length && !refs.length) return;
  const assets = await db.websiteMedia.findMany({ where: { OR: [{ secureUrl: { in: urls } }, { id: { in: refs.map(asset => asset.id) } }] } });
  const owns = new Map(assets.filter(asset => asset.websiteId === websiteId && !asset.deletedAt).map(asset => [asset.secureUrl, asset]));
  if (assets.some(asset => asset.websiteId !== websiteId || asset.deletedAt)) throw new WebsiteError("Esta imagen no pertenece a tu negocio. Sube tu propia foto.");
  if (fresh.some(url => !owns.has(url)) || refs.some(ref => { const owned = owns.get(ref.secureUrl); return !owned || owned.id !== ref.id || owned.publicId !== ref.publicId || owned.width !== ref.width || owned.height !== ref.height || owned.bytes !== ref.bytes || owned.format !== ref.format; })) throw new WebsiteError("Esta imagen no pertenece a tu negocio. Sube tu propia foto.");
}
export async function deleteWebsiteAsset(id: string) {
  const { business } = await requireWebsiteManager();
  const asset = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    const item = await tx.websiteMedia.findFirst({ where: { id, deletedAt: null, website: { businessId: business.id } }, include: { website: true } });
    if (!item) throw new WebsiteError("Imagen no encontrada");
    const referenced = [item.website.draftConfig, item.website.publishedConfig].some(value => storedMediaUrls(value).includes(item.secureUrl));
    if (referenced) throw new WebsiteError("Esta foto sigue en tu borrador o sitio publicado. Retírala y publica antes de eliminarla.");
    return tx.websiteMedia.update({ where: { id }, data: { deletedAt: new Date() } });
  });
  if (asset.provider === "cloudinary") {
    try { const { cloudinary } = await import("@/server/lib/cloudinary"); await cloudinary.uploader.destroy(asset.publicId, { invalidate: true }); }
    catch { await prisma.websiteMedia.update({ where: { id: asset.id }, data: { deletedAt: null } }); throw new WebsiteError("No pudimos eliminar la foto. Intenta nuevamente."); }
  }
  else if (asset.provider === "local" && process.env.NODE_ENV !== "production" && process.env.WEBSITE_QA === "1") {
    const { unlink } = await import("node:fs/promises");
    const { join, resolve, sep } = await import("node:path");
    const directory = resolve(process.cwd(), "public", "website-media-qa", business.id);
    const target = resolve(join(process.cwd(), "public", asset.secureUrl));
    if (target.startsWith(directory + sep)) await unlink(target).catch(() => undefined);
  }
}
