import { addDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { buildSlots, type AvailabilityScheduleOverride } from "@/core/availability";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { prisma } from "@/server/db/prisma";
import { getGoogleCalendarBusySlots } from "@/server/services/google-calendar.service";
import { getStaffAgendaScope } from "@/server/services/business.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { getPublicBlockingScheduleBlockWhere } from "@/server/services/schedule-block.service";
import type { DashboardAvailabilityRequest } from "@/server/validations/dashboard-availability";

type AvailabilityUser = { id: string; role: string };
type AvailabilityBusiness = { id: string; ownerId: string | null };

type BusyRange = { startTime: Date; endTime: Date };

type LoadedStaff = Awaited<ReturnType<typeof loadAvailabilityStaff>>[number];
type LoadedService = Awaited<ReturnType<typeof loadAvailabilityServices>>[number];

export interface DashboardAvailabilityAssignment {
  serviceId: string;
  staffId: string;
  staffName: string;
}

export interface DashboardAvailabilityBookingOption {
  endTime: string;
  assignments: DashboardAvailabilityAssignment[];
}

export interface DashboardAvailabilitySlot {
  time: string;
  startTime: string;
  bookingOptions: DashboardAvailabilityBookingOption[];
}

export interface DashboardAvailabilityDay {
  date: string;
  slots: DashboardAvailabilitySlot[];
}

export interface DashboardAvailabilityResult {
  timezone: string;
  generatedAt: string;
  durationMinutes: number;
  serviceNames: string[];
  days: DashboardAvailabilityDay[];
}

export class DashboardAvailabilityError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "DashboardAvailabilityError";
  }
}

function localDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(parsed.getTime()) || localDateKey(parsed) !== value) {
    throw new DashboardAvailabilityError("INVALID_DATE", "La fecha seleccionada no es valida");
  }
  return parsed;
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

function rangesOverlap(
  slot: { start: Date; end: Date },
  range: { startTime: Date; endTime: Date },
) {
  return slot.start < range.endTime && slot.end > range.startTime;
}

async function loadAvailabilityServices(businessId: string, serviceIds: string[], locationId: string) {
  return prisma.service.findMany({
    where: {
      id: { in: serviceIds },
      businessId,
      bookingMode: "APPOINTMENT",
      locations: { some: { locationId } },
    },
    include: {
      staff: { where: { isActive: true }, select: { id: true } },
      optionCategories: {
        orderBy: { position: "asc" },
        include: { alternatives: { orderBy: { position: "asc" } } },
      },
    },
  });
}

async function loadAvailabilityStaff(businessId: string, locationId: string, scopedStaffId?: string) {
  return prisma.staff.findMany({
    where: {
      businessId,
      isActive: true,
      ...(scopedStaffId ? { id: scopedStaffId } : {}),
      locations: { some: { locationId, isActive: true } },
    },
    orderBy: { name: "asc" },
    include: {
      services: { select: { id: true } },
      schedule: { orderBy: { dayOfWeek: "asc" } },
      scheduleOverrides: { orderBy: { date: "asc" } },
      locations: {
        where: { locationId, isActive: true },
        include: { schedule: { orderBy: { dayOfWeek: "asc" } } },
      },
    },
  });
}

function canPerformService(staff: LoadedStaff, serviceId: string) {
  return staff.services.length === 0 || staff.services.some((service) => service.id === serviceId);
}

function calculateServiceDurations(
  services: LoadedService[],
  selectedOptionIds: string[],
) {
  const selected = new Set(selectedOptionIds);
  const matched = new Set<string>();
  const durationByServiceId = new Map(services.map((service) => [service.id, service.duration]));

  for (const service of services) {
    for (const category of service.optionCategories) {
      const alternatives = category.alternatives.filter((alternative) => selected.has(alternative.id));
      if (alternatives.length > category.maxSelections) {
        throw new DashboardAvailabilityError(
          "TOO_MANY_OPTIONS",
          `Selecciona como maximo ${category.maxSelections} opcion(es) en ${category.name}`,
        );
      }
      if (category.isRequired && alternatives.length === 0) {
        throw new DashboardAvailabilityError(
          "REQUIRED_OPTION_MISSING",
          `Selecciona una opcion en ${category.name}`,
        );
      }
      for (const alternative of alternatives) {
        matched.add(alternative.id);
        durationByServiceId.set(
          service.id,
          (durationByServiceId.get(service.id) ?? service.duration) + alternative.durationDelta,
        );
      }
    }
  }

  if (matched.size !== selected.size) {
    throw new DashboardAvailabilityError(
      "INVALID_OPTIONS",
      "Una o mas opciones no pertenecen a los servicios seleccionados",
    );
  }

  return durationByServiceId;
}

type CandidateGroup = {
  staff: LoadedStaff;
  duration: number;
  serviceIds: string[];
};

type AvailabilityCandidate = {
  duration: number;
  groups: CandidateGroup[];
  assignments: DashboardAvailabilityAssignment[];
};

function buildCandidate(
  services: LoadedService[],
  durationByServiceId: Map<string, number>,
  staffByServiceId: Map<string, LoadedStaff>,
): AvailabilityCandidate {
  const grouped = new Map<string, CandidateGroup>();
  const assignments: DashboardAvailabilityAssignment[] = [];

  for (const service of services) {
    const staff = staffByServiceId.get(service.id);
    if (!staff) {
      throw new DashboardAvailabilityError(
        "STAFF_ASSIGNMENTS_REQUIRED",
        "Asigna un profesional para cada servicio seleccionado",
      );
    }
    const group = grouped.get(staff.id) ?? { staff, duration: 0, serviceIds: [] };
    group.duration += durationByServiceId.get(service.id) ?? service.duration;
    group.serviceIds.push(service.id);
    grouped.set(staff.id, group);
    assignments.push({ serviceId: service.id, staffId: staff.id, staffName: staff.name });
  }

  const groups = [...grouped.values()];
  return {
    groups,
    assignments,
    duration: Math.max(...groups.map((group) => group.duration)),
  };
}

function buildCandidates(
  input: DashboardAvailabilityRequest,
  services: LoadedService[],
  staffMembers: LoadedStaff[],
  durationByServiceId: Map<string, number>,
) {
  const staffById = new Map(staffMembers.map((staff) => [staff.id, staff]));

  if (input.staffAssignments?.length) {
    const assignmentsByService = new Map<string, string>();
    for (const assignment of input.staffAssignments) {
      if (assignmentsByService.has(assignment.serviceId)) {
        throw new DashboardAvailabilityError("DUPLICATE_ASSIGNMENT", "Cada servicio debe tener un solo profesional");
      }
      assignmentsByService.set(assignment.serviceId, assignment.staffId);
    }
    if (
      assignmentsByService.size !== services.length ||
      services.some((service) => !assignmentsByService.has(service.id))
    ) {
      throw new DashboardAvailabilityError(
        "STAFF_ASSIGNMENTS_REQUIRED",
        "Asigna un profesional para cada servicio seleccionado",
      );
    }

    const staffByServiceId = new Map<string, LoadedStaff>();
    for (const service of services) {
      const staffId = assignmentsByService.get(service.id) ?? "";
      const staff = staffById.get(staffId);
      if (!staff) {
        throw new DashboardAvailabilityError(
          "STAFF_FORBIDDEN",
          "No tienes acceso a uno de los profesionales seleccionados",
          403,
        );
      }
      if (!canPerformService(staff, service.id)) {
        throw new DashboardAvailabilityError(
          "STAFF_SERVICE_MISMATCH",
          `${staff.name} no realiza ${service.name}`,
        );
      }
      staffByServiceId.set(service.id, staff);
    }
    return [buildCandidate(services, durationByServiceId, staffByServiceId)];
  }

  const commonStaff = staffMembers.filter((staff) =>
    services.every((service) => canPerformService(staff, service.id)),
  );
  const requestedStaff = input.staffId ? staffById.get(input.staffId) : null;
  if (input.staffId && !requestedStaff) {
    throw new DashboardAvailabilityError(
      "STAFF_FORBIDDEN",
      "No tienes acceso al profesional seleccionado",
      403,
    );
  }
  if (requestedStaff && !commonStaff.some((staff) => staff.id === requestedStaff.id)) {
    throw new DashboardAvailabilityError(
      "STAFF_SERVICE_MISMATCH",
      "El profesional seleccionado no realiza todos los servicios",
    );
  }

  const candidates = requestedStaff ? [requestedStaff] : commonStaff;
  if (candidates.length === 0) {
    throw new DashboardAvailabilityError(
      "STAFF_ASSIGNMENTS_REQUIRED",
      "No hay un profesional que realice todos los servicios; asigna uno por servicio",
    );
  }

  return candidates.map((staff) => buildCandidate(
    services,
    durationByServiceId,
    new Map(services.map((service) => [service.id, staff])),
  ));
}

async function loadBusyRanges(
  businessId: string,
  locationId: string,
  staffMembers: LoadedStaff[],
  rangeStart: Date,
  rangeEnd: Date,
  now: Date,
) {
  const staffIds = staffMembers.map((staff) => staff.id);
  const [appointments, scheduleBlocks, googleRanges] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId,
        staffId: { in: staffIds },
        status: { not: "CANCELLED" },
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      select: { staffId: true, startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.scheduleBlock.findMany({
      where: {
        staffId: { in: staffIds },
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
        AND: [
          { OR: [{ locationId }, { locationId: null }] },
          getPublicBlockingScheduleBlockWhere(now),
        ],
      },
      select: { staffId: true, startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
    Promise.all(staffIds.map(async (staffId) => ({
      staffId,
      ranges: await getGoogleCalendarBusySlots(staffId, rangeStart, rangeEnd),
    }))),
  ]);

  const byStaff = new Map(staffIds.map((staffId) => [staffId, [] as BusyRange[]]));
  for (const range of appointments) {
    if (range.staffId) byStaff.get(range.staffId)?.push(range);
  }
  for (const range of scheduleBlocks) byStaff.get(range.staffId)?.push(range);
  for (const entry of googleRanges) byStaff.get(entry.staffId)?.push(...entry.ranges);
  for (const ranges of byStaff.values()) {
    ranges.sort((left, right) => left.startTime.getTime() - right.startTime.getTime());
  }
  return byStaff;
}

export async function getDashboardAvailability(
  user: AvailabilityUser,
  businessContext: AvailabilityBusiness,
  input: DashboardAvailabilityRequest,
): Promise<DashboardAvailabilityResult> {
  const [permissions, agendaScope, business] = await Promise.all([
    getEffectiveBusinessPermissions(user, businessContext),
    getStaffAgendaScope(user, businessContext),
    prisma.business.findUnique({
      where: { id: businessContext.id },
      include: {
        businessHours: { orderBy: { dayOfWeek: "asc" } },
        scheduleOverrides: { orderBy: { date: "asc" } },
      },
    }),
  ]);
  if (!business) throw new DashboardAvailabilityError("BUSINESS_NOT_FOUND", "Negocio no encontrado", 404);

  const canViewAll = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL);
  const canViewOwn = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN);
  if (!canViewAll && (!canViewOwn || !agendaScope.ownStaffId)) {
    throw new DashboardAvailabilityError("FORBIDDEN", "No tienes acceso a la disponibilidad", 403);
  }

  const location = await prisma.businessLocation.findFirst({
    where: { id: input.locationId, businessId: business.id, isActive: true },
    include: {
      hours: { orderBy: { dayOfWeek: "asc" } },
      scheduleOverrides: { orderBy: { date: "asc" } },
    },
  });
  if (!location) throw new DashboardAvailabilityError("LOCATION_NOT_FOUND", "Sucursal no encontrada", 404);

  if (input.mode === "services" && input.serviceIds.length > business.maxServicesPerBooking) {
    throw new DashboardAvailabilityError(
      "TOO_MANY_SERVICES",
      `Puedes simular hasta ${business.maxServicesPerBooking} servicio(s) por reserva`,
    );
  }

  const [servicesUnsorted, staffMembers] = await Promise.all([
    input.mode === "overview"
      ? Promise.resolve([])
      : loadAvailabilityServices(business.id, input.serviceIds, location.id),
    loadAvailabilityStaff(
      business.id,
      location.id,
      canViewAll ? undefined : agendaScope.ownStaffId ?? "__no_staff_access__",
    ),
  ]);
  if (input.mode === "services" && servicesUnsorted.length !== input.serviceIds.length) {
    throw new DashboardAvailabilityError(
      "SERVICE_NOT_FOUND",
      "Uno o mas servicios no estan disponibles en esta sucursal",
      404,
    );
  }
  const serviceById = new Map(servicesUnsorted.map((service) => [service.id, service]));
  const services = input.serviceIds.map((id) => serviceById.get(id)).filter((service): service is LoadedService => Boolean(service));
  const durationByServiceId = input.mode === "overview"
    ? new Map<string, number>()
    : calculateServiceDurations(services, input.selectedOptionAlternativeIds);
  const overviewStaff = input.mode === "overview" && input.staffId
    ? staffMembers.filter((member) => member.id === input.staffId)
    : staffMembers;
  if (input.mode === "overview" && input.staffId && overviewStaff.length === 0) {
    throw new DashboardAvailabilityError(
      "STAFF_FORBIDDEN",
      "No tienes acceso al profesional seleccionado",
      403,
    );
  }
  const candidates: AvailabilityCandidate[] = input.mode === "overview"
    ? overviewStaff.map((member) => ({
        duration: business.slotInterval,
        groups: [{ staff: member, duration: business.slotInterval, serviceIds: [] }],
        assignments: [],
      }))
    : buildCandidates(input, services, staffMembers, durationByServiceId);

  const startDate = parseDateKey(input.fromDate);
  const now = new Date();
  const localNow = toZonedTime(now, location.timezone);
  const todayKey = localDateKey(localNow);
  const lastAllowedKey = localDateKey(addDays(localNow, 90));
  if (input.fromDate < todayKey || input.fromDate > lastAllowedKey) {
    throw new DashboardAvailabilityError(
      "DATE_OUT_OF_RANGE",
      "La fecha debe estar entre hoy y los proximos 90 dias",
    );
  }

  const dates = Array.from({ length: input.days }, (_, index) => addDays(startDate, index));
  const rangeEndDate = addDays(startDate, input.days);
  const rangeStart = fromZonedTime(`${input.fromDate}T00:00:00`, location.timezone);
  const rangeEnd = fromZonedTime(`${localDateKey(rangeEndDate)}T00:00:00`, location.timezone);
  const candidateStaff = [...new Map(
    candidates.flatMap((candidate) => candidate.groups).map((group) => [group.staff.id, group.staff]),
  ).values()];
  const blockedByStaff = await loadBusyRanges(
    business.id,
    location.id,
    candidateStaff,
    rangeStart,
    rangeEnd,
    now,
  );

  const businessHours = location.hours.length ? location.hours : business.businessHours;
  const businessOverrides = (location.scheduleOverrides.length
    ? location.scheduleOverrides
    : business.scheduleOverrides).map(mapBusinessOverride);
  const cutoff = new Date(now.getTime() + business.minAdvanceBookingMinutes * 60_000);
  const resultDays: DashboardAvailabilityDay[] = [];

  for (const date of dates) {
    const dateKey = localDateKey(date);
    const slotsByTime = new Map<string, DashboardAvailabilitySlot>();

    for (const candidate of candidates) {
      const groupSlots = candidate.groups.map((group) => {
        const blocked = blockedByStaff.get(group.staff.id) ?? [];
        const localBlockedEnds = blocked.map((range) => toZonedTime(range.endTime, location.timezone));
        const locationSchedule = group.staff.locations[0]?.schedule ?? [];
        const staffSchedule = locationSchedule.length ? locationSchedule : group.staff.schedule;
        const staffOverrides = group.staff.scheduleOverrides.map((entry) => ({
          date: entry.date.toISOString().slice(0, 10),
          isOpen: entry.isWorking,
          startTime: entry.startTime,
          endTime: entry.endTime,
          breakStart: entry.breakStart,
          breakEnd: entry.breakEnd,
        }));

        const available = buildSlots(
          date,
          group.duration,
          businessHours,
          staffSchedule,
          business.slotInterval,
          businessOverrides,
          localBlockedEnds,
          staffOverrides,
        ).filter((slot) => {
          const utcSlot = {
            start: fromZonedTime(slot.start, location.timezone),
            end: fromZonedTime(slot.end, location.timezone),
          };
          if (dateKey === todayKey && (!business.allowSameDayBookings || utcSlot.start <= cutoff)) return false;
          return !blocked.some((range) => rangesOverlap(utcSlot, range));
        });

        return new Map(available.map((slot) => [format(slot.start, "HH:mm"), slot]));
      });

      const commonTimes = [...(groupSlots[0]?.keys() ?? [])].filter((time) =>
        groupSlots.every((slots) => slots.has(time)),
      );
      for (const time of commonTimes) {
        const localStart = groupSlots[0].get(time)?.start;
        if (!localStart) continue;
        const startTime = fromZonedTime(localStart, location.timezone);
        const endTime = new Date(startTime.getTime() + candidate.duration * 60_000);
        const existing = slotsByTime.get(time) ?? {
          time,
          startTime: startTime.toISOString(),
          bookingOptions: [],
        };
        existing.bookingOptions.push({
          endTime: endTime.toISOString(),
          assignments: candidate.assignments,
        });
        slotsByTime.set(time, existing);
      }
    }

    resultDays.push({
      date: dateKey,
      slots: [...slotsByTime.values()].sort((left, right) => left.time.localeCompare(right.time)),
    });
  }

  return {
    timezone: location.timezone,
    generatedAt: now.toISOString(),
    durationMinutes: input.mode === "overview"
      ? business.slotInterval
      : Math.max(...candidates.map((candidate) => candidate.duration)),
    serviceNames: services.map((service) => service.name),
    days: resultDays,
  };
}
