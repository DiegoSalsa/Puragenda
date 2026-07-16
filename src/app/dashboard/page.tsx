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

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string; agenda?: string }> }) {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesion para acceder al dashboard</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio configurado aun</div>;

  const agendaScope = await getStaffAgendaScope(user, business);
  const params = await searchParams;
  const canToggleOwnAgenda = agendaScope.canSeeAllAgendas && !!agendaScope.ownStaffId;
  const showingOwnAgenda = canToggleOwnAgenda && params.agenda === "mine";
  const scopedStaffFilter = agendaScope.canSeeAllAgendas
    ? (showingOwnAgenda ? { staffId: agendaScope.ownStaffId ?? "__no_staff_access__" } : {})
    : { staffId: agendaScope.staffId ?? "__no_staff_access__" };

  function dashboardHref(agenda?: "mine") {
    const query = new URLSearchParams();
    if (params.date) query.set("date", params.date);
    if (agenda) query.set("agenda", agenda);
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

  const [weekAppointments, businessHours, pendingRecurring] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
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
    getBusinessHours(business.id),
    prisma.recurringBooking.findMany({
      where: { businessId: business.id, status: "PENDING_APPROVAL", ...scopedStaffFilter },
      orderBy: { createdAt: "asc" },
      include: {
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
    }),
  ]);

  const serialized = weekAppointments.map((appointment) => ({
    id: appointment.id,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
    status: appointment.status,
    serviceName: appointment.service.name,
    staffName: appointment.staff?.name || "Sin asignar",
    selectedOptions: (appointment.selectedOptions as { categoryName: string; alternativeName: string; priceDelta: number; durationDelta: number }[] | null) ?? [],
    recurringBookingId: appointment.recurringBookingId ?? null,
    clientNotes: appointment.client?.privateNotes ?? null,
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Citas</h1>
          <p className="mt-1 text-muted-foreground">
            Calendario de reservas para <span className="font-medium text-[#7C3AED]">{business.name}</span>
          </p>
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
                Todo el negocio
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
                Mi agenda
              </Link>
            </div>
          )}
        </div>
      </div>

      <SubscriptionBanner businessId={business.id} />

      {pendingSerialized.length > 0 && (
        <PendingRecurringPanel bookings={pendingSerialized} />
      )}

      <WeeklyCalendar
        appointments={serialized}
        weekStartISO={format(weekStart, "yyyy-MM-dd")}
        agendaMode={showingOwnAgenda ? "mine" : undefined}
        businessHours={businessHours.map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          startTime: hour.startTime,
          endTime: hour.endTime,
          isOpen: hour.isOpen,
        }))}
      />

      <PageTutorial
        tutorialKey="citas_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "CALENDARIO DE CITAS",
              description: "Aqui veras todas las reservas en tiempo real. Puedes cambiar a vista de semana o dia y revisar el detalle de cada cita.",
            },
          },
        ]}
      />
    </div>
  );
}
