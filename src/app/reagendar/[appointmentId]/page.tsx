
import { LocalizedText } from "@/components/i18n/localized-text";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { XCircle, AlertTriangle, Clock } from "lucide-react";
import { RescheduleClient } from "./reschedule-client";
import { getCustomerAppointmentByToken } from "@/server/services/customer-appointment-action.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reagendar cita | Puragenda",
  robots: { index: false, follow: false },
};

export default async function ReagendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { appointmentId } = await params;
  const { token = "" } = await searchParams;

  const appointment = await getCustomerAppointmentByToken(token);

  if (
    !appointment ||
    appointment.id !== appointmentId ||
    !appointment.business.includeAppointmentActionsInConfirmationEmail
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white">
        <div className="text-center space-y-4">
          <XCircle className="mx-auto h-16 w-16 text-red-400" />
          <h1 className="text-2xl font-bold"><LocalizedText id="mMWo3jW6vyD6" /></h1>
          <p className="text-muted-foreground"><LocalizedText id="GQ1YopSk3kbO" /></p>
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
          <h1 className="text-2xl font-bold"><LocalizedText id="NPDbki-l2i52" /></h1>
          <p className="text-muted-foreground"><LocalizedText id="7mMAlMm9Jr2L" /></p>
          <a href={`/widget/${appointment.business.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted">
            <LocalizedText id="Vd8dZZkwEjcT" />
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
          <h1 className="text-2xl font-bold"><LocalizedText id="t4H2vZuY5D1V" /></h1>
          <p className="text-muted-foreground"><LocalizedText id="Cge9YE4_zqxu" /></p>
        </div>
      </div>
    );
  }

  if (!appointment.business.allowRescheduling) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <AlertTriangle className="mx-auto h-16 w-16 text-amber-400" />
          <h1 className="text-2xl font-bold"><LocalizedText id="fUMCoWzvAanJ" /></h1>
          <p className="text-muted-foreground"><LocalizedText id="zIJ4AlksuUWi" /> {appointment.business.name}.</p>
        </div>
      </div>
    );
  }

  // Dynamic server rendering intentionally compares against the request time.
  // eslint-disable-next-line react-hooks/purity
  const hoursUntil = (new Date(appointment.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < appointment.business.rescheduleHoursLimit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <Clock className="mx-auto h-16 w-16 text-amber-400" />
          <h1 className="text-2xl font-bold"><LocalizedText id="JOztGH-hM96k" /></h1>
          <p className="text-muted-foreground">
            <LocalizedText id="-Yla4hbAWIUS" /> {appointment.business.rescheduleHoursLimit} <LocalizedText id="yerk0QOxT_KQ" /> {format(new Date(appointment.startTime), "d 'de' MMMM 'a las' HH:mm", { locale: es })}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4 text-white">
      <RescheduleClient
        appointmentId={appointment.id}
        token={token}
        business={{
          name: appointment.business.name,
          slug: appointment.business.slug,
          primaryColor: pc,
          rescheduleHoursLimit: appointment.business.rescheduleHoursLimit,
          timezone: appointment.business.timezone,
        }}
        service={{
          name: appointment.service.name,
          duration: appointment.totalDuration ?? appointment.service.duration,
        }}
        staff={appointment.staff}
        currentStart={appointment.startTime.toISOString()}
        currentEnd={appointment.endTime.toISOString()}
      />
    </div>
  );
}
