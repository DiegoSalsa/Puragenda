import { prisma } from "@/server/db/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { XCircle, AlertTriangle, Clock } from "lucide-react";
import { RescheduleClient } from "./reschedule-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { service: { select: { name: true } }, business: { select: { name: true } } },
  });
  if (!apt) return { title: "Cita no encontrada" };
  return {
    title: `Reagendar — ${apt.service.name} | ${apt.business.name}`,
    description: `Reagenda tu cita de ${apt.service.name} en ${apt.business.name}`,
  };
}

export default async function ReagendarPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: {
        select: {
          name: true,
          slug: true,
          primaryColor: true,
          allowRescheduling: true,
          rescheduleHoursLimit: true,
          timezone: true,
        },
      },
      service: { select: { name: true, duration: true } },
      staff: { select: { id: true, name: true } },
    },
  });

  if (!appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white">
        <div className="text-center space-y-4">
          <XCircle className="mx-auto h-16 w-16 text-red-400" />
          <h1 className="text-2xl font-bold">Cita no encontrada</h1>
          <p className="text-muted-foreground">La cita que buscas no existe o fue eliminada.</p>
        </div>
      </div>
    );
  }

  const pc = appointment.business.primaryColor || "#7C3AED";

  if (appointment.status === "CANCELLED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <XCircle className="mx-auto h-16 w-16 text-red-400" />
          <h1 className="text-2xl font-bold">Cita cancelada</h1>
          <p className="text-muted-foreground">Esta cita ya fue cancelada y no se puede reagendar.</p>
          <a href={`/widget/${appointment.business.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted">
            Agendar nueva cita
          </a>
        </div>
      </div>
    );
  }

  if (appointment.recurringBookingId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <AlertTriangle className="mx-auto h-16 w-16 text-amber-400" />
          <h1 className="text-2xl font-bold">No disponible</h1>
          <p className="text-muted-foreground">Las sesiones de un plan recurrente no se pueden reagendar por esta vía. Contacta al negocio directamente.</p>
        </div>
      </div>
    );
  }

  if (!appointment.business.allowRescheduling) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <AlertTriangle className="mx-auto h-16 w-16 text-amber-400" />
          <h1 className="text-2xl font-bold">Reagendamiento no permitido</h1>
          <p className="text-muted-foreground">Este negocio no permite reagendamiento online. Contacta directamente a {appointment.business.name}.</p>
        </div>
      </div>
    );
  }

  const hoursUntil = (new Date(appointment.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < appointment.business.rescheduleHoursLimit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <Clock className="mx-auto h-16 w-16 text-amber-400" />
          <h1 className="text-2xl font-bold">Tiempo excedido</h1>
          <p className="text-muted-foreground">
            Solo puedes reagendar con al menos {appointment.business.rescheduleHoursLimit} horas de anticipación.
            Tu cita es el {format(new Date(appointment.startTime), "d 'de' MMMM 'a las' HH:mm", { locale: es })}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4 text-white">
      <RescheduleClient
        appointmentId={appointment.id}
        business={{
          name: appointment.business.name,
          slug: appointment.business.slug,
          primaryColor: pc,
          rescheduleHoursLimit: appointment.business.rescheduleHoursLimit,
        }}
        service={{ name: appointment.service.name, duration: appointment.service.duration }}
        staff={appointment.staff}
        currentStart={appointment.startTime.toISOString()}
        currentEnd={appointment.endTime.toISOString()}
      />
    </div>
  );
}
