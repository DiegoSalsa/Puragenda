import { prisma } from "@/server/db/prisma";
import type { ServiceInput } from "@/server/validations/booking";

const serviceOptionsInclude = {
  category: true,
  optionCategories: {
    where: { isActive: true },
    orderBy: { position: "asc" as const },
    include: {
      alternatives: { where: { isActive: true }, orderBy: { position: "asc" as const } },
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
  depositPaymentUrl?: string | null;
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
  availabilityType?: "NORMAL" | "SPECIAL";
  specialWeekDays?: number[];
  specialStartDate?: string | null;
  specialEndDate?: string | null;
  specialStartTime?: string | null;
  specialEndTime?: string | null;
  optionCategories?: ServiceInput["optionCategories"];
}) {
  const { optionCategories = [], ...serviceData } = data;
  if (optionCategories.some(c => c.id || c.alternatives.some(a => a.id))) throw new ServiceCatalogError("Las opciones nuevas no pueden reutilizar identificadores", 400);
  const availabilityData = {
    availabilityType: serviceData.availabilityType ?? "NORMAL",
    specialWeekDays: serviceData.availabilityType === "SPECIAL" ? serviceData.specialWeekDays ?? [] : [],
    specialStartDate: serviceData.availabilityType === "SPECIAL" && serviceData.specialStartDate
      ? new Date(`${serviceData.specialStartDate}T00:00:00.000Z`)
      : null,
    specialEndDate: serviceData.availabilityType === "SPECIAL" && serviceData.specialEndDate
      ? new Date(`${serviceData.specialEndDate}T00:00:00.000Z`)
      : null,
    specialStartTime: serviceData.availabilityType === "SPECIAL" ? serviceData.specialStartTime : null,
    specialEndTime: serviceData.availabilityType === "SPECIAL" ? serviceData.specialEndTime : null,
  };
  const aggregate = await prisma.service.aggregate({
    where: { businessId: serviceData.businessId },
    _max: { position: true },
  });

  const activeLocations = await prisma.businessLocation.findMany({
    where: { businessId: serviceData.businessId, isActive: true },
    select: { id: true },
  });

  return prisma.service.create({
    data: {
      ...serviceData,
      ...availabilityData,
      position: (aggregate._max.position ?? -1) + 1,
      depositAmount: serviceData.depositAmount ?? 0,
      optionCategories: { create: buildOptionCategoryCreates(optionCategories) },
      locations: activeLocations.length ? { create: activeLocations.map((location) => ({ locationId: location.id })) } : undefined,
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
    depositPaymentUrl?: string | null;
    bookingMode?: "APPOINTMENT" | "PRODUCTION";
    productionScheduleMode?: "WEEKLY" | "CUSTOM";
    weeklyProductionCapacity?: number;
    productionWeeksAhead?: number;
    productionLeadTimeWeeks?: number;
    customProductionWindows?: ServiceInput["customProductionWindows"];
    productionDepositPercent?: number;
    requiresReferenceImages?: boolean;
    categoryId?: string | null;
    availabilityType?: "NORMAL" | "SPECIAL";
    specialWeekDays?: number[];
    specialStartDate?: string | null;
    specialEndDate?: string | null;
    specialStartTime?: string | null;
    specialEndTime?: string | null;
    optionCategories?: ServiceInput["optionCategories"];
  },
  businessId: string,
  expectedCatalogVersion?: number,
) {
  const { optionCategories, ...serviceData } = data;
  const availabilityData = serviceData.availabilityType
    ? {
        availabilityType: serviceData.availabilityType,
        specialWeekDays: serviceData.availabilityType === "SPECIAL" ? serviceData.specialWeekDays ?? [] : [],
        specialStartDate: serviceData.availabilityType === "SPECIAL" && serviceData.specialStartDate
          ? new Date(`${serviceData.specialStartDate}T00:00:00.000Z`)
          : null,
        specialEndDate: serviceData.availabilityType === "SPECIAL" && serviceData.specialEndDate
          ? new Date(`${serviceData.specialEndDate}T00:00:00.000Z`)
          : null,
        specialStartTime: serviceData.availabilityType === "SPECIAL" ? serviceData.specialStartTime : null,
        specialEndTime: serviceData.availabilityType === "SPECIAL" ? serviceData.specialEndTime : null,
      }
    : {};

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Service" WHERE "id" = ${serviceId} AND "businessId" = ${businessId} FOR UPDATE`;
    const existing = await tx.service.findFirst({ where: { id: serviceId, businessId }, include: serviceOptionsInclude });
    if (!existing) throw new ServiceCatalogError("Servicio no encontrado", 404);
    if (expectedCatalogVersion !== undefined && existing.catalogVersion !== expectedCatalogVersion) {
      throw new ServiceCatalogError("El servicio cambió. Recarga antes de guardar.", 409);
    }
    if (optionCategories !== undefined) {
      const categoryIds = new Set<string>();
      const alternativeIds = new Set<string>();
      for (const category of optionCategories) {
        const old = category.id ? existing.optionCategories.find(c => c.id === category.id) : undefined;
        if (category.id && (!old || categoryIds.has(category.id))) throw new ServiceCatalogError("Categoría inválida o retirada", 400);
        if (category.id) categoryIds.add(category.id);
        for (const alternative of category.alternatives) {
          if (alternative.id && (!old?.alternatives.some(a => a.id === alternative.id) || alternativeIds.has(alternative.id))) {
            throw new ServiceCatalogError("Alternativa inválida o retirada", 400);
          }
          if (alternative.id) alternativeIds.add(alternative.id);
        }
      }
      for (const [position, category] of optionCategories.entries()) {
        const { alternatives, id } = category;
        const fields = { name: category.name, isRequired: category.isRequired, maxSelections: category.maxSelections, position };
        const old = existing.optionCategories.find(c => c.id === id);
        const categoryChanges = Object.fromEntries(Object.entries(fields).filter(([key, value]) => !old || old[key as keyof typeof fields] !== value));
        const saved = old ?? await tx.serviceOptionCategory.create({ data: { ...fields, serviceId } });
        if (old && Object.keys(categoryChanges).length) await tx.serviceOptionCategory.update({ where: { id: saved.id }, data: categoryChanges });
        for (const [alternativePosition, alternative] of alternatives.entries()) {
          const alternativeFields = { name: alternative.name, priceDelta: alternative.priceDelta, durationDelta: alternative.durationDelta, isHomeService: alternative.isHomeService, position: alternativePosition };
          const prior = old?.alternatives.find(a => a.id === alternative.id);
          const changes = Object.fromEntries(Object.entries(alternativeFields).filter(([key, value]) => !prior || prior[key as keyof typeof alternativeFields] !== value));
          if (prior && Object.keys(changes).length) await tx.serviceOptionAlternative.update({ where: { id: prior.id }, data: changes });
          else if (!prior) await tx.serviceOptionAlternative.create({ data: { ...alternativeFields, categoryId: saved.id } });
        }
        const removed = old?.alternatives.filter(a => !alternativeIds.has(a.id)).map(a => a.id) ?? [];
        if (removed.length) await tx.serviceOptionAlternative.updateMany({ where: { id: { in: removed }, categoryId: saved.id }, data: { isActive: false } });
      }
      const retiredIds = existing.optionCategories.filter(c => !categoryIds.has(c.id)).map(c => c.id);
      await tx.serviceOptionAlternative.updateMany({ where: { categoryId: { in: retiredIds } }, data: { isActive: false } });
      await tx.serviceOptionCategory.updateMany({ where: { id: { in: retiredIds }, serviceId }, data: { isActive: false } });
    }
    return tx.service.update({ where: { id: serviceId, businessId }, data: { ...serviceData, ...availabilityData, catalogVersion: { increment: 1 } }, include: serviceOptionsInclude });
  });
}

export class ServiceCatalogError extends Error {
  constructor(message: string, public status: number) { super(message); }
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

/** Legacy DELETE means reversible archival; tenant scope is mandatory. */
export async function deleteService(serviceId: string, businessId: string) {
  return setServiceActive(serviceId, businessId, false);
}

export async function setServiceActive(serviceId: string, businessId: string, isActive: boolean) {
  return prisma.service.update({ where: { id: serviceId, businessId }, data: { isActive, catalogVersion: { increment: 1 } } });
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
