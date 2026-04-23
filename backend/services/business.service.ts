import { prisma } from "@/backend/db/prisma";

/**
 * Obtener un negocio por su slug.
 */
export async function getBusinessBySlug(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
  });
}

/**
 * Obtener un negocio con sus servicios.
 */
export async function getBusinessWithServices(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    include: {
      services: {
        orderBy: { name: "asc" },
      },
    },
  });
}

/**
 * Obtener el primer negocio asociado al owner autenticado.
 */
export async function getFirstBusinessByOwnerId(ownerId: string) {
  return prisma.business.findFirst({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Obtener el primer negocio de un owner con servicios.
 */
export async function getFirstBusinessWithServicesByOwnerId(ownerId: string) {
  return prisma.business.findFirst({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
    include: {
      services: {
        orderBy: { name: "asc" },
      },
    },
  });
}

/**
 * Validar API Key de un negocio.
 */
export function validateApiKey(business: { apiKey: string }, apiKey: string | null): boolean {
  if (!apiKey) return false;
  return apiKey === business.apiKey;
}
