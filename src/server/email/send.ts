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
  loyaltyStampEarnedEmail,
  loyaltyRewardWonEmail,
  trialExpiringEmail,
  trialExpiredEmail,
  appointmentActionOwnerEmail,
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
    address?: string | null;
    mapsUrl?: string | null;
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
    businessAddress: appointment.business.address,
    businessMapsUrl: appointment.business.mapsUrl,
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
    businessAddress: appointment.business.address,
    businessMapsUrl: appointment.business.mapsUrl,
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
    businessAddress: appointment.business.address,
    businessMapsUrl: appointment.business.mapsUrl,
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
  const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
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

// ═══════════════════════════════════════════
// LOYALTY EMAILS
// ═══════════════════════════════════════════

/**
 * Send email when client earns a stamp (but hasn’t reached the goal yet).
 */
export async function sendLoyaltyStampEmail(data: {
  clientEmail: string;
  clientName: string;
  currentStamps: number;
  stampsRequired: number;
  rewardName: string;
  businessName: string;
  clientId: string;
}) {
  const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const portalUrl = `${appUrl}/mis-premios/${data.clientId}`;

  const { subject, html } = loyaltyStampEarnedEmail({
    clientName: data.clientName,
    currentStamps: data.currentStamps,
    stampsRequired: data.stampsRequired,
    rewardName: data.rewardName,
    businessName: data.businessName,
    portalUrl,
  });

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.clientEmail,
      subject,
      html,
    });
    console.log(`[Email] Loyalty stamp notification sent to ${data.clientEmail} (${data.currentStamps}/${data.stampsRequired})`);
  } catch (err) {
    console.error("[Email] Error sending loyalty stamp email:", err);
  }
}

/**
 * Send email when client completes their stamp card and wins a reward.
 */
export async function sendLoyaltyRewardEmail(data: {
  clientEmail: string;
  clientName: string;
  stampsRequired: number;
  rewardName: string;
  rewardCode: string;
  discountType: string;
  discountValue: number;
  businessName: string;
  clientId: string;
}) {
  const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const portalUrl = `${appUrl}/mis-premios/${data.clientId}`;

  const { subject, html } = loyaltyRewardWonEmail({
    clientName: data.clientName,
    stampsRequired: data.stampsRequired,
    rewardName: data.rewardName,
    rewardCode: data.rewardCode,
    discountType: data.discountType,
    discountValue: data.discountValue,
    businessName: data.businessName,
    portalUrl,
  });

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.clientEmail,
      subject,
      html,
    });
    console.log(`[Email] Loyalty reward email sent to ${data.clientEmail} (code: ${data.rewardCode})`);
  } catch (err) {
    console.error("[Email] Error sending loyalty reward email:", err);
  }
}

// ═══════════════════════════════════════════
// TRIAL EXPIRATION EMAILS
// ═══════════════════════════════════════════

/**
 * Send warning email 3 days before trial expires.
 */
export async function sendTrialExpiringEmail(data: {
  ownerEmail: string;
  ownerName: string;
  businessName: string;
  plan: string;
  daysLeft: number;
}) {
  const { subject, html } = trialExpiringEmail(data);

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.ownerEmail,
      subject,
      html,
    });
    console.log(`[Email] Trial expiring warning sent to ${data.ownerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending trial expiring email:", err);
  }
}

/**
 * Send email when trial has expired and account is now INACTIVE.
 */
export async function sendTrialExpiredEmail(data: {
  ownerEmail: string;
  ownerName: string;
  businessName: string;
  plan: string;
}) {
  const { subject, html } = trialExpiredEmail(data);

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.ownerEmail,
      subject,
      html,
    });
    console.log(`[Email] Trial expired notification sent to ${data.ownerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending trial expired email:", err);
  }
}

// ═══════════════════════════════════════════
// APPOINTMENT ACTION NOTIFICATION (confirm/cancel by client)
// ═══════════════════════════════════════════

/**
 * Notify business owner when a customer confirms or cancels via email link.
 */
export async function sendAppointmentActionNotification(data: {
  action: "confirmed" | "cancelled";
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  businessName: string;
  ownerEmail: string;
}) {
  const { subject, html } = appointmentActionOwnerEmail(data);

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.ownerEmail,
      subject,
      html,
    });
    console.log(`[Email] Appointment ${data.action} notification sent to ${data.ownerEmail}`);
  } catch (err) {
    console.error(`[Email] Error sending appointment action notification:`, err);
  }
}
