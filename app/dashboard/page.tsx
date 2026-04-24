import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
import { getAppointments } from "@/server/services/appointment.service";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Users, UserCheck, UserX } from "lucide-react";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { WeeklyCalendar } from "./weekly-calendar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentSessionUser();
  if (!user) {
    return <div className="py-20 text-center text-white/40">Debes iniciar sesión para acceder al dashboard</div>;
  }

  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) {
    return <div className="py-20 text-center text-white/40">No tienes un negocio configurado aún</div>;
  }

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const weekAppointments = await getAppointments(business.id, {
    from: weekStart,
    to: addDays(weekEnd, 1),
  });

  const todayCount = weekAppointments.filter((a) => isSameDay(new Date(a.startTime), today)).length;
  const totalServices = await prisma.service.count({ where: { businessId: business.id } });
  const pendingCount = weekAppointments.filter((a) => a.status === "PENDING").length;
  const checkedInCount = weekAppointments.filter((a) => a.status === "CHECKED_IN").length;

  // Serialize appointments for the client component
  const serialized = weekAppointments.map((a) => ({
    id: a.id,
    customerName: a.customerName,
    customerEmail: a.customerEmail,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    status: a.status,
    serviceName: a.service.name,
    staffName: a.staff?.name || "Sin asignar",
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-white/40">
          Resumen semanal para{" "}
          <span className="font-medium text-[#7C3AED]">{business.name}</span>
        </p>
      </div>

      <SubscriptionBanner businessId={business.id} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Hoy", value: todayCount, sub: format(today, "EEEE, d MMM", { locale: es }), icon: Calendar },
          { label: "Pendientes", value: pendingCount, sub: "Por confirmar", icon: Clock },
          { label: "Asistidos", value: checkedInCount, sub: "Esta semana", icon: UserCheck },
          { label: "Servicios", value: totalServices, sub: "Activos", icon: Users },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/[0.06] bg-[#111] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white/40">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-white/20" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-white/30">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Weekly Calendar */}
      <WeeklyCalendar
        appointments={serialized}
        weekStartISO={weekStart.toISOString()}
      />
    </div>
  );
}
