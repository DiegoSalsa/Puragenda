import { prisma } from "@/server/db/prisma";

/**
 * Get all services for a business.
 */
export async function getServicesByBusinessId(businessId: string) {
  return prisma.service.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });
}

/**
 * Get a service by ID, verifying it belongs to the business.
 */
export async function getServiceByIdAndBusiness(
  serviceId: string,
  businessId: string
) {
  return prisma.service.findFirst({
    where: { id: serviceId, businessId },
  });
}

/**
 * Create a new service.
 */
export async function createService(data: {
  name: string;
  description: string;
  duration: number;
  price: number;
  businessId: string;
}) {
  return prisma.service.create({ data });
}

/**
 * Update an existing service.
 */
export async function updateService(
  serviceId: string,
  data: { name?: string; description?: string; duration?: number; price?: number }
) {
  return prisma.service.update({
    where: { id: serviceId },
    data,
  });
}

/**
 * Delete a service.
 */
export async function deleteService(serviceId: string) {
  return prisma.service.delete({
    where: { id: serviceId },
  });
}
