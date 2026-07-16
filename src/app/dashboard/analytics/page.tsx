import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { addDays, differenceInMinutes, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Building2, UserRound } from "lucide-react";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { BusinessInsights } from "../business-insights";

export const dynamic = "force-dynamic";

type AnalyticsPeriod = "week" | "month";

const ACTIVE_REVENUE_STATUSES = new Set(["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN", "COMPLETED"]);
const CONFIRMED_STATUSES = new Set(["CONFIRMED", "CHECKED_IN", "COMPLETED"]);

function titleCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function buildAnalytics(
  appointments: {
    customerEmail: string;
    startTime: Date;
    endTime: Date;
    status: string;
    totalDuration: number | null;
    totalPrice: number | null;
    service: { name: string; price: number };
    staff: { name: string } | null;
  }[],
  previousAppointments: {
    startTime: Date;
    endTime: Date;
    status: string;
    totalDuration: number | null;
    totalPrice: number | null;
    service: { name: string; price: number };
    staff: { name: string } | null;
  }[],
) {
  const activeAppointments = appointments.filter((appointment) => ACTIVE_REVENUE_STATUSES.has(appointment.status));
  const previousActiveAppointments = previousAppointments.filter((appointment) => ACTIVE_REVENUE_STATUSES.has(appointment.status));

  const getRevenue = (appointment: { totalPrice: number | null; service: { price: number } }) =>
    Number(appointment.totalPrice ?? appointment.service.price ?? 0);
  const getMinutes = (appointment: { totalDuration: number | null; startTime: Date; endTime: Date }) =>
    appointment.totalDuration ?? Math.max(0, differenceInMinutes(appointment.endTime, appointment.startTime));

  const estimatedRevenue = activeAppointments.reduce((sum, appointment) => sum + getRevenue(appointment), 0);
  const previousRevenue = previousActiveAppointments.reduce((sum, appointment) => sum + getRevenue(appointment), 0);
  const reservedMinutes = activeAppointments.reduce((sum, appointment) => sum + getMinutes(appointment), 0);

  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const dayCounts = new Map<number, number>(dayOrder.map((day) => [day, 0]));
  const serviceMap = new Map<string, { label: string; value: number; revenue: number }>();
  const staffMap = new Map<string, { label: string; value: number; revenue: number }>();

  for (const appointment of activeAppointments) {
    const day = appointment.startTime.getDay();
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);

    const serviceEntry = serviceMap.get(appointment.service.name) ?? { label: appointment.service.name, value: 0, revenue: 0 };
    serviceEntry.value += 1;
    serviceEntry.revenue += getRevenue(appointment);
    serviceMap.set(appointment.service.name, serviceEntry);

    const staffName = appointment.staff?.name ?? "Sin profesional";
    const staffEntry = staffMap.get(staffName) ?? { label: staffName, value: 0, revenue: 0 };
    staffEntry.value += 1;
    staffEntry.revenue += getRevenue(appointment);
    staffMap.set(staffName, staffEntry);
  }

  const dayDistribution = dayOrder.map((day) => ({
    label: titleCase(format(new Date(2026, 5, day === 0 ? 7 : day), "EEEE", { locale: es })),
    value: dayCounts.get(day) ?? 0,
  }));
  const busiestDay = dayDistribution.reduce(
    (best, item) => (item.value > (best?.value ?? 0) ? item : best),
    null as { label: string; value: number } | null
  );
  const topServices = Array.from(serviceMap.values()).sort((a, b) => b.value - a.value || b.revenue - a.revenue).slice(0, 5);
  const topStaff = Array.from(staffMap.values()).sort((a, b) => b.value - a.value || b.revenue - a.revenue).slice(0, 5);

  return {
    appointmentCount: appointments.length,
    activeAppointmentCount: activeAppointments.length,
    estimatedRevenue,
    averageTicket: activeAppointments.length > 0 ? estimatedRevenue / activeAppointments.length : 0,
    reservedHours: reservedMinutes / 60,
    uniqueClients: new Set(appointments.map((appointment) => appointment.customerEmail.toLowerCase())).size,
    pendingCount: appointments.filter((appointment) => appointment.status === "PENDING" || appointment.status === "AWAITING_PAYMENT").length,
    confirmedCount: appointments.filter((appointment) => CONFIRMED_STATUSES.has(appointment.status)).length,
    cancelledCount: appointments.filter((appointment) => appointment.status === "CANCELLED").length,
    noShowCount: appointments.filter((appointment) => appointment.status === "NO_SHOW").length,
    revenueChangePercent: percentChange(estimatedRevenue, previousRevenue),
    appointmentChangePercent: percentChange(activeAppointments.length, previousActiveAppointments.length),
    busiestDay: busiestDay && busiestDay.value > 0 ? busiestDay : null,
    topService: topServices[0] ?? null,
    dayDistribution,
    topServices,
    topStaff,
  };
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ date?: string; agenda?: string; period?: string }> }) {
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
  const period: AnalyticsPeriod = params.period === "month" ? "month" : "week";

  function analyticsHref(agenda?: "mine", periodOverride: AnalyticsPeriod = period) {
    const query = new URLSearchParams();
    if (params.date) query.set("date", params.date);
    if (periodOverride !== "week") query.set("period", periodOverride);
    if (agenda) query.set("agenda", agenda);
    const queryString = query.toString();
    return queryString ? `/dashboard/analytics?${queryString}` : "/dashboard/analytics";
  }

  function calendarHref(agenda?: "mine") {
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
  const analysisStart = period === "month" ? startOfMonth(targetDate) : weekStart;
  const analysisEnd = period === "month" ? endOfMonth(targetDate) : weekEnd;
  const previousAnalysisStart = period === "month" ? startOfMonth(subMonths(targetDate, 1)) : subWeeks(weekStart, 1);
  const previousAnalysisEnd = period === "month" ? endOfMonth(subMonths(targetDate, 1)) : subWeeks(weekEnd, 1);

  const [appointments, previousAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
        ...scopedStaffFilter,
        startTime: { gte: analysisStart, lt: addDays(analysisEnd, 1) },
      },
      include: {
        service: { select: { name: true, price: true } },
        staff: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
        ...scopedStaffFilter,
        startTime: { gte: previousAnalysisStart, lt: addDays(previousAnalysisEnd, 1) },
      },
      include: {
        service: { select: { name: true, price: true } },
        staff: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const metrics = buildAnalytics(appointments, previousAppointments);
  const currentAgendaMode = showingOwnAgenda ? "mine" : undefined;
  const scopeLabel = showingOwnAgenda || !agendaScope.canSeeAllAgendas ? "tu agenda" : "todo el negocio";
  const periodLabel = period === "month"
    ? titleCase(format(analysisStart, "MMMM yyyy", { locale: es }))
    : `${format(analysisStart, "d MMM", { locale: es })} - ${format(analysisEnd, "d MMM yyyy", { locale: es })}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analitica</h1>
          <p className="mt-1 text-muted-foreground">
            Resumen de rendimiento para <span className="font-medium text-[#7C3AED]">{business.name}</span>
          </p>
        </div>

        {canToggleOwnAgenda && (
          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            <Link
              href={analyticsHref(undefined)}
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
              href={analyticsHref("mine")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                showingOwnAgenda
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserRound className="h-4 w-4" />
              Mi analisis
            </Link>
          </div>
        )}
      </div>

      <BusinessInsights
        period={period}
        scopeLabel={scopeLabel}
        periodLabel={periodLabel}
        currentHref={calendarHref(currentAgendaMode)}
        weekHref={analyticsHref(currentAgendaMode, "week")}
        monthHref={analyticsHref(currentAgendaMode, "month")}
        metrics={metrics}
        showTeamBreakdown={agendaScope.canSeeAllAgendas && !showingOwnAgenda}
      />

      <PageTutorial
        tutorialKey="analitica_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "ANALITICA",
              description: "Aqui puedes revisar el rendimiento semanal o mensual de tu negocio, servicios y equipo.",
            },
          },
        ]}
      />
    </div>
  );
}
