import { resend, EMAIL_FROM } from "./resend";
import {
  newBookingOwnerEmail,
  newBookingStaffEmail,
  newBookingClientEmail,
  confirmedBookingClientEmail,
  welcomeEmail,
  staffInviteEmail,
  cancellationClientEmail,
  forgotPasswordEmail,
  newRegistrationAdminEmail,
} from "./templates";
import { ADMIN_NOTIFICATION_EMAILS } from "@/core/constants";

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
// BOOKING NOTIFICATIONS
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

// ═══════════════════════════════════════════
// CANCELLATION EMAIL
// ═══════════════════════════════════════════

/**
 * Send cancellation email to the customer when appointment status changes to CANCELLED.
 */
export async function sendCancellationEmail(appointment: AppointmentWithRelations) {
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

  const { subject, html } = cancellationClientEmail(data);

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: appointment.customerEmail,
      subject,
      html,
    });
    console.log(`[Email] Cancellation sent to ${appointment.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending cancellation:", err);
  }
}

// ═══════════════════════════════════════════
// WELCOME EMAIL
// ═══════════════════════════════════════════

/**
 * Send welcome email to owner after registration.
 */
export async function sendWelcomeEmail(ownerEmail: string, ownerName: string, businessName: string) {
  const { subject, html } = welcomeEmail({ ownerName, businessName });

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: ownerEmail,
      subject,
      html,
    });
    console.log(`[Email] Welcome sent to ${ownerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending welcome:", err);
  }
}

// ═══════════════════════════════════════════
// STAFF INVITE EMAIL
// ═══════════════════════════════════════════

/**
 * Send invite email to staff with temporary credentials.
 */
export async function sendStaffInviteEmail(
  staffEmail: string,
  staffName: string,
  businessName: string,
  tempPassword: string
) {
  const { subject, html } = staffInviteEmail({ staffName, businessName, email: staffEmail, tempPassword });

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: staffEmail,
      subject,
      html,
    });
    console.log(`[Email] Staff invite sent to ${staffEmail}`);
  } catch (err) {
    console.error("[Email] Error sending staff invite:", err);
  }
}

// ═══════════════════════════════════════════
// FORGOT PASSWORD EMAIL
// ═══════════════════════════════════════════

/**
 * Send forgot password email with reset link.
 */
export async function sendForgotPasswordEmail(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetLink = `${appUrl}/auth/new-password?token=${token}`;
  const { subject, html } = forgotPasswordEmail({ resetLink });

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject,
      html,
    });
    console.log(`[Email] Forgot password sent to ${email}`);
  } catch (err) {
    console.error("[Email] Error sending forgot password:", err);
  }
}

// ═══════════════════════════════════════════
// NEW REGISTRATION ADMIN NOTIFICATION
// ═══════════════════════════════════════════

/**
 * Notify platform admins when a new business registers or starts a trial.
 * Errors are logged but never thrown — notification failures should not block registration.
 */
export async function sendNewRegistrationNotification(data: {
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  plan: string;
  hasTrial: boolean;
}) {
  const { subject, html } = newRegistrationAdminEmail(data);

  const tasks = ADMIN_NOTIFICATION_EMAILS.map((adminEmail) =>
    resend.emails
      .send({
        from: EMAIL_FROM,
        to: adminEmail,
        subject,
        html,
      })
      .catch((err) => console.error(`[Email] Error sending registration notification to ${adminEmail}:`, err))
  );

  await Promise.allSettled(tasks);
  console.log(`[Email] Registration notification sent for ${data.businessName} (${data.ownerEmail})`);
}
