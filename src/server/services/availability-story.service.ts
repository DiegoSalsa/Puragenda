import { addDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { buildSlots, type AvailabilityScheduleOverride } from "@/core/availability";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { prisma } from "@/server/db/prisma";
import { getStaffAgendaScope } from "@/server/services/business.service";
import { getBlockedSlots } from "@/server/services/appointment.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import type { AvailabilityStoryRequest } from "@/server/validations/availability-story";
import { getDateLocale } from "@/i18n/date-locale";
import { resolveLocale, type AppLocale } from "@/i18n/config";
import { randomBytes } from "node:crypto";
import type { AppointmentStatus } from "@prisma/client";

type StoryUser = { id: string; role: string };
type StoryBusiness = { id: string; ownerId: string | null; address?: string | null };

export interface AvailabilityStoryDay {
  date: string;
  label: string;
  times: string[];
}

export interface AvailabilityStoryData {
  businessName: string;
  logoUrl: string | null;
  showLogo: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  serviceName: string;
  serviceNames: string[];
  locationName: string;
  locationAddress: string | null;
  staffName: string;
  headline: string;
  template: "AURORA" | "EDITORIAL" | "BOLD";
  backgroundMode: "ART" | "SOLID";
  showSchedule: boolean;
  showProfessional: boolean;
  showLocationName: boolean;
  showAddress: boolean;
  days: AvailabilityStoryDay[];
  bookingUrl: string;
  generatedAt: string;
  timezone: string;
  templateBackgroundUrl: string;
  ctaMode: "LINK_STICKER" | "BIO";
  callToAction: string;
  disclaimer: string;
  poweredBy: string;
  noAvailability: string;
  serviceIds: string[];
  slotCount: number;
  potentialRevenue: number;
}

export interface AvailabilityStoryOpportunity {
  id: string;
  locationId: string;
  locationName: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  date: string;
  dateLabel: string;
  times: string[];
  slotCount: number;
  potentialRevenue: number;
  source: "EXPLICIT" | "RECURRING";
  headline: string;
}

export interface AvailabilityStoryInsights {
  totals: {
    generated: number;
    visits: number;
    bookings: number;
    revenue: number;
  };
  recent: Array<{
    id: string;
    headline: string;
    createdAt: string;
    locationName: string | null;
    staffName: string | null;
    visits: number;
    bookings: number;
    revenue: number;
    downloads: number;
    shares: number;
    locationId: string | null;
    staffId: string | null;
    serviceIds: string[];
    targetDate: string | null;
    template: "AURORA" | "EDITORIAL" | "BOLD";
  }>;
}

const STORY_COPY: Record<AppLocale, { wholeTeam: string; professional: string; allServices: string; callToAction: string; stickerCallToAction: string; disclaimer: string; groupedDisclaimer: string; poweredBy: string; noAvailability: string }> = {
  es: { wholeTeam: "Todo el equipo", professional: "Profesional", allServices: "Todos los servicios", callToAction: "Reserva desde el enlace de nuestra bio", stickerCallToAction: "Reserva aquí", disclaimer: "Cupos sujetos a disponibilidad en tiempo real", groupedDisclaimer: "La hora disponible puede variar según servicio y profesional", poweredBy: "Agenda online con Puragenda", noAvailability: "Sin cupos disponibles" },
  en: { wholeTeam: "Entire team", professional: "Professional", allServices: "All services", callToAction: "Book from the link in our bio", stickerCallToAction: "Book here", disclaimer: "Openings subject to real-time availability", groupedDisclaimer: "Availability may vary by service and professional", poweredBy: "Online booking with Puragenda", noAvailability: "No openings available" },
  it: { wholeTeam: "Tutto il team", professional: "Professionista", allServices: "Tutti i servizi", callToAction: "Prenota dal link nella nostra bio", stickerCallToAction: "Prenota qui", disclaimer: "Orari soggetti alla disponibilità in tempo reale", groupedDisclaimer: "La disponibilità può variare in base al servizio e al professionista", poweredBy: "Prenotazioni online con Puragenda", noAvailability: "Nessun orario disponibile" },
  pt: { wholeTeam: "Toda a equipe", professional: "Profissional", allServices: "Todos os serviços", callToAction: "Reserve pelo link da nossa bio", stickerCallToAction: "Reserve aqui", disclaimer: "Horários sujeitos à disponibilidade em tempo real", groupedDisclaimer: "A disponibilidade pode variar conforme o serviço e o profissional", poweredBy: "Agenda online com Puragenda", noAvailability: "Sem horários disponíveis" },
  fr: { wholeTeam: "Toute l’équipe", professional: "Professionnel", allServices: "Tous les services", callToAction: "Réservez depuis le lien de notre bio", stickerCallToAction: "Réservez ici", disclaimer: "Créneaux soumis aux disponibilités en temps réel", groupedDisclaimer: "Les disponibilités peuvent varier selon le service et le professionnel", poweredBy: "Réservation en ligne avec Puragenda", noAvailability: "Aucun créneau disponible" },
  de: { wholeTeam: "Gesamtes Team", professional: "Teammitglied", allServices: "Alle Leistungen", callToAction: "Buche über den Link in unserer Bio", stickerCallToAction: "Hier buchen", disclaimer: "Termine vorbehaltlich aktueller Verfügbarkeit", groupedDisclaimer: "Die Verfügbarkeit kann je nach Leistung und Teammitglied variieren", poweredBy: "Online-Termine mit Puragenda", noAvailability: "Keine freien Termine" },
  "zh-CN": { wholeTeam: "全部员工", professional: "员工", allServices: "全部服务", callToAction: "通过主页简介中的链接预约", stickerCallToAction: "在此预约", disclaimer: "时段以实时可预约情况为准", groupedDisclaimer: "可预约时间可能因服务和员工而异", poweredBy: "由 Puragenda 提供在线预约", noAvailability: "暂无可预约时段" },
};

async function embedStoryLogo(logoUrl: string | null) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("data:image/")) return logoUrl;
  try {
    const response = await fetch(logoUrl, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!contentType.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 5_000_000) return null;
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function getAvailabilityStoryAccess(user: StoryUser, business: StoryBusiness) {
  const [permissions, agendaScope] = await Promise.all([
    getEffectiveBusinessPermissions(user, business),
    getStaffAgendaScope(user, business),
  ]);
  const canViewAll = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL);
  const canViewOwn = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN);
  const allowed = canViewAll || (canViewOwn && !!agendaScope.ownStaffId);

  return {
    allowed,
    canChooseStaff: canViewAll,
    ownStaffId: agendaScope.ownStaffId,
  };
}

export async function getAvailabilityStoryOptions(user: StoryUser, business: StoryBusiness) {
  const access = await getAvailabilityStoryAccess(user, business);
  if (!access.allowed) return null;

  const staffWhere = access.canChooseStaff
    ? { businessId: business.id, isActive: true }
    : { businessId: business.id, isActive: true, id: access.ownStaffId ?? "__missing_staff__" };

  const [locations, services, staff, opportunities, subscription] = await Promise.all([
    prisma.businessLocation.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        ...(!access.canChooseStaff && access.ownStaffId
          ? { staff: { some: { staffId: access.ownStaffId, isActive: true } } }
          : {}),
      },
      orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, address: true },
    }),
    prisma.service.findMany({
      where: {
        businessId: business.id,
        bookingMode: "APPOINTMENT",
        ...(!access.canChooseStaff && access.ownStaffId
          ? { OR: [{ staff: { none: {} } }, { staff: { some: { id: access.ownStaffId } } }] }
          : {}),
      },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        duration: true,
        locations: { select: { locationId: true } },
        staff: { select: { id: true } },
      },
    }),
    prisma.staff.findMany({
      where: staffWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true, locations: { where: { isActive: true }, select: { locationId: true } } },
    }),
    getAvailabilityStoryOpportunities(user, business),
    prisma.subscription.findUnique({
      where: { businessId: business.id },
      select: { plan: true },
    }),
  ]);

  return {
    canChooseStaff: access.canChooseStaff,
    ownStaffId: access.ownStaffId,
    isIndividualPlan: (subscription?.plan ?? "INDIVIDUAL") === "INDIVIDUAL",
    hasMultipleLocations: locations.length > 1,
    businessAddress: business.address ?? null,
    locations,
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      duration: service.duration,
      locationIds: service.locations.map((assignment) => assignment.locationId),
      staffIds: service.staff.map((member) => member.id),
    })),
    staff: staff.map((member) => ({
      id: member.id,
      name: member.name,
      locationIds: member.locations.map((assignment) => assignment.locationId),
    })),
    opportunities,
  };
}

function localDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function mapBusinessOverride(entry: {
  date: Date;
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
}): AvailabilityScheduleOverride {
  return {
    date: entry.date.toISOString().slice(0, 10),
    isOpen: entry.isOpen,
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakStart: entry.breakStart,
    breakEnd: entry.breakEnd,
  };
}

function rangesOverlap(left: { start: Date; end: Date }, right: { startTime: Date; endTime: Date }) {
  return left.start < right.endTime && left.end > right.startTime;
}

function isStoryCampaignStorageMissing(error: unknown) {
  return !!error && typeof error === "object" && "code" in error
    && (error.code === "P2021" || error.code === "P2022");
}

async function hasStoryCampaignStorage() {
  const result = await prisma.$queryRaw<Array<{ tableName: string | null }>>`
    SELECT to_regclass('public."StoryCampaign"')::text AS "tableName"
  `;
  return Boolean(result[0]?.tableName);
}

function opportunityHeadline(locale: AppLocale, serviceName: string) {
  const copy: Record<AppLocale, string> = {
    es: `¡Reserva tu hora de ${serviceName}!`,
    en: `Book your ${serviceName} appointment`,
    it: `Prenota il tuo appuntamento: ${serviceName}`,
    pt: `Reserve seu horário: ${serviceName}`,
    fr: `Réservez votre rendez-vous : ${serviceName}`,
    de: `Buche deinen Termin: ${serviceName}`,
    "zh-CN": `预约 ${serviceName}`,
  };
  return copy[locale];
}

export async function getAvailabilityStoryOpportunities(
  user: StoryUser,
  business: StoryBusiness,
  horizonDays = 90,
  limit = 6,
): Promise<AvailabilityStoryOpportunity[]> {
  const access = await getAvailabilityStoryAccess(user, business);
  if (!access.allowed) return [];

  const fullBusiness = await prisma.business.findUnique({
    where: { id: business.id },
    include: {
      businessHours: { orderBy: { dayOfWeek: "asc" } },
      scheduleOverrides: { orderBy: { date: "asc" } },
    },
  });
  if (!fullBusiness) return [];

  const staffWhere = access.canChooseStaff
    ? { businessId: business.id, isActive: true }
    : { businessId: business.id, isActive: true, id: access.ownStaffId ?? "__missing_staff__" };

  const [locations, services, staffMembers] = await Promise.all([
    prisma.businessLocation.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        ...(!access.canChooseStaff && access.ownStaffId
          ? { staff: { some: { staffId: access.ownStaffId, isActive: true } } }
          : {}),
      },
      orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { name: "asc" }],
      include: {
        hours: { orderBy: { dayOfWeek: "asc" } },
        scheduleOverrides: { orderBy: { date: "asc" } },
      },
    }),
    prisma.service.findMany({
      where: { businessId: business.id, bookingMode: "APPOINTMENT" },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        duration: true,
        price: true,
        locations: { select: { locationId: true } },
        staff: { select: { id: true } },
      },
    }),
    prisma.staff.findMany({
      where: staffWhere,
      orderBy: { name: "asc" },
      include: {
        schedule: { orderBy: { dayOfWeek: "asc" } },
        scheduleOverrides: { orderBy: { date: "asc" } },
        locations: {
          where: { isActive: true },
          include: { schedule: { orderBy: { dayOfWeek: "asc" } } },
        },
      },
    }),
  ]);

  const locale = resolveLocale(fullBusiness.locale);
  const dateLocale = getDateLocale(locale);
  const opportunities: AvailabilityStoryOpportunity[] = [];
  const now = new Date();

  for (const location of locations) {
    const localNow = toZonedTime(now, location.timezone);
    const startOffset = fullBusiness.allowSameDayBookings ? 0 : 1;
    const dates = Array.from({ length: horizonDays }, (_, index) => addDays(localNow, startOffset + index));
    const firstDateKey = localDateKey(dates[0]);
    const lastDateKey = localDateKey(addDays(dates[dates.length - 1], 1));
    const rangeStart = fromZonedTime(`${firstDateKey}T00:00:00`, location.timezone);
    const rangeEnd = fromZonedTime(`${lastDateKey}T00:00:00`, location.timezone);
    const locationStaff = staffMembers.filter((staff) =>
      staff.locations.some((assignment) => assignment.locationId === location.id),
    );
    const blockedByStaff = new Map<string, Awaited<ReturnType<typeof getBlockedSlots>>>();
    await Promise.all(locationStaff.map(async (staff) => {
      blockedByStaff.set(
        staff.id,
        await getBlockedSlots(business.id, rangeStart, rangeEnd, staff.id, location.id),
      );
    }));

    const businessHours = location.hours.length ? location.hours : fullBusiness.businessHours;
    const businessOverrideEntries = location.scheduleOverrides.length
      ? location.scheduleOverrides
      : fullBusiness.scheduleOverrides;
    const businessOverrides = businessOverrideEntries.map(mapBusinessOverride);
    const locationServices = services.filter((service) =>
      service.locations.some((assignment) => assignment.locationId === location.id),
    );
    const cutoff = new Date(now.getTime() + fullBusiness.minAdvanceBookingMinutes * 60_000);

    for (const date of dates) {
      const dateKey = localDateKey(date);
      const hasBusinessOverride = businessOverrideEntries.some(
        (entry) => entry.date.toISOString().slice(0, 10) === dateKey,
      );

      for (const service of locationServices) {
        for (const staff of locationStaff) {
          const restrictedStaffIds = service.staff.map((member) => member.id);
          if (restrictedStaffIds.length > 0 && !restrictedStaffIds.includes(staff.id)) continue;

          const locationAssignment = staff.locations.find((entry) => entry.locationId === location.id);
          const staffSchedule = locationAssignment?.schedule.length
            ? locationAssignment.schedule
            : staff.schedule;
          const staffOverrides = staff.scheduleOverrides.map((entry) => ({
            date: entry.date.toISOString().slice(0, 10),
            isOpen: entry.isWorking,
            startTime: entry.startTime,
            endTime: entry.endTime,
            breakStart: entry.breakStart,
            breakEnd: entry.breakEnd,
          }));
          const blocked = blockedByStaff.get(staff.id) ?? [];
          const localBlockedEnds = blocked.map((range) => toZonedTime(range.endTime, location.timezone));
          const slots = buildSlots(
            date,
            service.duration,
            businessHours,
            staffSchedule,
            fullBusiness.slotInterval,
            businessOverrides,
            localBlockedEnds,
            staffOverrides,
          ).filter((slot) => {
            const utcSlot = {
              start: fromZonedTime(slot.start, location.timezone),
              end: fromZonedTime(slot.end, location.timezone),
            };
            const isToday = dateKey === localDateKey(localNow);
            if (isToday && (!fullBusiness.allowSameDayBookings || utcSlot.start <= cutoff)) return false;
            return !blocked.some((range) => rangesOverlap(utcSlot, range));
          });
          if (slots.length === 0) continue;

          const hasStaffOverride = staff.scheduleOverrides.some(
            (entry) => entry.date.toISOString().slice(0, 10) === dateKey,
          );
          const label = format(date, locale === "es" ? "EEEE d 'de' MMMM" : "PPPP", { locale: dateLocale });
          opportunities.push({
            id: [location.id, service.id, staff.id, dateKey].join(":"),
            locationId: location.id,
            locationName: location.name,
            serviceId: service.id,
            serviceName: service.name,
            staffId: staff.id,
            staffName: staff.name,
            date: dateKey,
            dateLabel: label.charAt(0).toUpperCase() + label.slice(1),
            times: slots.slice(0, 6).map((slot) => format(slot.start, "HH:mm")),
            slotCount: slots.length,
            potentialRevenue: slots.length * service.price,
            source: hasBusinessOverride || hasStaffOverride ? "EXPLICIT" : "RECURRING",
            headline: opportunityHeadline(locale, service.name),
          });
        }
      }
    }
  }

  return opportunities
    .sort((left, right) => {
      if (left.source !== right.source) return left.source === "EXPLICIT" ? -1 : 1;
      return left.date.localeCompare(right.date)
        || right.slotCount - left.slotCount
        || right.potentialRevenue - left.potentialRevenue;
    })
    .slice(0, limit);
}

export async function buildAvailabilityStory(
  user: StoryUser,
  businessId: string,
  request: AvailabilityStoryRequest,
  assetBaseUrl?: string,
): Promise<AvailabilityStoryData> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      businessHours: { orderBy: { dayOfWeek: "asc" } },
      scheduleOverrides: { orderBy: { date: "asc" } },
    },
  });
  if (!business) throw new Error("BUSINESS_NOT_FOUND");

  const access = await getAvailabilityStoryAccess(user, business);
  if (!access.allowed) throw new Error("STORY_FORBIDDEN");
  if (!access.canChooseStaff && request.staffId !== access.ownStaffId) {
    throw new Error("STORY_STAFF_SCOPE_FORBIDDEN");
  }

  const location = await prisma.businessLocation.findFirst({
    where: {
      id: request.locationId,
      businessId: business.id,
      isActive: true,
      ...(!access.canChooseStaff && access.ownStaffId
        ? { staff: { some: { staffId: access.ownStaffId, isActive: true } } }
        : {}),
    },
    include: {
      hours: { orderBy: { dayOfWeek: "asc" } },
      scheduleOverrides: { orderBy: { date: "asc" } },
    },
  });
  if (!location) throw new Error("STORY_LOCATION_FORBIDDEN");

  const requestedStaffId = access.canChooseStaff ? request.staffId ?? null : access.ownStaffId;
  const services = await prisma.service.findMany({
    where: {
      businessId: business.id,
      bookingMode: "APPOINTMENT",
      locations: { some: { locationId: location.id } },
      ...(!request.allServices ? { id: { in: request.serviceIds } } : {}),
      ...(requestedStaffId
        ? { OR: [{ staff: { none: {} } }, { staff: { some: { id: requestedStaffId } } }] }
        : {}),
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, duration: true, price: true, staff: { select: { id: true } } },
  });
  if (!services.length) throw new Error("STORY_SERVICE_FORBIDDEN");
  if (!request.allServices && services.length !== new Set(request.serviceIds).size) {
    throw new Error("STORY_SERVICE_FORBIDDEN");
  }

  const now = new Date();
  const localNow = toZonedTime(now, location.timezone);
  const requestedTargetDate = request.targetDate
    ? (() => {
        const [year, month, day] = request.targetDate.split("-").map(Number);
        return new Date(year, month - 1, day, 12, 0, 0, 0);
      })()
    : null;
  if (requestedTargetDate) {
    const targetKey = localDateKey(requestedTargetDate);
    const todayKey = localDateKey(localNow);
    const horizonKey = localDateKey(addDays(localNow, 90));
    if (targetKey < todayKey || targetKey > horizonKey) throw new Error("STORY_DATE_FORBIDDEN");
  }
  const startOffset = request.range === "TOMORROW"
    ? 1
    : (request.range === "NEXT_7" || request.range === "NEXT_AVAILABLE") && !business.allowSameDayBookings
      ? 1
      : 0;
  const dayCount = !request.showSchedule ? 1 : request.range === "NEXT_7" ? 7 : request.range === "NEXT_AVAILABLE" ? 90 : 1;
  const dates = requestedTargetDate
    ? [requestedTargetDate]
    : Array.from({ length: dayCount }, (_, index) => addDays(localNow, startOffset + index));
  const firstDateKey = localDateKey(dates[0]);
  const lastDateKey = localDateKey(addDays(dates[dates.length - 1], 1));
  const rangeStart = fromZonedTime(`${firstDateKey}T00:00:00`, location.timezone);
  const rangeEnd = fromZonedTime(`${lastDateKey}T00:00:00`, location.timezone);
  const overrideDateStart = new Date(`${firstDateKey}T00:00:00.000Z`);
  const overrideDateEnd = new Date(`${lastDateKey}T00:00:00.000Z`);

  const staffMembers = await prisma.staff.findMany({
    where: {
      businessId: business.id,
      isActive: true,
      ...(requestedStaffId ? { id: requestedStaffId } : {}),
      locations: { some: { locationId: location.id, isActive: true } },
    },
    orderBy: { name: "asc" },
    include: {
      schedule: { orderBy: { dayOfWeek: "asc" } },
      scheduleOverrides: { where: { date: { gte: overrideDateStart, lt: overrideDateEnd } }, orderBy: { date: "asc" } },
      locations: {
        where: { locationId: location.id, isActive: true },
        include: { schedule: { orderBy: { dayOfWeek: "asc" } } },
      },
    },
  });
  if (requestedStaffId && staffMembers.length === 0) throw new Error("STORY_STAFF_FORBIDDEN");

  const blockedByStaff = new Map<string, Awaited<ReturnType<typeof getBlockedSlots>>>();
  if (request.showSchedule) {
    await Promise.all(staffMembers.map(async (staff) => {
      blockedByStaff.set(
        staff.id,
        await getBlockedSlots(business.id, rangeStart, rangeEnd, staff.id, location.id),
      );
    }));
  }

  const businessHours = location.hours.length ? location.hours : business.businessHours;
  const businessOverrides = (location.scheduleOverrides.length
    ? location.scheduleOverrides
    : business.scheduleOverrides).map(mapBusinessOverride);
  const cutoff = new Date(now.getTime() + business.minAdvanceBookingMinutes * 60_000);
  const locale = resolveLocale(business.locale);
  const copy = STORY_COPY[locale];
  const dateLocale = getDateLocale(locale);

  const computedDays = request.showSchedule ? dates.map((date) => {
    const maxDisplayedTimes = dates.length > 1 ? 4 : 8;
    const candidatesByTime = new Map<number, Array<{ staffId: string; start: Date; end: Date }>>();
    for (const staff of staffMembers) {
      const blocked = blockedByStaff.get(staff.id) ?? [];
      const localBlockedEnds = blocked.map((range) => toZonedTime(range.endTime, location.timezone));
      const locationSchedule = staff.locations[0]?.schedule ?? [];
      const staffSchedule = locationSchedule.length ? locationSchedule : staff.schedule;
      const staffOverrides = staff.scheduleOverrides.map((entry) => ({
        date: entry.date.toISOString().slice(0, 10),
        isOpen: entry.isWorking,
        startTime: entry.startTime,
        endTime: entry.endTime,
        breakStart: entry.breakStart,
        breakEnd: entry.breakEnd,
      }));
      for (const service of services) {
        const restrictedStaffIds = service.staff.map((member) => member.id);
        const canPerformService = restrictedStaffIds.length === 0 || restrictedStaffIds.includes(staff.id);
        if (!canPerformService) continue;

        const slots = buildSlots(
          date,
          service.duration,
          businessHours,
          staffSchedule,
          business.slotInterval,
          businessOverrides,
          localBlockedEnds,
          staffOverrides,
        );

        for (const slot of slots) {
          const utcSlot = {
            start: fromZonedTime(slot.start, location.timezone),
            end: fromZonedTime(slot.end, location.timezone),
          };
          const isToday = localDateKey(date) === localDateKey(localNow);
          if (isToday && (!business.allowSameDayBookings || utcSlot.start <= cutoff)) continue;
          if (blocked.some((range) => rangesOverlap(utcSlot, range))) continue;
          const entries = candidatesByTime.get(slot.start.getTime()) ?? [];
          entries.push({ staffId: staff.id, start: slot.start, end: slot.end });
          candidatesByTime.set(slot.start.getTime(), entries);
        }
      }
    }

    const selectedByStaff = new Map<string, Array<{ start: Date; end: Date }>>();
    const selected: Array<{ start: Date; end: Date }> = [];
    for (const [, candidates] of [...candidatesByTime.entries()].sort(([left], [right]) => left - right)) {
      const candidate = candidates
        .sort((left, right) => (selectedByStaff.get(left.staffId)?.length ?? 0) - (selectedByStaff.get(right.staffId)?.length ?? 0))
        .find((entry) => !(selectedByStaff.get(entry.staffId) ?? []).some(
          (chosen) => entry.start < chosen.end && entry.end > chosen.start,
        ));
      if (!candidate) continue;
      const assigned = selectedByStaff.get(candidate.staffId) ?? [];
      assigned.push({ start: candidate.start, end: candidate.end });
      selectedByStaff.set(candidate.staffId, assigned);
      selected.push({ start: candidate.start, end: candidate.end });
      if (selected.length >= maxDisplayedTimes) break;
    }

    return {
      date: localDateKey(date),
      label: (() => {
        const value = format(date, locale === "es" ? "EEEE d 'de' MMMM" : "PPPP", { locale: dateLocale });
        return value.charAt(0).toUpperCase() + value.slice(1);
      })(),
      times: selected.map((slot) => format(slot.start, "HH:mm")),
    };
  }) : [];

  const days = !request.showSchedule
    ? []
    : request.range === "NEXT_AVAILABLE" && !requestedTargetDate
    ? (() => {
        const available = computedDays.filter((day) => day.times.length > 0).slice(0, 5);
        return available.length > 0 ? available : computedDays.slice(0, 1);
      })()
    : computedDays;
  const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const templateFile = {
    AURORA: "editorial-paper.webp",
    EDITORIAL: "organic-paper.webp",
    BOLD: "graphic-paper.webp",
  }[request.template];
  const bookingUrl = new URL(`/widget/${business.slug}`, appUrl);
  bookingUrl.searchParams.set("location", location.slug);
  bookingUrl.searchParams.set("utm_source", "instagram");
  bookingUrl.searchParams.set("utm_medium", "story");
  bookingUrl.searchParams.set("utm_campaign", "availability");
  if (services.length === 1) bookingUrl.searchParams.set("service", services[0].id);
  if (requestedStaffId) bookingUrl.searchParams.set("staff", requestedStaffId);
  if (request.showSchedule && (request.targetDate ?? days[0]?.date)) {
    bookingUrl.searchParams.set("date", request.targetDate ?? days[0].date);
  }

  const slotCount = days.reduce((total, day) => total + day.times.length, 0);
  const potentialRevenue = services.length === 1 ? slotCount * services[0].price : 0;
  const logoUrl = request.showLogo ? await embedStoryLogo(business.logoUrl) : null;

  return {
    businessName: business.name,
    logoUrl,
    showLogo: request.showLogo,
    primaryColor: request.accentColor,
    secondaryColor: request.secondaryColor,
    backgroundColor: request.canvasColor,
    textColor: request.storyTextColor,
    serviceName: request.allServices ? copy.allServices : services.map((service) => service.name).join(" · "),
    serviceNames: request.showServices ? services.map((service) => service.name) : [],
    locationName: location.name,
    locationAddress: location.address ?? business.address ?? null,
    staffName: requestedStaffId ? staffMembers[0]?.name ?? copy.professional : copy.wholeTeam,
    headline: request.headline,
    template: request.template,
    backgroundMode: request.backgroundMode,
    showSchedule: request.showSchedule,
    showProfessional: request.showProfessional,
    showLocationName: request.showLocationName,
    showAddress: request.showAddress,
    days,
    bookingUrl: bookingUrl.toString(),
    generatedAt: now.toISOString(),
    timezone: location.timezone,
    templateBackgroundUrl: `${assetBaseUrl ?? appUrl}/story-templates/${templateFile}`,
    ctaMode: request.ctaMode,
    callToAction: request.callToAction ?? (request.ctaMode === "LINK_STICKER" ? copy.stickerCallToAction : copy.callToAction),
    disclaimer: services.length > 1 ? copy.groupedDisclaimer : copy.disclaimer,
    poweredBy: copy.poweredBy,
    noAvailability: copy.noAvailability,
    serviceIds: services.map((service) => service.id),
    slotCount,
    potentialRevenue,
  };
}

export async function recordAvailabilityStoryCampaign(
  user: StoryUser,
  businessId: string,
  request: AvailabilityStoryRequest,
  data: AvailabilityStoryData,
  origin: string,
) {
  if (!(await hasStoryCampaignStorage())) {
    return { campaignId: null, bookingUrl: data.bookingUrl };
  }
  const token = randomBytes(9).toString("base64url");
  const destination = new URL(data.bookingUrl);
  destination.searchParams.set("story", token);
  destination.searchParams.set("utm_campaign", `story-${token}`);
  const targetDate = request.targetDate ?? data.days[0]?.date ?? null;

  const campaign = await prisma.storyCampaign.create({
    data: {
      token,
      businessId,
      createdByUserId: user.id,
      locationId: request.locationId,
      staffId: request.staffId ?? null,
      serviceIds: data.serviceIds,
      range: request.targetDate ? "TARGET_DATE" : request.range,
      targetDate: targetDate ? new Date(`${targetDate}T00:00:00.000Z`) : null,
      headline: data.headline,
      template: data.template,
      destinationUrl: destination.toString(),
      slotCount: data.slotCount,
      potentialRevenue: data.potentialRevenue,
    },
    select: { id: true, token: true },
  }).catch((error) => {
    if (isStoryCampaignStorageMissing(error)) return null;
    throw error;
  });
  if (!campaign) return { campaignId: null, bookingUrl: data.bookingUrl };
  const shortUrl = new URL(`/s/${campaign.token}`, origin).toString();
  return { campaignId: campaign.id, bookingUrl: shortUrl };
}

export async function recordAvailabilityStoryActivity(
  user: StoryUser,
  business: StoryBusiness,
  campaignId: string,
  activity: "download" | "share",
) {
  const access = await getAvailabilityStoryAccess(user, business);
  if (!access.allowed) throw new Error("STORY_FORBIDDEN");
  const result = await prisma.storyCampaign.updateMany({
    where: { id: campaignId, businessId: business.id },
    data: activity === "download"
      ? { downloadCount: { increment: 1 } }
      : { shareCount: { increment: 1 } },
  });
  if (result.count !== 1) throw new Error("STORY_CAMPAIGN_NOT_FOUND");
}

export async function getAvailabilityStoryInsights(
  user: StoryUser,
  business: StoryBusiness,
): Promise<AvailabilityStoryInsights | null> {
  const access = await getAvailabilityStoryAccess(user, business);
  if (!access.allowed) return null;
  if (!(await hasStoryCampaignStorage())) {
    return { totals: { generated: 0, visits: 0, bookings: 0, revenue: 0 }, recent: [] };
  }

  const excludedStatuses: AppointmentStatus[] = ["CANCELLED", "NO_SHOW"];
  const activeAppointmentWhere = {
    storyCampaign: { businessId: business.id },
    status: { notIn: excludedStatuses },
  };
  const result = await Promise.all([
    prisma.storyCampaign.aggregate({
      where: { businessId: business.id },
      _count: { _all: true },
      _sum: { linkVisits: true },
    }),
    prisma.appointment.aggregate({
      where: activeAppointmentWhere,
      _count: { _all: true },
      _sum: { totalPrice: true },
    }),
    prisma.storyCampaign.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        location: { select: { name: true } },
        staff: { select: { name: true } },
        appointments: {
          where: { status: { notIn: excludedStatuses } },
          select: { totalPrice: true },
        },
      },
    }),
  ]).catch((error) => {
    if (isStoryCampaignStorageMissing(error)) return null;
    throw error;
  });
  if (!result) {
    return { totals: { generated: 0, visits: 0, bookings: 0, revenue: 0 }, recent: [] };
  }
  const [campaignTotals, appointmentTotals, recent] = result;

  return {
    totals: {
      generated: campaignTotals._count._all,
      visits: campaignTotals._sum.linkVisits ?? 0,
      bookings: appointmentTotals._count._all,
      revenue: appointmentTotals._sum.totalPrice ?? 0,
    },
    recent: recent.map((campaign) => ({
      id: campaign.id,
      headline: campaign.headline,
      createdAt: campaign.createdAt.toISOString(),
      locationName: campaign.location?.name ?? null,
      staffName: campaign.staff?.name ?? null,
      visits: campaign.linkVisits,
      bookings: campaign.appointments.length,
      revenue: campaign.appointments.reduce((total, appointment) => total + (appointment.totalPrice ?? 0), 0),
      downloads: campaign.downloadCount,
      shares: campaign.shareCount,
      locationId: campaign.locationId,
      staffId: campaign.staffId,
      serviceIds: campaign.serviceIds,
      targetDate: campaign.targetDate?.toISOString().slice(0, 10) ?? null,
      template: campaign.template as "AURORA" | "EDITORIAL" | "BOLD",
    })),
  };
}
