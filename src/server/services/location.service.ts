import { prisma } from "@/server/db/prisma";
import { toSlug } from "@/core/validators/slug";

export type LocationHoursInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  breakStart?: string | null;
  breakEnd?: string | null;
};

function defaultHours() {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "19:00",
    isOpen: dayOfWeek >= 1 && dayOfWeek <= 5,
    breakStart: null,
    breakEnd: null,
  }));
}

async function uniqueLocationSlug(businessId: string, name: string, excludeId?: string) {
  const base = toSlug(name) || "local";
  let suffix = 1;
  let candidate = base;
  while (true) {
    const existing = await prisma.businessLocation.findFirst({
      where: { businessId, slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/** Creates the default location used by a newly-created business. */
export async function createPrimaryLocation(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  business: { id: string; timezone: string; address?: string | null; mapsUrl?: string | null },
  ownerStaffId?: string,
) {
  const location = await tx.businessLocation.create({
    data: {
      businessId: business.id,
      name: "Local principal",
      slug: "principal",
      address: business.address ?? null,
      mapsUrl: business.mapsUrl ?? null,
      timezone: business.timezone,
      isPrimary: true,
      isActive: true,
      hours: { create: defaultHours() },
    },
  });

  if (ownerStaffId) {
    await tx.staffLocation.create({
      data: {
        staffId: ownerStaffId,
        locationId: location.id,
        schedule: { create: defaultHours().map(({ isOpen, ...hour }) => ({ ...hour, isWorking: isOpen })) },
      },
    });
  }
  return location;
}

export async function getActiveLocations(businessId: string) {
  return prisma.businessLocation.findMany({
    where: { businessId, isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

export async function getLocationForBusiness(
  businessId: string,
  locationId?: string | null,
) {
  if (locationId) {
    return prisma.businessLocation.findFirst({ where: { id: locationId, businessId, isActive: true } });
  }
  return prisma.businessLocation.findFirst({
    where: { businessId, isActive: true },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
  });
}

export async function getLocationBySlug(businessId: string, slug?: string | null) {
  if (slug) return prisma.businessLocation.findFirst({ where: { businessId, slug, isActive: true } });
  return getLocationForBusiness(businessId);
}

export async function createBusinessLocation(data: {
  businessId: string;
  name: string;
  address: string;
  mapsUrl?: string;
  timezone: string;
}) {
  const slug = await uniqueLocationSlug(data.businessId, data.name);
  const [location, services] = await Promise.all([
    prisma.businessLocation.create({
      data: {
        businessId: data.businessId,
        name: data.name.trim(),
        slug,
        address: data.address.trim(),
        mapsUrl: data.mapsUrl?.trim() || null,
        timezone: data.timezone,
        isActive: true,
        position: await prisma.businessLocation.count({ where: { businessId: data.businessId } }),
        hours: { create: defaultHours() },
      },
    }),
    prisma.service.findMany({ where: { businessId: data.businessId }, select: { id: true } }),
  ]);

  await prisma.$transaction([
    ...services.map((service) => prisma.locationService.create({ data: { locationId: location.id, serviceId: service.id } })),
  ]);
  return location;
}

export async function updateBusinessLocation(
  businessId: string,
  locationId: string,
  data: { name: string; address: string; mapsUrl?: string; timezone: string; isActive: boolean },
) {
  const existing = await prisma.businessLocation.findFirst({ where: { id: locationId, businessId } });
  if (!existing) return null;
  if (existing.isPrimary && !data.isActive) throw new Error("La sucursal principal no puede archivarse");
  const slug = data.name.trim() === existing.name ? existing.slug : await uniqueLocationSlug(businessId, data.name, locationId);
  return prisma.businessLocation.update({
    where: { id: locationId },
    data: { name: data.name.trim(), address: data.address.trim(), mapsUrl: data.mapsUrl?.trim() || null, timezone: data.timezone, isActive: data.isActive, slug },
  });
}

export async function saveLocationHours(locationId: string, hours: LocationHoursInput[]) {
  return prisma.$transaction(hours.map((hour) => prisma.locationHours.upsert({
    where: { locationId_dayOfWeek: { locationId, dayOfWeek: hour.dayOfWeek } },
    create: { locationId, ...hour, breakStart: hour.breakStart || null, breakEnd: hour.breakEnd || null },
    update: { startTime: hour.startTime, endTime: hour.endTime, isOpen: hour.isOpen, breakStart: hour.breakStart || null, breakEnd: hour.breakEnd || null },
  })));
}
