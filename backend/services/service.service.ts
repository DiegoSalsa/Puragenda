import { prisma } from "@/backend/db/prisma";

/**
 * Obtener todos los servicios de un negocio.
 */
export async function getServicesByBusinessId(businessId: string) {
  return prisma.service.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });
}

/**
 * Obtener un servicio por ID y verificar que pertenezca al negocio.
 */
export async function getServiceByIdAndBusiness(serviceId: string, businessId: string) {
  return prisma.service.findFirst({
    where: {
      id: serviceId,
      businessId,
    },
  });
}

/**
 * Crear un nuevo servicio.
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
 * Actualizar un servicio existente.
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
 * Eliminar un servicio.
 */
export async function deleteService(serviceId: string) {
  return prisma.service.delete({
    where: { id: serviceId },
  });
}
