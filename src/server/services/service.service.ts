import { prisma } from "@/server/db/prisma";
import type { ServiceInput } from "@/server/validations/booking";

const serviceOptionsInclude = {
  category: true,
  optionCategories: {
    orderBy: { position: "asc" as const },
    include: {
      alternatives: { orderBy: { position: "asc" as const } },
    },
  },
};

function buildOptionCategoryCreates(optionCategories: ServiceInput["optionCategories"]) {
  return optionCategories.map((category, categoryIndex) => ({
    name: category.name,
    isRequired: category.isRequired,
    maxSelections: category.maxSelections,
    position: categoryIndex,
    alternatives: {
      create: category.alternatives.map((alternative, alternativeIndex) => ({
        name: alternative.name,
        priceDelta: alternative.priceDelta,
        durationDelta: alternative.durationDelta,
        isHomeService: alternative.isHomeService,
        position: alternativeIndex,
      })),
    },
  }));
}

/**
 * Get all services for a business.
 */
export async function getServicesByBusinessId(businessId: string) {
  return prisma.service.findMany({
    where: { businessId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      ...serviceOptionsInclude,
      recurringPlan: true,
      _count: { select: { recurringBookings: true } },
    },
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
    include: serviceOptionsInclude,
  });
}

/**
 * Create a new service.
 */
export async function createService(data: {
  name: string;
  description: string;
  imageUrl?: string | null;
  duration: number;
  price: number;
  depositAmount?: number;
  bookingMode?: "APPOINTMENT" | "PRODUCTION";
  productionScheduleMode?: "WEEKLY" | "CUSTOM";
  weeklyProductionCapacity?: number;
  productionWeeksAhead?: number;
  productionLeadTimeWeeks?: number;
  customProductionWindows?: ServiceInput["customProductionWindows"];
  productionDepositPercent?: number;
  requiresReferenceImages?: boolean;
  businessId: string;
  categoryId?: string | null;
  optionCategories?: ServiceInput["optionCategories"];
}) {
  const { optionCategories = [], ...serviceData } = data;
  const aggregate = await prisma.service.aggregate({
    where: { businessId: serviceData.businessId },
    _max: { position: true },
  });

  return prisma.service.create({
    data: {
      ...serviceData,
      position: (aggregate._max.position ?? -1) + 1,
      depositAmount: serviceData.depositAmount ?? 0,
      optionCategories: { create: buildOptionCategoryCreates(optionCategories) },
    },
    include: serviceOptionsInclude,
  });
}

/**
 * Update an existing service.
 */
export async function updateService(
  serviceId: string,
  data: {
    name?: string;
    description?: string;
    imageUrl?: string | null;
    duration?: number;
    price?: number;
    depositAmount?: number;
    bookingMode?: "APPOINTMENT" | "PRODUCTION";
    productionScheduleMode?: "WEEKLY" | "CUSTOM";
    weeklyProductionCapacity?: number;
    productionWeeksAhead?: number;
    productionLeadTimeWeeks?: number;
    customProductionWindows?: ServiceInput["customProductionWindows"];
    productionDepositPercent?: number;
    requiresReferenceImages?: boolean;
    categoryId?: string | null;
    optionCategories?: ServiceInput["optionCategories"];
  }
) {
  const { optionCategories, ...serviceData } = data;

  if (optionCategories === undefined) {
    return prisma.service.update({
      where: { id: serviceId },
      data: serviceData,
      include: serviceOptionsInclude,
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.serviceOptionCategory.deleteMany({ where: { serviceId } });

    return tx.service.update({
      where: { id: serviceId },
      data: {
        ...serviceData,
        optionCategories: { create: buildOptionCategoryCreates(optionCategories) },
      },
      include: serviceOptionsInclude,
    });
  });
}

export async function updateServiceImage(
  serviceId: string,
  businessId: string,
  imageUrl: string | null
) {
  return prisma.service.update({
    where: { id: serviceId, businessId },
    data: { imageUrl },
    include: serviceOptionsInclude,
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

export async function reorderServices(
  businessId: string,
  orderedIds: string[]
) {
  const existing = await prisma.service.findMany({
    where: { businessId },
    select: { id: true },
  });
  const expected = new Set(existing.map((service) => service.id));
  const received = new Set(orderedIds);
  if (
    received.size !== orderedIds.length ||
    received.size !== expected.size ||
    orderedIds.some((id) => !expected.has(id))
  ) {
    throw new Error("El orden debe incluir todos los servicios del negocio");
  }

  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.service.updateMany({
        where: { id, businessId },
        data: { position },
      })
    )
  );
}
