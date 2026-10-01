import { z } from "zod";
export const websiteAssetSchema = z.object({
  id: z.string().min(1).max(100), publicId: z.string().min(1).max(400),
  secureUrl: z.string().min(1).max(2000), width: z.number().int().positive(),
  height: z.number().int().positive(), format: z.enum(["webp", "png", "jpeg"]), bytes: z.number().int().positive(),
}).strict();
export type WebsiteAsset = z.infer<typeof websiteAssetSchema>;
export const MEDIA_PROFILES = { hero: 2400, gallery: 2400, about: 2400, social: 1600, logo: 800, favicon: 256 } as const;
export type MediaUsage = keyof typeof MEDIA_PROFILES;
export const MAX_WEBSITE_IMAGE_BYTES = 5 * 1024 * 1024;
