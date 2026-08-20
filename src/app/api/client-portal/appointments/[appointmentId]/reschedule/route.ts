import { NextRequest } from "next/server";
import { issueCustomerAppointmentToken } from "@/server/services/customer-appointment-action.service";
import {
  getClientPortalAppointment,
  getClientPortalEmailFromRequest,
} from "@/server/services/client-portal.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const email = await getClientPortalEmailFromRequest(request);
  if (!email) return Response.json({ error: "Acceso vencido" }, { status: 401 });

  const { appointmentId } = await params;
  const appointment = await getClientPortalAppointment(appointmentId, email);
  if (!appointment) return Response.json({ error: "Cita no encontrada" }, { status: 404 });

  const hoursUntil = (appointment.startTime.getTime() - Date.now()) / 3_600_000;
  if (
    !appointment.business.includeAppointmentActionsInConfirmationEmail ||
    !appointment.business.allowRescheduling ||
    appointment.recurringBookingId ||
    ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status) ||
    hoursUntil < appointment.business.rescheduleHoursLimit
  ) {
    return Response.json({ error: "Esta cita no admite reagendamiento online" }, { status: 409 });
  }

  const token = await issueCustomerAppointmentToken(appointment.id, appointment.startTime);
  if (!token) return Response.json({ error: "Esta cita ya comenzó" }, { status: 409 });

  return Response.json({
    ok: true,
    url: `/reagendar/${appointment.id}?token=${token}`,
  });
}
