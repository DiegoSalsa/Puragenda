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

type StoryUser = { id: string; role: string };
type StoryBusiness = { id: string; ownerId: string | null };

export interface AvailabilityStoryDay {
  date: string;
  label: string;
  times: string[];
}

export interface AvailabilityStoryData {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  serviceName: string;
  locationName: string;
  staffName: string;
  headline: string;
  template: "GRADIENT" | "MINIMAL";
  days: AvailabilityStoryDay[];
  bookingUrl: string;
  generatedAt: string;
  timezone: string;
  callToAction: string;
  disclaimer: string;
  poweredBy: string;
  noAvailability: string;
}

const STORY_COPY: Record<AppLocale, { wholeTeam: string; professional: string; callToAction: string; disclaimer: string; poweredBy: string; noAvailability: string }> = {
  es: { wholeTeam: "Todo el equipo", professional: "Profesional", callToAction: "Reserva desde el enlace de nuestra bio", disclaimer: "Cupos sujetos a disponibilidad en tiempo real", poweredBy: "Agenda online con Puragenda", noAvailability: "Sin cupos disponibles" },
  en: { wholeTeam: "Entire team", professional: "Professional", callToAction: "Book from the link in our bio", disclaimer: "Openings subject to real-time availability", poweredBy: "Online booking with Puragenda", noAvailability: "No openings available" },
  it: { wholeTeam: "Tutto il team", professional: "Professionista", callToAction: "Prenota dal link nella nostra bio", disclaimer: "Orari soggetti alla disponibilità in tempo reale", poweredBy: "Prenotazioni online con Puragenda", noAvailability: "Nessun orario disponibile" },
  pt: { wholeTeam: "Toda a equipe", professional: "Profissional", callToAction: "Reserve pelo link da nossa bio", disclaimer: "Horários sujeitos à disponibilidade em tempo real", poweredBy: "Agenda online com Puragenda", noAvailability: "Sem horários disponíveis" },
  fr: { wholeTeam: "Toute l’équipe", professional: "Professionnel", callToAction: "Réservez depuis le lien de notre bio", disclaimer: "Créneaux soumis aux disponibilités en temps réel", poweredBy: "Réservation en ligne avec Puragenda", noAvailability: "Aucun créneau disponible" },
  de: { wholeTeam: "Gesamtes Team", professional: "Teammitglied", callToAction: "Buche über den Link in unserer Bio", disclaimer: "Termine vorbehaltlich aktueller Verfügbarkeit", poweredBy: "Online-Termine mit Puragenda", noAvailability: "Keine freien Termine" },
  "zh-CN": { wholeTeam: "全部员工", professional: "员工", callToAction: "通过主页简介中的链接预约", disclaimer: "时段以实时可预约情况为准", poweredBy: "由 Puragenda 提供在线预约", noAvailability: "暂无可预约时段" },
};

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

  const [locations, services, staff] = await Promise.all([
    prisma.businessLocation.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        ...(!access.canChooseStaff && access.ownStaffId
          ? { staff: { some: { staffId: access.ownStaffId, isActive: true } } }
          : {}),
      },
      orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
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
      select: { id: true, name: true, duration: true, locations: { select: { locationId: true } } },
    }),
    prisma.staff.findMany({
      where: staffWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true, locations: { where: { isActive: true }, select: { locationId: true } } },
    }),
  ]);

  return {
    canChooseStaff: access.canChooseStaff,
    ownStaffId: access.ownStaffId,
    locations,
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      duration: service.duration,
      locationIds: service.locations.map((assignment) => assignment.locationId),
    })),
    staff: staff.map((member) => ({
      id: member.id,
      name: member.name,
      locationIds: member.locations.map((assignment) => assignment.locationId),
    })),
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

export async function buildAvailabilityStory(
  user: StoryUser,
  businessId: string,
  request: AvailabilityStoryRequest,
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

  const service = await prisma.service.findFirst({
    where: {
      id: request.serviceId,
      businessId: business.id,
      bookingMode: "APPOINTMENT",
      locations: { some: { locationId: location.id } },
    },
    select: { id: true, name: true, duration: true },
  });
  if (!service) throw new Error("STORY_SERVICE_FORBIDDEN");

  const now = new Date();
  const localNow = toZonedTime(now, location.timezone);
  const startOffset = request.range === "TOMORROW" ? 1 : request.range === "NEXT_7" && !business.allowSameDayBookings ? 1 : 0;
  const dayCount = request.range === "NEXT_7" ? 7 : 1;
  const dates = Array.from({ length: dayCount }, (_, index) => addDays(localNow, startOffset + index));
  const firstDateKey = localDateKey(dates[0]);
  const lastDateKey = localDateKey(addDays(dates[dates.length - 1], 1));
  const rangeStart = fromZonedTime(`${firstDateKey}T00:00:00`, location.timezone);
  const rangeEnd = fromZonedTime(`${lastDateKey}T00:00:00`, location.timezone);
  const overrideDateStart = new Date(`${firstDateKey}T00:00:00.000Z`);
  const overrideDateEnd = new Date(`${lastDateKey}T00:00:00.000Z`);

  const requestedStaffId = access.canChooseStaff ? request.staffId ?? null : access.ownStaffId;
  const staffMembers = await prisma.staff.findMany({
    where: {
      businessId: business.id,
      isActive: true,
      ...(requestedStaffId ? { id: requestedStaffId } : {}),
      locations: { some: { locationId: location.id, isActive: true } },
      OR: [{ services: { none: {} } }, { services: { some: { id: service.id } } }],
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
  await Promise.all(staffMembers.map(async (staff) => {
    blockedByStaff.set(
      staff.id,
      await getBlockedSlots(business.id, rangeStart, rangeEnd, staff.id, location.id),
    );
  }));

  const businessHours = location.hours.length ? location.hours : business.businessHours;
  const businessOverrides = (location.scheduleOverrides.length
    ? location.scheduleOverrides
    : business.scheduleOverrides).map(mapBusinessOverride);
  const cutoff = new Date(now.getTime() + business.minAdvanceBookingMinutes * 60_000);
  const locale = resolveLocale(business.locale);
  const copy = STORY_COPY[locale];
  const dateLocale = getDateLocale(locale);

  const days = dates.map((date) => {
    const maxDisplayedTimes = dayCount > 1 ? 4 : 8;
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
  });

  const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const bookingUrl = new URL(`/widget/${business.slug}`, appUrl);
  bookingUrl.searchParams.set("location", location.slug);
  bookingUrl.searchParams.set("utm_source", "instagram");
  bookingUrl.searchParams.set("utm_medium", "story");
  bookingUrl.searchParams.set("utm_campaign", "availability");

  return {
    businessName: business.name,
    logoUrl: business.logoUrl,
    primaryColor: business.primaryColor,
    secondaryColor: business.secondaryColor,
    backgroundColor: business.backgroundColor,
    textColor: business.textColor,
    serviceName: service.name,
    locationName: location.name,
    staffName: requestedStaffId ? staffMembers[0]?.name ?? copy.professional : copy.wholeTeam,
    headline: request.headline,
    template: request.template,
    days,
    bookingUrl: bookingUrl.toString(),
    generatedAt: now.toISOString(),
    timezone: location.timezone,
    callToAction: copy.callToAction,
    disclaimer: copy.disclaimer,
    poweredBy: copy.poweredBy,
    noAvailability: copy.noAvailability,
  };
}
