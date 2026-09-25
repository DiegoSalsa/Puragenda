import { DASHBOARD_PERMISSIONS, type DashboardPermission } from "@/core/permissions";
import { usesBusinessScheduleOnly } from "@/core/subscription-plan";
import {
  buildTodayModel,
  canSeeTodayMoney,
  locationDayWindow,
  resolveAgendaStaffFilter,
  resolveLocationFilter,
  shouldShowProfessional,
  type TodayAppointmentInput,
  type TodayOpportunityInput,
} from "@/lib/today-dashboard";
import { prisma } from "@/server/db/prisma";
import { getStaffAgendaScope } from "@/server/services/business.service";
import { getAvailabilityStoryOpportunities } from "@/server/services/availability-story.service";

type DashboardUser = { id: string; role: string };
type DashboardBusiness = {
  id: string;
  ownerId: string | null;
  name: string;
  slug: string;
  timezone: string;
  currencyCode: string;
  allowSameDayBookings: boolean;
  depositRequired: boolean;
  mpAccessToken: string | null;
  mpUserId: string | null;
};

const NO_ACCESS = "__no_staff_access__";

export async function loadTodayDashboard(input: {
  user: DashboardUser;
  business: DashboardBusiness;
  permissions: DashboardPermission[];
  agenda?: string;
  location?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const { user, business, permissions } = input;
  const agendaScope = await getStaffAgendaScope(user, business);
  const canManageAll = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_ALL);
  const canManageOwn = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN) && !!agendaScope.ownStaffId;
  const canManageAppointments = canManageAll || canManageOwn;
  const canReviewRecurring = permissions.includes(DASHBOARD_PERMISSIONS.RECURRING_MANAGE);
  const canBlockTime = permissions.includes(DASHBOARD_PERMISSIONS.STAFF_MANAGE);
  const canGenerateStory = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL)
    || (permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN) && !!agendaScope.ownStaffId);

  const [locations, subscription] = await Promise.all([
    prisma.businessLocation.findMany({
      where: { businessId: business.id, isActive: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, timezone: true, isPrimary: true },
    }),
    prisma.subscription.findUnique({ where: { businessId: business.id }, select: { plan: true } }),
  ]);

  const selectedLocation = locations.find((location) => location.slug === input.location)
    ?? locations.find((location) => location.isPrimary)
    ?? locations[0]
    ?? null;
  const timeZone = selectedLocation?.timezone ?? business.timezone;
  const day = locationDayWindow(now, timeZone);
  const canToggleOwnAgenda = agendaScope.canSeeAllAgendas && !!agendaScope.ownStaffId;
  const showingOwnAgenda = canToggleOwnAgenda && input.agenda === "mine";
  const staffFilter = resolveAgendaStaffFilter(agendaScope, showingOwnAgenda);
  const locationFilter = resolveLocationFilter(selectedLocation, locations.length);
  const individual = usesBusinessScheduleOnly(subscription?.plan);
  const showMoney = canSeeTodayMoney({
    canSeeAllAgendas: agendaScope.canSeeAllAgendas,
    showingOwnAgenda,
    permissions,
  });

  const storyStaffId = agendaScope.canSeeAllAgendas
    ? (showingOwnAgenda ? agendaScope.ownStaffId : null)
    : agendaScope.ownStaffId;

  const [appointments, pendingRecurring, services, staff, clients, opportunities] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
        ...locationFilter,
        ...staffFilter,
        startTime: { gte: day.start, lt: day.end },
      },
      orderBy: { startTime: "asc" },
      include: {
        service: { select: { id: true, name: true, price: true } },
        staff: { select: { id: true, name: true } },
        client: { select: { privateNotes: true } },
        posPayments: { where: { status: "APPROVED" }, select: { amount: true } },
      },
    }),
    canReviewRecurring
      ? prisma.recurringBooking.count({
          where: {
            businessId: business.id,
            status: "PENDING_APPROVAL",
            ...locationFilter,
            ...staffFilter,
          },
        })
      : Promise.resolve(0),
    prisma.service.findMany({
      where: {
        businessId: business.id,
        bookingMode: "APPOINTMENT",
        ...(selectedLocation ? { locations: { some: { locationId: selectedLocation.id } } } : {}),
        ...(!agendaScope.canSeeAllAgendas
          ? agendaScope.ownStaffId
            ? { OR: [{ staff: { none: {} } }, { staff: { some: { id: agendaScope.ownStaffId } } }] }
            : { id: NO_ACCESS }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        staff: { where: { isActive: true }, select: { id: true } },
        optionCategories: {
          orderBy: { position: "asc" },
          include: { alternatives: { orderBy: { position: "asc" } } },
        },
      },
    }),
    prisma.staff.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        ...(selectedLocation ? { locations: { some: { locationId: selectedLocation.id, isActive: true } } } : {}),
        ...(!agendaScope.canSeeAllAgendas ? { id: agendaScope.ownStaffId ?? NO_ACCESS } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    canManageAppointments
      ? prisma.client.findMany({
          where: {
            businessId: business.id,
            ...(!agendaScope.canSeeAllAgendas && !permissions.includes(DASHBOARD_PERMISSIONS.CLIENTS_MANAGE)
              ? { appointments: { some: { staffId: agendaScope.ownStaffId ?? NO_ACCESS } } }
              : {}),
          },
          orderBy: { updatedAt: "desc" },
          take: 200,
          select: { id: true, name: true, email: true, phone: true },
        })
      : Promise.resolve([]),
    selectedLocation && business.allowSameDayBookings && canGenerateStory
      ? getAvailabilityStoryOpportunities(user, business, 1, 12, {
          locationId: selectedLocation.id,
          staffId: storyStaffId,
          dateKey: day.dateKey,
        })
      : Promise.resolve([]),
  ]);

  const sources: TodayAppointmentInput[] = appointments.map((appointment) => ({
    id: appointment.id,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    depositAmount: appointment.depositAmount,
    totalPrice: appointment.totalPrice,
    servicePrice: appointment.service.price,
    posPaidAmount: appointment.posPayments.reduce((total, payment) => total + payment.amount, 0),
    giftCardPaidAmount: appointment.giftCardPaidAmount,
    settledAt: appointment.settledAt,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    staffId: appointment.staffId,
  }));
  const storyOpportunities: TodayOpportunityInput[] = opportunities.map((opportunity) => ({
    locationId: opportunity.locationId,
    staffId: opportunity.staffId,
    serviceId: opportunity.serviceId,
    date: opportunity.date,
    slotCount: opportunity.slotCount,
    times: opportunity.times,
  }));
  const model = buildTodayModel({
    now,
    dateKey: day.dateKey,
    appointments: sources,
    pendingRecurring,
    canReviewRecurring,
    opportunities: storyOpportunities,
    allowSameDayBookings: business.allowSameDayBookings,
  });
  const byId = new Map(model.rows.map((row) => [row.id, row]));

  return {
    businessName: business.name,
    businessSlug: business.slug,
    currencyCode: business.currencyCode,
    timeZone,
    dateKey: day.dateKey,
    showStaff: shouldShowProfessional({
      individual,
      canSeeAllAgendas: agendaScope.canSeeAllAgendas,
      showingOwnAgenda,
    }),
    canManageAppointments,
    canBlockTime,
    canGenerateStory,
    canSeeMoney: showMoney,
    showOpenSlots: business.allowSameDayBookings,
    locations: locations.map((location) => ({ id: location.id, name: location.name, slug: location.slug })),
    selectedLocationId: selectedLocation?.id ?? null,
    selectedLocationSlug: selectedLocation?.slug ?? null,
    canToggleOwnAgenda,
    showingOwnAgenda,
    posEnabled: business.depositRequired && Boolean(business.mpAccessToken && business.mpUserId),
    kpis: {
      appointments: model.counts.appointments,
      cancelled: model.counts.cancelled,
      collected: showMoney ? model.totals.collected : 0,
      pending: showMoney ? model.totals.pending : 0,
      projected: showMoney ? model.totals.projected : 0,
      openSlots: model.openSlots,
    },
    dayState: model.dayState,
    finished: {
      completed: model.counts.completed,
      cancelled: model.counts.cancelled,
      noShow: model.counts.noShow,
      pendingActions: model.counts.pendingActions,
    },
    attention: showMoney ? model.attention : model.attention.map((item) => ({ ...item, amount: undefined })),
    story: model.story,
    appointments: appointments.map((appointment) => {
      const row = byId.get(appointment.id);
      return {
        id: appointment.id,
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        customerPhone: appointment.customerPhone,
        clientId: appointment.clientId,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        depositAmount: appointment.depositAmount,
        totalPrice: appointment.totalPrice ?? appointment.service.price,
        posPaidAmount: appointment.posPayments.reduce((total, payment) => total + payment.amount, 0),
        depositPaymentUrl: appointment.depositPaymentUrl,
        depositReceiptStatus: appointment.depositReceiptStatus,
        depositReceiptOriginalName: appointment.depositReceiptOriginalName,
        depositReceiptUploadedAt: appointment.depositReceiptUploadedAt?.toISOString() ?? null,
        serviceId: appointment.serviceId,
        serviceName: appointment.service.name,
        staffId: appointment.staffId,
        staffName: appointment.staff?.name ?? "",
        selectedOptions: (appointment.selectedOptions as { alternativeId?: string; categoryName: string; alternativeName: string; priceDelta: number; durationDelta: number }[] | null) ?? [],
        recurringBookingId: appointment.recurringBookingId ?? null,
        clientNotes: appointment.client?.privateNotes ?? null,
        internalNotes: appointment.internalNotes,
        sessionBaseAmount: appointment.sessionBaseAmount,
        tipAmount: appointment.tipAmount,
        postSessionItems: (appointment.postSessionItems as { description: string; amount: number }[] | null) ?? [],
        paymentMethod: appointment.paymentMethod,
        settledAt: appointment.settledAt?.toISOString() ?? null,
        phase: row?.phase ?? "past",
        paymentLabel: row?.label ?? "none",
        collected: showMoney ? row?.collected ?? 0 : 0,
        pending: showMoney ? row?.pending ?? 0 : 0,
      };
    }),
    blockStaff: (showingOwnAgenda || !agendaScope.canSeeAllAgendas
      ? staff.filter((member) => member.id === agendaScope.ownStaffId)
      : staff),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      duration: service.duration,
      price: service.price,
      staffIds: service.staff.map((member) => member.id),
      optionCategories: service.optionCategories.map((category) => ({
        id: category.id,
        name: category.name,
        isRequired: category.isRequired,
        maxSelections: category.maxSelections,
        alternatives: category.alternatives.map((alternative) => ({
          id: alternative.id,
          name: alternative.name,
          priceDelta: alternative.priceDelta,
          durationDelta: alternative.durationDelta,
        })),
      })),
    })),
    staff,
    clients,
  };
}

export type TodayDashboardData = Awaited<ReturnType<typeof loadTodayDashboard>>;
