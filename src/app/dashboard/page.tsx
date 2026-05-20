import { getBusinessForUser } from "@/server/services/business.service";
// appointment.service import removed — using direct prisma query for richer includes
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, UserCheck, Users } from "lucide-react";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { WeeklyCalendar } from "./weekly-calendar";
import { CopyWidgetLink } from "./copy-widget-link";
import { PendingRecurringPanel } from "./pending-recurring-panel";
import { PageTutorial } from "@/components/dashboard/page-tutorial";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión para acceder al dashboard</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio configurado aún</div>;

  // Resolve staffId for role-based filtering
  let userStaffId: string | undefined;
  if (user.role === "STAFF") {
    const staffRecord = await prisma.staff.findFirst({ where: { userId: user.id, businessId: business.id, isActive: true } });
    userStaffId = staffRecord?.id;
  }

  const params = await searchParams;
  const today = new Date();

  // URL-based week navigation
  let targetDate = today;
  if (params.date) {
    try { targetDate = parseISO(params.date); } catch { targetDate = today; }
  }

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

  const weekAppointments = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
      ...(userStaffId && { staffId: userStaffId }),
      startTime: { gte: weekStart, lt: addDays(weekEnd, 1) },
    },
    include: {
      service: true,
      staff: true,
      client: { select: { privateNotes: true } },
    },
    orderBy: { startTime: "asc" },
  });
  const todayCount = weekAppointments.filter((a) => isSameDay(new Date(a.startTime), today)).length;
  const totalServices = await prisma.service.count({ where: { businessId: business.id } });
  const pendingCount = weekAppointments.filter((a) => a.status === "PENDING").length;
  const checkedInCount = weekAppointments.filter((a) => a.status === "CHECKED_IN").length;

  const serialized = weekAppointments.map((a) => ({
    id: a.id, customerName: a.customerName, customerEmail: a.customerEmail,
    startTime: a.startTime.toISOString(), endTime: a.endTime.toISOString(),
    status: a.status, serviceName: a.service.name, staffName: a.staff?.name || "Sin asignar",
    recurringBookingId: a.recurringBookingId ?? null,
    clientNotes: a.client?.privateNotes ?? null,
  }));

  // Pending recurring approvals
  const pendingRecurring = await prisma.recurringBooking.findMany({
    where: { businessId: business.id, status: "PENDING_APPROVAL" },
    orderBy: { createdAt: "asc" },
    include: {
      service: { select: { id: true, name: true } },
      staff: { select: { id: true, name: true } },
    },
  });

  const pendingSerialized = pendingRecurring.map((b) => ({
    id: b.id,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    serviceName: b.service.name,
    staffName: b.staff?.name ?? null,
    selectedDays: b.selectedDays,
    selectedTimes: b.selectedTimes as Record<string, string>,
    startDate: b.startDate.toISOString(),
    endDate: b.endDate.toISOString(),
    durationMonths: b.durationMonths,
    healthAnswers: b.healthAnswers as Record<string, string> | null,
    healthFreeText: b.healthFreeText,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Resumen semanal para <span className="font-medium text-[#7C3AED]">{business.name}</span>
          </p>
        </div>
        <CopyWidgetLink slug={business.slug} />
      </div>

      <SubscriptionBanner businessId={business.id} />

      {pendingSerialized.length > 0 && (
        <PendingRecurringPanel bookings={pendingSerialized} />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Hoy", value: todayCount, sub: format(today, "EEEE, d MMM", { locale: es }), icon: Calendar },
          { label: "Pendientes", value: pendingCount, sub: "Por confirmar", icon: Clock },
          { label: "Asistidos", value: checkedInCount, sub: "Esta semana", icon: UserCheck },
          { label: "Servicios", value: totalServices, sub: "Activos", icon: Users },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{stat.sub}</p>
          </div>
        ))}
      </div>

      <WeeklyCalendar appointments={serialized} weekStartISO={format(weekStart, "yyyy-MM-dd")} />

      <PageTutorial
        tutorialKey="citas_v1"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "TUS CITAS",
              description: "Bienvenido al centro de control. Aquí puedes ver un resumen de tu semana y todas tus citas agendadas.",
            }
          },
          {
            element: ".grid-cols-2",
            popover: {
              title: "MÉTRICAS RÁPIDAS",
              description: "Un vistazo a las citas de hoy, pendientes por confirmar, y el rendimiento de la semana.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "button[title='Nueva cita']",
            popover: {
              title: "AGENDAR CITA MANUAL",
              description: "Puedes agendar una cita manualmente para clientes que te llamen por teléfono desde el calendario.",
              side: "left",
              align: "end"
            }
          }
        ]}
      />
    </div>
  );
}
