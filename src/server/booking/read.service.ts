import { prisma } from "@/server/db/prisma";
import { usesBusinessScheduleOnly } from "@/core/subscription-plan";
import { quoteBookingSelection, BookingSelectionError } from "@/core/booking-selection";
import { buildBookingSlots, bookingDayQueryBounds, localDateFromKey, slotToUtc } from "@/core/booking-availability";
import { getBlockedSlots } from "@/server/services/appointment.service";
import type { BookingAvailabilityDto, BookingCatalogDto } from "./contracts";
import type { Prisma } from "@prisma/client";

export const MAX_BOOKING_DAYS_AHEAD = 90;
const hoursSelect = { dayOfWeek: true, startTime: true, endTime: true, breakStart: true, breakEnd: true } as const;
const overridesSelect = { date: true, startTime: true, endTime: true, breakStart: true, breakEnd: true } as const;

export async function loadBookingContext(businessId: string, db: Prisma.TransactionClient = prisma) {
  const data = await db.business.findUniqueOrThrow({
    where: { id: businessId },
    select: {
      id: true, slug: true, name: true, timezone: true, currencyCode: true,
      slotInterval: true, minAdvanceBookingMinutes: true, allowSameDayBookings: true,
      depositRequired: true, depositPaymentMode: true, mpAccessToken: true, maxServicesPerBooking: true,
      subscription: { select: { plan: true } },
      businessHours: { select: { ...hoursSelect, isOpen: true } },
      scheduleOverrides: { select: { ...overridesSelect, isOpen: true } },
      services: {
        where: { bookingMode: "APPOINTMENT", recurringPlan: { is: null }, locations: { some: { location: { businessId, isActive: true } } } },
        take: 501, orderBy: [{ position: "asc" }, { name: "asc" }, { id: "asc" }],
        select: {
          id: true, name: true, description: true, imageUrl: true, price: true, duration: true, depositAmount: true,
          availabilityType: true, specialWeekDays: true, specialStartDate: true, specialEndDate: true, specialStartTime: true, specialEndTime: true,
          category: { select: { id: true, name: true, businessId: true, position: true } },
          locations: { where: { location: { businessId, isActive: true } }, select: { locationId: true } },
          optionCategories: { orderBy: { position: "asc" }, select: { id: true, name: true, isRequired: true, maxSelections: true,
            alternatives: { orderBy: { position: "asc" }, select: { id: true, name: true, priceDelta: true, durationDelta: true, isHomeService: true } } } },
        },
      },
      staff: {
        where: { isActive: true }, take: 101, orderBy: { id: "asc" },
        select: { id: true, name: true, imageUrl: true, services: { where: { businessId }, select: { id: true } },
          schedule: { select: { ...hoursSelect, isWorking: true } },
          scheduleOverrides: { select: { ...overridesSelect, isWorking: true } },
          locations: { where: { isActive: true, location: { businessId, isActive: true } }, select: {
            locationId: true, schedule: { select: { ...hoursSelect, isWorking: true } },
          } },
        },
      },
      locations: {
        where: { isActive: true }, take: 51, orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { id: "asc" }],
        select: { id: true, slug: true, name: true, address: true, mapsUrl: true, timezone: true, isPrimary: true,
          hours: { select: { ...hoursSelect, isOpen: true } }, scheduleOverrides: { select: { ...overridesSelect, isOpen: true } },
        },
      },
    },
  });
  if (data.services.length > 500 || data.staff.length > 100 || data.locations.length > 50) throw new BookingSelectionError("El catálogo excede el tamaño soportado", "CATALOG_LIMIT", 422);
  return data;
}
type BookingContext = Awaited<ReturnType<typeof loadBookingContext>>;
export type AvailabilityQuery = { date: string; serviceId: string; serviceIds?: string[]; locationId?: string; staffId?: string; firstAvailable?: boolean; selectedOptionAlternativeIds: string[] };

export function toBookingCatalog(data: BookingContext): BookingCatalogDto {
  const businessOnly = usesBusinessScheduleOnly(data.subscription?.plan);
  const serviceIds = new Set(data.services.map((service) => service.id));
  return {
    version: "1", business: { id: data.id, slug: data.slug, name: data.name, timezone: data.timezone, currency: data.currencyCode },
    services: data.services.map((service) => ({
      id: service.id, name: service.name, description: service.description, imageUrl: service.imageUrl,
      category: service.category?.businessId === data.id ? { id: service.category.id, name: service.category.name, position: service.category.position } : null,
      price: service.price, duration: service.duration, depositAmount: service.depositAmount,
      locationIds: service.locations.map((assignment) => assignment.locationId),
      optionCategories: service.optionCategories.map((category) => ({ id: category.id, name: category.name, isRequired: category.isRequired, maxSelections: category.maxSelections,
        alternatives: category.alternatives.map((alt) => ({ id: alt.id, name: alt.name, priceDelta: alt.priceDelta, durationDelta: alt.durationDelta, isHomeService: alt.isHomeService })) })),
    })),
    staff: businessOnly ? [] : data.staff.filter((staff) => staff.locations.length).map((staff) => ({
      id: staff.id, name: staff.name, imageUrl: staff.imageUrl, allServices: staff.services.length === 0,
      serviceIds: (staff.services.length ? staff.services.map((service) => service.id) : [...serviceIds]).filter((id) => serviceIds.has(id)),
      locationIds: staff.locations.map((assignment) => assignment.locationId),
    })),
    locations: data.locations.map((location) => ({ id: location.id, slug: location.slug, name: location.name, address: location.address, mapsUrl: location.mapsUrl, timezone: location.timezone || data.timezone, isPrimary: location.isPrimary })),
    capabilities: { singleAppointment: true, production: false, recurring: false, firstAvailable: !businessOnly, idempotency: true, maxDaysAhead: MAX_BOOKING_DAYS_AHEAD },
    rules: { scheduleMode: businessOnly ? "BUSINESS" : "STAFF", staffSelection: businessOnly ? "NONE" : "REQUIRED",
      slotInterval: data.slotInterval, minAdvanceBookingMinutes: data.minAdvanceBookingMinutes, advanceAppliesTo: "SAME_DAY",
      allowSameDayBookings: data.allowSameDayBookings, depositEnabled: data.depositRequired && (data.depositPaymentMode === "MANUAL_LINK" || !!data.mpAccessToken),
      maxServicesPerBooking: data.maxServicesPerBooking,
      customerFields: { name: true, email: true, phone: true, address: "HOME_OPTIONS_ONLY" },
    },
  };
}

export async function getBookingAvailability(data: BookingContext, query: AvailabilityQuery, now = new Date(), internal: { db?: Prisma.TransactionClient; skipBusy?: boolean } = {}): Promise<BookingAvailabilityDto> {
  const location = query.locationId ? data.locations.find((item) => item.id === query.locationId) : data.locations[0];
  if (!location) throw new BookingSelectionError("La sucursal seleccionada no está disponible");
  const requestedServiceIds = [...new Set(query.serviceIds?.length ? query.serviceIds : [query.serviceId])];
  if (!requestedServiceIds.includes(query.serviceId)) throw new BookingSelectionError("La lista de servicios no es válida");
  const services = requestedServiceIds.map((id) => data.services.find((item) => item.id === id)).filter((item): item is BookingContext["services"][number] => Boolean(item));
  if (services.length !== requestedServiceIds.length || services.some((service) => !service.locations.some((assignment) => assignment.locationId === location.id))) throw new BookingSelectionError("Uno o más servicios no están disponibles en esta sucursal");
  const quote = quoteBookingSelection(services, query.selectedOptionAlternativeIds);
  const timezone = location.timezone || data.timezone;
  // Compare civil days, independently of the machine timezone and DST day length.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const distance = (Date.parse(`${query.date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000;
  if (distance < 0 || distance > MAX_BOOKING_DAYS_AHEAD) throw new BookingSelectionError("Consulta una fecha entre hoy y 90 días", "DATE_OUT_OF_RANGE");
  const businessOnly = usesBusinessScheduleOnly(data.subscription?.plan);
  if (businessOnly && (query.staffId || query.firstAvailable)) throw new BookingSelectionError("Esta agenda no requiere profesional");
  if (query.staffId && query.firstAvailable) throw new BookingSelectionError("Selecciona profesional o primera disponible");
  const eligible = data.staff.filter((staff) => staff.locations.some((assignment) => assignment.locationId === location.id)
    && (staff.services.length === 0 || requestedServiceIds.every((serviceId) => staff.services.some((assignment) => assignment.id === serviceId))));
  if (!businessOnly && !query.firstAvailable && !eligible.some((staff) => staff.id === query.staffId)) throw new BookingSelectionError("Selecciona un profesional habilitado");
  const staffList = businessOnly ? [null] : query.firstAvailable ? eligible : eligible.filter((staff) => staff.id === query.staffId);
  const result: BookingAvailabilityDto = { version: "1", date: query.date, timezone, locationId: location.id,
    selection: { serviceId: query.serviceId, selectedOptionAlternativeIds: [...query.selectedOptionAlternativeIds].sort(), duration: quote.duration, price: quote.price, currency: data.currencyCode, requiresAddress: quote.requiresAddress }, slots: [] };
  const blockedDay = await (internal.db ?? prisma).blockedDate.findUnique({ where: { businessId_date: { businessId: data.id, date: new Date(`${query.date}T00:00:00Z`) } }, select: { id: true } });
  if (blockedDay) return result;
  const bounds = bookingDayQueryBounds(query.date, timezone);
  const date = localDateFromKey(query.date);
  const byStart = new Map<string, BookingAvailabilityDto["slots"][number]>();
  // Sequential, bounded fan-out (100 professionals max), deterministic ID ordering.
  for (const staff of staffList.sort((a, b) => (a?.id ?? "").localeCompare(b?.id ?? "", "en"))) {
    const blocked = internal.skipBusy ? [] : await getBlockedSlots(data.id, bounds.start, bounds.end, staff?.id, location.id);
    const slots = buildBookingSlots({ date, duration: quote.duration, timezone,
      businessHours: location.hours.length ? location.hours : data.businessHours,
      scheduleOverrides: (location.scheduleOverrides.length ? location.scheduleOverrides : data.scheduleOverrides).map((override) => ({ ...override, date: override.date.toISOString().slice(0, 10) })),
      staffSchedule: staff ? staff.locations.find((assignment) => assignment.locationId === location.id)?.schedule ?? staff.schedule : undefined,
      staffScheduleOverrides: staff?.scheduleOverrides.map((override) => ({ ...override, date: override.date.toISOString().slice(0, 10), isOpen: override.isWorking })),
      slotInterval: data.slotInterval, allowSameDayBookings: data.allowSameDayBookings, minAdvanceBookingMinutes: data.minAdvanceBookingMinutes,
      services: services.map((service) => ({ ...service, specialStartDate: service.specialStartDate?.toISOString().slice(0, 10), specialEndDate: service.specialEndDate?.toISOString().slice(0, 10) })), blocked, now,
    });
    for (const slot of slots) {
      const utc = slotToUtc(slot, timezone, quote.duration)!;
      const startTime = utc.start.toISOString();
      if (!byStart.has(startTime)) byStart.set(startTime, { startTime, endTime: utc.end.toISOString(), staffId: staff?.id ?? null });
    }
  }
  result.slots = [...byStart.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return result;
}
