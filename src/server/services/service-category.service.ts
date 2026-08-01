import { prisma } from "@/server/db/prisma";

const categoryListInclude = {
  _count: { select: { services: true } },
};

export function getServiceCategoriesByBusinessId(businessId: string) {
  return prisma.serviceCategory.findMany({
    where: { businessId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: categoryListInclude,
  });
}

export function getServiceCategoryByIdAndBusiness(
  categoryId: string,
  businessId: string
) {
  return prisma.serviceCategory.findFirst({
    where: { id: categoryId, businessId },
    include: categoryListInclude,
  });
}

export async function createServiceCategory(
  businessId: string,
  name: string
) {
  const aggregate = await prisma.serviceCategory.aggregate({
    where: { businessId },
    _max: { position: true },
  });

  return prisma.serviceCategory.create({
    data: {
      businessId,
      name,
      position: (aggregate._max.position ?? -1) + 1,
    },
    include: categoryListInclude,
  });
}

export function updateServiceCategory(categoryId: string, name: string) {
  return prisma.serviceCategory.update({
    where: { id: categoryId },
    data: { name },
    include: categoryListInclude,
  });
}

export function deleteServiceCategory(categoryId: string) {
  return prisma.serviceCategory.delete({
    where: { id: categoryId },
  });
}

export async function reorderServiceCategories(
  businessId: string,
  orderedIds: string[]
) {
  const existing = await prisma.serviceCategory.findMany({
    where: { businessId },
    select: { id: true },
  });
  const expected = new Set(existing.map((category) => category.id));
  const received = new Set(orderedIds);
  if (
    received.size !== orderedIds.length ||
    received.size !== expected.size ||
    orderedIds.some((id) => !expected.has(id))
  ) {
    throw new Error("El orden debe incluir todas las categorías del negocio");
  }

  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.serviceCategory.updateMany({
        where: { id, businessId },
        data: { position },
      })
    )
  );
}
