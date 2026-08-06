import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { getBusinessHours } from "@/server/services/businessHours.service";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import Link from "next/link";
import { Building2, UserRound } from "lucide-react";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { WeeklyCalendar } from "./weekly-calendar";
import { CopyWidgetLink } from "./copy-widget-link";
import { PendingRecurringPanel } from "./pending-recurring-panel";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS, type DashboardPermission } from "@/core/permissions";
import { redirect } from "next/navigation";
import { getCountryConfig } from "@/core/countries";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string; agenda?: string; location?: string }> }) {
  const t = await getTranslations("dashboard.home");
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">{t("authRequired")}</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">{t("businessRequired")}</div>;
  const businessLocale = getCountryConfig(business.countryCode).locale;

  const permissions = await getEffectiveBusinessPermissions(user, business);
  const canSeeAppointments =
    permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN) ||
    permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL);

  if (!canSeeAppointments) {
    const landingRoutes: [DashboardPermission, string][] = [
      [DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN, "/dashboard/analytics"],
      [DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS, "/dashboard/analytics"],
      [DASHBOARD_PERMISSIONS.STAFF_MANAGE, "/dashboard/staff"],
      [DASHBOARD_PERMISSIONS.SERVICES_MANAGE, "/dashboard/services"],
      [DASHBOARD_PERMISSIONS.CLIENTS_MANAGE, "/dashboard/clients"],
      [DASHBOARD_PERMISSIONS.RECURRING_MANAGE, "/dashboard/recurring"],
      [DASHBOARD_PERMISSIONS.LOYALTY_MANAGE, "/dashboard/loyalty"],
      [DASHBOARD_PERMISSIONS.MARKETING_MANAGE, "/dashboard/marketing"],
      [DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE, "/dashboard/appearance/personalizado"],
      [DASHBOARD_PERMISSIONS.REFERRALS_VIEW, "/dashboard/referrals"],
      [DASHBOARD_PERMISSIONS.REWARDS_VIEW, "/dashboard/rewards"],
      [DASHBOARD_PERMISSIONS.SETTINGS_MANAGE, "/dashboard/settings"],
    ];
    const firstAllowedRoute = landingRoutes.find(([permission]) => permissions.includes(permission))?.[1];

    if (firstAllowedRoute) redirect(firstAllowedRoute);
    return <div className="py-20 text-center text-muted-foreground">{t("noFeatures")}</div>;
  }

  const agendaScope = await getStaffAgendaScope(user, business);
  const canManageAllAppointments = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_ALL);
  const canManageOwnAppointments =
    permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN) &&
    !!agendaScope.ownStaffId;
  const canManageAppointments = canManageAllAppointments || canManageOwnAppointments;
  const params = await searchParams;
  const locations = await prisma.businessLocation.findMany({ where: { businessId: business.id, isActive: true }, orderBy: [{ position: "asc" }, { name: "asc" }], include: { hours: { orderBy: { dayOfWeek: "asc" } } } });
  const selectedLocation = locations.find((location) => location.slug === params.location) ?? locations.find((location) => location.isPrimary) ?? locations[0] ?? null;
  const locationFilter = selectedLocation
    ? selectedLocation.isPrimary || locations.length === 1
      ? { OR: [{ locationId: selectedLocation.id }, { locationId: null }] }
      : { locationId: selectedLocation.id }
    : {};
  const canToggleOwnAgenda = agendaScope.canSeeAllAgendas && !!agendaScope.ownStaffId;
  const showingOwnAgenda = canToggleOwnAgenda && params.agenda === "mine";
  const scopedStaffFilter = agendaScope.canSeeAllAgendas
    ? (showingOwnAgenda ? { staffId: agendaScope.ownStaffId ?? "__no_staff_access__" } : {})
    : { staffId: agendaScope.staffId ?? "__no_staff_access__" };

  function dashboardHref(agenda?: "mine", location?: string) {
    const query = new URLSearchParams();
    if (params.date) query.set("date", params.date);
    if (agenda) query.set("agenda", agenda);
    if (location) query.set("location", location);
    const queryString = query.toString();
    return queryString ? `/dashboard?${queryString}` : "/dashboard";
  }

  let targetDate = new Date();
  if (params.date) {
    try {
      targetDate = parseISO(params.date);
    } catch {
      targetDate = new Date();
    }
  }

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

  const [weekAppointments, priorityBlocks, businessHours, pendingRecurring, appointmentServices, appointmentStaff, appointmentClients] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
        ...locationFilter,
        ...scopedStaffFilter,
        startTime: { gte: weekStart, lt: addDays(weekEnd, 1) },
      },
      include: {
        service: true,
        staff: true,
        client: { select: { privateNotes: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.scheduleBlock.findMany({
      where: {
        type: "PRIORITY",
        staff: { businessId: business.id },
        ...("staffId" in scopedStaffFilter ? { staffId: scopedStaffFilter.staffId } : {}),
        startTime: { lt: addDays(weekEnd, 1) },
        endTime: { gt: weekStart },
      },
      include: { staff: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    }),
    selectedLocation ? Promise.resolve(selectedLocation.hours) : getBusinessHours(business.id),
    prisma.recurringBooking.findMany({
      where: { businessId: business.id, status: "PENDING_APPROVAL", ...locationFilter, ...scopedStaffFilter },
      orderBy: { createdAt: "asc" },
      include: {
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
    }),
    canManageAppointments
      ? prisma.service.findMany({
          where: { businessId: business.id, bookingMode: "APPOINTMENT", ...(selectedLocation ? { locations: { some: { locationId: selectedLocation.id } } } : {}) },
          orderBy: { name: "asc" },
          include: {
            staff: { where: { isActive: true }, select: { id: true } },
            optionCategories: {
              orderBy: { position: "asc" },
              include: { alternatives: { orderBy: { position: "asc" } } },
            },
          },
        })
      : Promise.resolve([]),
    canManageAppointments
      ? prisma.staff.findMany({
          where: {
            businessId: business.id,
            isActive: true,
            ...(!canManageAllAppointments && agendaScope.ownStaffId
              ? { id: agendaScope.ownStaffId }
              : {}),
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    canManageAppointments
      ? prisma.client.findMany({
          where: { businessId: business.id },
          orderBy: { updatedAt: "desc" },
          take: 200,
          select: { id: true, name: true, email: true, phone: true },
        })
      : Promise.resolve([]),
  ]);

  const serialized = weekAppointments.map((appointment) => ({
    id: appointment.id,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    clientId: appointment.clientId,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
    status: appointment.status,
    serviceId: appointment.serviceId,
    serviceName: appointment.service.name,
    staffId: appointment.staffId,
    staffName: appointment.staff?.name || t("unassigned"),
    selectedOptions: (appointment.selectedOptions as { alternativeId?: string; categoryName: string; alternativeName: string; priceDelta: number; durationDelta: number }[] | null) ?? [],
    recurringBookingId: appointment.recurringBookingId ?? null,
    clientNotes: appointment.client?.privateNotes ?? null,
    internalNotes: appointment.internalNotes,
  }));

  const pendingSerialized = pendingRecurring.map((booking) => ({
    id: booking.id,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    serviceName: booking.service.name,
    staffName: booking.staff?.name ?? null,
    selectedDays: booking.selectedDays,
    selectedTimes: booking.selectedTimes as Record<string, string>,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    durationMonths: booking.durationMonths,
    healthAnswers: booking.healthAnswers as Record<string, string> | null,
    healthFreeText: booking.healthFreeText,
    createdAt: booking.createdAt.toISOString(),
  }));
  const serializedPriorityBlocks = priorityBlocks.map((block) => ({
    id: block.id,
    staffId: block.staffId,
    staffName: block.staff.name,
    startTime: block.startTime.toISOString(),
    endTime: block.endTime.toISOString(),
    reason: block.reason,
    releaseAt: block.releaseAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle", { business: business.name })}</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <CopyWidgetLink slug={business.slug} />
          {canToggleOwnAgenda && (
            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
              <Link
                href={dashboardHref()}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  !showingOwnAgenda
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-4 w-4" />
                {t("wholeBusiness")}
              </Link>
              <Link
                href={dashboardHref("mine")}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  showingOwnAgenda
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserRound className="h-4 w-4" />
                {t("mySchedule")}
              </Link>
            </div>
          )}
        </div>
      </div>

      <SubscriptionBanner
        businessId={business.id}
        timezone={business.timezone}
        countryCode={business.countryCode}
      />

      {locations.length > 1 && <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
        {locations.map((location) => <Link key={location.id} href={dashboardHref(showingOwnAgenda ? "mine" : undefined, location.slug)} className={`rounded-lg px-3 py-2 text-sm font-medium ${selectedLocation?.id === location.id ? "bg-[#7C3AED] text-white" : "bg-muted text-muted-foreground"}`}>{location.name}</Link>)}
      </div>}

      {pendingSerialized.length > 0 && (
        <PendingRecurringPanel bookings={pendingSerialized} locale={businessLocale} />
      )}

      <WeeklyCalendar
        appointments={serialized}
        priorityBlocks={serializedPriorityBlocks}
        weekStartISO={format(weekStart, "yyyy-MM-dd")}
        agendaMode={showingOwnAgenda ? "mine" : undefined}
        businessHours={businessHours.map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          startTime: hour.startTime,
          endTime: hour.endTime,
          isOpen: hour.isOpen,
        }))}
        canManageAppointments={canManageAppointments}
        services={appointmentServices.map((service) => ({
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
        }))}
        staff={appointmentStaff}
        clients={appointmentClients}
        currencyCode={business.currencyCode}
      />

      <PageTutorial
        tutorialKey="citas_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: t("tutorialTitle"),
              description: t("tutorialDescription"),
            },
          },
        ]}
      />
    </div>
  );
}
