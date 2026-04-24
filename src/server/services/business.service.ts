import { prisma } from "@/server/db/prisma";

/**
 * Get a business by its slug.
 */
export async function getBusinessBySlug(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
  });
}

/**
 * Get a business with its services.
 */
export async function getBusinessWithServices(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    include: {
      services: { orderBy: { name: "asc" } },
      staff: { where: { isActive: true }, orderBy: { name: "asc" } },
    },
  });
}

/**
 * Get the first business owned by a user.
 */
export async function getFirstBusinessByOwnerId(ownerId: string) {
  return prisma.business.findFirst({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get the first business with services by owner.
 */
export async function getFirstBusinessWithServicesByOwnerId(ownerId: string) {
  return prisma.business.findFirst({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
    include: {
      services: { orderBy: { name: "asc" } },
      staff: { where: { isActive: true }, orderBy: { name: "asc" } },
      subscription: true,
    },
  });
}

/**
 * Validate API key for a business.
 */
export function validateApiKey(
  business: { apiKey: string },
  apiKey: string | null
): boolean {
  if (!apiKey) return false;
  return apiKey === business.apiKey;
}

/**
 * Get a business by its API key.
 */
export async function getBusinessByApiKey(apiKey: string) {
  return prisma.business.findUnique({
    where: { apiKey },
  });
}

/**
 * Check if an origin is allowed for a business.
 * If allowedOrigins is empty, all origins are allowed (dev mode).
 */
export function isOriginAllowed(
  business: { allowedOrigins: string[] },
  origin: string | null
): boolean {
  if (business.allowedOrigins.length === 0) return true;
  if (!origin) return false;

  return business.allowedOrigins.some((allowed) => {
    // Normalize: remove trailing slashes
    const normalizedOrigin = origin.replace(/\/$/, "");
    const normalizedAllowed = allowed.replace(/\/$/, "");
    return normalizedOrigin === normalizedAllowed;
  });
}
