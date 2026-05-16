import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { RecurringClient } from "./recurring-client";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesion para acceder al dashboard</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio configurado aun</div>;

  const bookings = await prisma.recurringBooking.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    include: {
      service: { select: { id: true, name: true, duration: true } },
      staff: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, email: true } },
      appointments: {
        orderBy: { startTime: "asc" },
        select: { id: true, startTime: true, endTime: true, status: true },
      },
      sessionOverrides: {
        orderBy: { createdAt: "desc" },
        select: { id: true, originalDate: true, newTime: true, reason: true, requestedByClient: true, createdAt: true },
      },
      _count: { select: { appointments: true } },
    },
  });

  const serialized = bookings.map((b) => ({
    id: b.id,
    status: b.status as string,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    customerRut: b.customerRut,
    serviceName: b.service.name,
    serviceId: b.service.id,
    staffName: b.staff?.name ?? null,
    staffId: b.staff?.id ?? null,
    clientId: b.client?.id ?? null,
    selectedDays: b.selectedDays,
    selectedTimes: b.selectedTimes as Record<string, string>,
    startDate: b.startDate.toISOString(),
    endDate: b.endDate.toISOString(),
    durationMonths: b.durationMonths,
    internalNotes: b.internalNotes,
    healthAnswers: b.healthAnswers as Record<string, string> | null,
    healthFreeText: b.healthFreeText,
    pausedUntil: b.pausedUntil?.toISOString() ?? null,
    managementToken: b.managementToken,
    createdAt: b.createdAt.toISOString(),
    totalAppointments: b._count.appointments,
    completedAppointments: b.appointments.filter((a) => ["CHECKED_IN", "COMPLETED"].includes(a.status)).length,
    appointments: b.appointments.map((a) => ({
      id: a.id,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString(),
      status: a.status as string,
    })),
    sessionOverrides: b.sessionOverrides.map((o) => ({
      id: o.id,
      originalDate: o.originalDate.toISOString(),
      newTime: o.newTime,
      reason: o.reason,
      requestedByClient: o.requestedByClient,
      createdAt: o.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suscripciones recurrentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona los planes de reserva fija de tus clientes · {bookings.length} total
        </p>
      </div>
      <RecurringClient bookings={serialized} />
    </div>
  );
}
