import { z } from "zod";

export const existingBusinessMarketplacePromptSchema = z.object({
  categorySlug: z.string().trim().toLowerCase().max(64).optional().nullable(),
  otherDescription: z.string().trim().max(200).optional().nullable(),
  localitySlug: z.string().trim().toLowerCase().max(64).optional().nullable(),
  localityNotFound: z.boolean().optional().default(false),
  cityName: z.string().trim().max(100).optional().nullable(),
}).strict();
