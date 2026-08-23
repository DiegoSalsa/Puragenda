import { prisma } from "@/server/db/prisma";
import type { UserRole } from "@/core/entities";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";

/**
 * Get a business by its slug.
 */
export async function getBusinessBySlug(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    include: {
      subscription: { select: { plan: true } },
    },
  });
}

/**
 * Get a business with its services.
 */
export async function getBusinessWithServices(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    include: {
      services: {
        orderBy: { name: "asc" },
        include: {
          category: true,
          optionCategories: {
            orderBy: { position: "asc" },
            include: { alternatives: { orderBy: { position: "asc" } } },
          },
        },
      },
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
 * Get the business for a user — either as owner OR as active staff member.
 * This is the primary function to use in dashboard pages/actions.
 */
export async function getBusinessForUser(userId: string) {
  return prisma.business.findFirst({
    where: {
      OR: [
        { ownerId: userId },
        { staff: { some: { userId, isActive: true } } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getStaffAgendaScope(
  user: { id: string; role: UserRole | string },
  business: { id: string; ownerId: string | null }
) {
  const staff = await prisma.staff.findFirst({
    where: { userId: user.id, businessId: business.id, isActive: true },
    select: { id: true },
  });
  const permissions = await getEffectiveBusinessPermissions(user, business);

  if (permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL)) {
    return { canSeeAllAgendas: true, staffId: null, ownStaffId: staff?.id ?? null };
  }

  const canSeeOwnAgenda = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN);
  return {
    canSeeAllAgendas: false,
    staffId: canSeeOwnAgenda ? staff?.id ?? null : null,
    ownStaffId: staff?.id ?? null,
  };
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
