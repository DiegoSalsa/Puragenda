import { resend, EMAIL_FROM } from "./resend";
import {
  newBookingOwnerEmail,
  newBookingStaffEmail,
  newBookingClientEmail,
  confirmedBookingClientEmail,
} from "./templates";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface AppointmentWithRelations {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  startTime: Date;
  endTime: Date;
  service: { name: string };
  staff?: { name: string; email?: string | null } | null;
  business: {
    name: string;
    owner?: { email: string; name: string } | null;
  };
}

// ═══════════════════════════════════════════
// SEND FUNCTIONS
// ═══════════════════════════════════════════

/**
 * Send 3 notification emails when a new booking is created:
 * 1. To the business owner
 * 2. To the assigned staff member (if has email)
 * 3. To the customer
 *
 * Errors are logged but never thrown — email failures should not block booking flow.
 */
export async function sendBookingNotifications(appointment: AppointmentWithRelations) {
  const data = {
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    serviceName: appointment.service.name,
    staffName: appointment.staff?.name || "Sin asignar",
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    businessName: appointment.business.name,
  };

  const tasks: Promise<unknown>[] = [];

  // 1. Email to business owner
  if (appointment.business.owner?.email) {
    const { subject, html } = newBookingOwnerEmail(data);
    tasks.push(
      resend.emails.send({
        from: EMAIL_FROM,
        to: appointment.business.owner.email,
        subject,
        html,
      }).catch((err) => console.error("[Email] Error sending to owner:", err))
    );
  }

  // 2. Email to staff
  if (appointment.staff?.email) {
    const { subject, html } = newBookingStaffEmail(data);
    tasks.push(
      resend.emails.send({
        from: EMAIL_FROM,
        to: appointment.staff.email,
        subject,
        html,
      }).catch((err) => console.error("[Email] Error sending to staff:", err))
    );
  }

  // 3. Email to customer
  {
    const { subject, html } = newBookingClientEmail(data);
    tasks.push(
      resend.emails.send({
        from: EMAIL_FROM,
        to: appointment.customerEmail,
        subject,
        html,
      }).catch((err) => console.error("[Email] Error sending to client:", err))
    );
  }

  await Promise.allSettled(tasks);
  console.log(`[Email] Booking notifications sent for appointment with ${data.customerName}`);
}

/**
 * Send confirmation email to the customer when appointment status changes to CONFIRMED.
 */
export async function sendConfirmationEmail(appointment: AppointmentWithRelations) {
  const data = {
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    serviceName: appointment.service.name,
    staffName: appointment.staff?.name || "Sin asignar",
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    businessName: appointment.business.name,
  };

  const { subject, html } = confirmedBookingClientEmail(data);

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: appointment.customerEmail,
      subject,
      html,
    });
    console.log(`[Email] Confirmation sent to ${appointment.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending confirmation:", err);
  }
}
