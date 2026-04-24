import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
import { getAppointments } from "@/server/services/appointment.service";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Users } from "lucide-react";
import { AppointmentActions } from "./appointment-actions";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return (
      <div className="py-20 text-center text-white/40">
        Debes iniciar sesión para acceder al dashboard
      </div>
    );
  }

  const business = await getFirstBusinessByOwnerId(user.id);

  if (!business) {
    return (
      <div className="py-20 text-center text-white/40">
        No tienes un negocio configurado aún
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointments = await getAppointments(business.id, {
    from: today,
    to: tomorrow,
  });

  const allAppointments = await getAppointments(business.id);

  const totalServices = await prisma.service.count({
    where: { businessId: business.id },
  });

  const pendingCount = allAppointments.filter(
    (a) => a.status === "PENDING"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-white/40">
          Resumen de citas para{" "}
          <span className="font-medium text-[#7C3AED]">{business.name}</span>
        </p>
      </div>

      {/* Subscription Upsell */}
      <SubscriptionBanner businessId={business.id} />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            label: "Citas Hoy",
            value: todayAppointments.length,
            sub: format(today, "EEEE, d 'de' MMMM", { locale: es }),
            icon: Calendar,
          },
          {
            label: "Pendientes",
            value: pendingCount,
            sub: "Citas por confirmar",
            icon: Clock,
          },
          {
            label: "Servicios",
            value: totalServices,
            sub: "Servicios activos",
            icon: Users,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/[0.06] bg-[#111] p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white/40">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-white/20" />
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-white/30">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Appointments Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111]">
        <div className="border-b border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold">Todas las Citas</h2>
        </div>

        <div className="p-6">
          {allAppointments.length === 0 ? (
            <div className="py-12 text-center text-white/30">
              <Calendar className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p>No hay citas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-white/30">
                    <th className="pb-3 pr-4">Cliente</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Servicio</th>
                    <th className="pb-3 pr-4">Profesional</th>
                    <th className="pb-3 pr-4">Fecha y Hora</th>
                    <th className="pb-3 pr-4">Estado</th>
                    <th className="pb-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allAppointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-3.5 pr-4 font-medium">
                        {appointment.customerName}
                      </td>
                      <td className="py-3.5 pr-4 text-white/40">
                        {appointment.customerEmail}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-medium text-[#7C3AED]">
                          {appointment.service.name}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-white/40">
                        {appointment.staff?.name || "—"}
                      </td>
                      <td className="py-3.5 pr-4 text-white/40">
                        {format(
                          new Date(appointment.startTime),
                          "dd/MM/yyyy HH:mm",
                          { locale: es }
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${
                            appointment.status === "CONFIRMED"
                              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : appointment.status === "CANCELLED"
                              ? "border border-red-500/20 bg-red-500/10 text-red-400"
                              : "border border-white/10 bg-white/[0.03] text-white/50"
                          }`}
                        >
                          {appointment.status === "CONFIRMED"
                            ? "Confirmada"
                            : appointment.status === "CANCELLED"
                            ? "Cancelada"
                            : "Pendiente"}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <AppointmentActions
                          id={appointment.id}
                          currentStatus={appointment.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
