import { resend, EMAIL_FROM } from "./resend";
import { prisma } from "@/server/db/prisma";
import {
  newBookingOwnerEmail,
  newBookingStaffEmail,
  newBookingClientEmail,
  confirmedBookingClientEmail,
  welcomeEmail,
  staffInviteEmail,
  cancellationClientEmail,
  forgotPasswordEmail,
  adminLoginCodeEmail,
  newRegistrationAdminEmail,
  loyaltyStampEarnedEmail,
  loyaltyRewardWonEmail,
  trialExpiringEmail,
  trialExpiredEmail,
  appointmentActionOwnerEmail,
  appointmentActionStaffEmail,
  recurringBookingCreatedClientEmail,
  recurringBookingPendingApprovalBusinessEmail,
  recurringBookingApprovedClientEmail,
  recurringBookingRejectedClientEmail,
  recurringBookingCancelledClientEmail,
  recurringSessionCancelledClientEmail,
  recurringExpiringClientEmail,
  recurringExpiringBusinessEmail,
  recurringConflictWarningClientEmail,
} from "./templates";
import { ADMIN_NOTIFICATION_EMAILS } from "@/core/constants";
import { issueCustomerAppointmentToken } from "@/server/services/customer-appointment-action.service";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface AppointmentWithRelations {
  id?: string;
  businessId?: string;
  recurringBookingId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
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

async function deliverEmail(
  context: string,
  params: Parameters<typeof resend.emails.send>[0]
) {
  try {
    const result = await resend.emails.send(params);
    if (result.error) {
      console.error(`[Email] Resend rejected ${context}:`, result.error);
      return;
    }
    console.log(`[Email] Sent ${context}: ${result.data?.id ?? "no-id"}`);
  } catch (err) {
    console.error(`[Email] Error sending ${context}:`, err);
  }
}

async function buildCustomerAppointmentActionUrls(appointment: AppointmentWithRelations) {
  if (!appointment.id || !appointment.businessId || appointment.recurringBookingId) {
    return { cancelUrl: undefined, rescheduleUrl: undefined };
  }

  const business = await prisma.business.findUnique({
    where: { id: appointment.businessId },
    select: {
      includeAppointmentActionsInConfirmationEmail: true,
      allowRescheduling: true,
    },
  });
  if (!business?.includeAppointmentActionsInConfirmationEmail) {
    return { cancelUrl: undefined, rescheduleUrl: undefined };
  }

  const token = await issueCustomerAppointmentToken(appointment.id, appointment.startTime);
  if (!token) return { cancelUrl: undefined, rescheduleUrl: undefined };

  const appUrl = process.env.NODE_ENV === "production"
    ? "https://www.puragenda.cl"
    : "http://localhost:3000";

  return {
    cancelUrl: `${appUrl}/cita/cancelar?manageToken=${token}`,
    rescheduleUrl: business.allowRescheduling
      ? `${appUrl}/reagendar/${appointment.id}?token=${token}`
      : undefined,
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
    customerAddress: appointment.customerAddress,
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
      deliverEmail(`new booking to owner ${appointment.business.owner.email}`, {
        from: EMAIL_FROM,
        to: appointment.business.owner.email,
        subject,
        html,
      })
    );
  }

  // 2. Email to staff
  if (appointment.staff?.email) {
    const { subject, html } = newBookingStaffEmail(data);
    tasks.push(
      deliverEmail(`new booking to staff ${appointment.staff.email}`, {
        from: EMAIL_FROM,
        to: appointment.staff.email,
        subject,
        html,
      })
    );
  } else {
    console.warn(`[Email] New booking ${appointment.id ?? "unknown"} has no staff email`);
  }

  // 3. Email to customer
  {
    const { subject, html } = newBookingClientEmail(data);
    tasks.push(
      deliverEmail(`new booking to client ${appointment.customerEmail}`, {
        from: EMAIL_FROM,
        to: appointment.customerEmail,
        subject,
        html,
      })
    );
  }

  await Promise.allSettled(tasks);
  console.log(`[Email] Booking notifications sent for appointment with ${data.customerName}`);
}

/**
 * Send notifications when an appointment is confirmed via deposit payment.
 * This handles the case where the appointment goes AWAITING_PAYMENT → CONFIRMED
 * (skipping the manual PENDING → CONFIRMED flow).
 *
 * Sends 3 emails:
 * 1. To the business owner (new booking notification — they now know it's paid & confirmed)
 * 2. To the assigned staff member (if has email)
 * 3. To the customer (confirmed booking email — they already paid, so it's confirmed)
 *
 * Errors are logged but never thrown.
 */
export async function sendDepositConfirmedNotifications(appointment: AppointmentWithRelations) {
  const actionUrls = await buildCustomerAppointmentActionUrls(appointment);
  const data = {
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    customerAddress: appointment.customerAddress,
    serviceName: appointment.service.name,
    staffName: appointment.staff?.name || "Sin asignar",
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    businessName: appointment.business.name,
    businessAddress: appointment.business.address,
    businessMapsUrl: appointment.business.mapsUrl,
    ...actionUrls,
  };

  const tasks: Promise<unknown>[] = [];

  // 1. Email to business owner — notify about the new confirmed + paid booking
  if (appointment.business.owner?.email) {
    const { subject, html } = newBookingOwnerEmail(data);
    tasks.push(
      deliverEmail(`deposit confirmed to owner ${appointment.business.owner.email}`, {
        from: EMAIL_FROM,
        to: appointment.business.owner.email,
        subject,
        html,
      })
    );
  }

  // 2. Email to staff
  if (appointment.staff?.email) {
    const { subject, html } = newBookingStaffEmail(data);
    tasks.push(
      deliverEmail(`deposit confirmed to staff ${appointment.staff.email}`, {
        from: EMAIL_FROM,
        to: appointment.staff.email,
        subject,
        html,
      })
    );
  } else {
    console.warn(`[Email] Deposit-confirmed booking ${appointment.id ?? "unknown"} has no staff email`);
  }

  // 3. Email to customer — use CONFIRMED template (they paid, so it's confirmed immediately)
  {
    const { subject, html } = confirmedBookingClientEmail(data);
    tasks.push(
      deliverEmail(`deposit confirmed to client ${appointment.customerEmail}`, {
        from: EMAIL_FROM,
        to: appointment.customerEmail,
        subject,
        html,
      })
    );
  }

  await Promise.allSettled(tasks);
  console.log(`[Email] Deposit-confirmed notifications sent for appointment with ${data.customerName}`);
}

/**
 * Send confirmation email to the customer when appointment status changes to CONFIRMED.
 */
export async function sendConfirmationEmail(appointment: AppointmentWithRelations) {
  const actionUrls = await buildCustomerAppointmentActionUrls(appointment);

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
    ...actionUrls,
  };

  const { subject, html } = confirmedBookingClientEmail(data);

  await deliverEmail(`confirmation to client ${appointment.customerEmail}`, {
    from: EMAIL_FROM,
    to: appointment.customerEmail,
    subject,
    html,
  });
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

  await deliverEmail(`cancellation to client ${appointment.customerEmail}`, {
    from: EMAIL_FROM,
    to: appointment.customerEmail,
    subject,
    html,
  });
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

  await deliverEmail(`appointment ${data.action} to owner ${data.ownerEmail}`, {
    from: EMAIL_FROM,
    to: data.ownerEmail,
    subject,
    html,
  });
}

/** Send a one-time SuperAdmin login code. Failures are propagated to invalidate the challenge. */
export async function sendAdminLoginCodeEmail(
  email: string,
  name: string,
  code: string,
  expiresInMinutes: number
) {
  const { subject, html } = adminLoginCodeEmail({ name, code, expiresInMinutes });
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Resend rejected admin login code: ${result.error.message}`);
  }

  console.log(`[Email] Admin login code sent to ${email}`);
}

export async function sendAppointmentActionStaffNotification(data: {
  action: "confirmed" | "cancelled";
  customerName: string;
  serviceName: string;
  staffName: string;
  staffEmail: string;
  startTime: Date;
  endTime: Date;
  businessName: string;
}) {
  const { subject, html } = appointmentActionStaffEmail(data);

  await deliverEmail(`appointment ${data.action} to staff ${data.staffEmail}`, {
    from: EMAIL_FROM,
    to: data.staffEmail,
    subject,
    html,
  });
}

// ═══════════════════════════════════════════
// RECURRING BOOKING EMAILS
// ═══════════════════════════════════════════

export async function sendRecurringBookingCreatedClient(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  selectedDays: number[];
  selectedTimes: Record<string, string>;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  conflicts: Date[];
  managementToken: string;
  businessName: string;
}) {
  const { subject, html } = recurringBookingCreatedClientEmail(data);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.customerEmail, subject, html });
    console.log(`[Email] Recurring created sent to ${data.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring created:", err);
  }
}

export async function sendRecurringBookingPendingApprovalBusiness(data: {
  ownerEmail: string;
  ownerName: string | null | undefined;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  serviceName: string;
  selectedDays: number[];
  selectedTimes: Record<string, string>;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  healthAnswers?: Record<string, string>;
  healthFreeText?: string;
  businessName: string;
}) {
  const { subject, html } = recurringBookingPendingApprovalBusinessEmail(data);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.ownerEmail, subject, html });
    console.log(`[Email] Recurring pending approval sent to ${data.ownerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring pending approval:", err);
  }
}

export async function sendRecurringBookingApprovedClient(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  startDate: Date;
  endDate: Date;
  managementToken: string;
  businessName: string;
}) {
  const { subject, html } = recurringBookingApprovedClientEmail(data);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.customerEmail, subject, html });
    console.log(`[Email] Recurring approved sent to ${data.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring approved:", err);
  }
}

export async function sendRecurringBookingRejectedClient(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  reason: string;
  businessName: string;
}) {
  const { subject, html } = recurringBookingRejectedClientEmail(data);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.customerEmail, subject, html });
    console.log(`[Email] Recurring rejected sent to ${data.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring rejected:", err);
  }
}

export async function sendRecurringBookingCancelledClient(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  businessName: string;
}) {
  const { subject, html } = recurringBookingCancelledClientEmail(data);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.customerEmail, subject, html });
    console.log(`[Email] Recurring cancelled sent to ${data.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring cancelled:", err);
  }
}

export async function sendRecurringSessionCancelledClient(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  sessionDate: Date;
  businessName: string;
}) {
  const { subject, html } = recurringSessionCancelledClientEmail(data);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.customerEmail, subject, html });
    console.log(`[Email] Recurring session cancelled sent to ${data.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring session cancelled:", err);
  }
}

export async function sendRecurringExpiringClient(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  endDate: Date;
  daysLeft: number;
  renewalMessage?: string | null;
  managementToken: string;
  businessName: string;
}) {
  const { subject, html } = recurringExpiringClientEmail(data);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.customerEmail, subject, html });
    console.log(`[Email] Recurring expiring sent to ${data.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring expiring client:", err);
  }
}

export async function sendRecurringExpiringBusiness(data: {
  ownerEmail: string;
  customerName: string;
  serviceName: string;
  endDate: Date;
  daysLeft: number;
  businessName: string;
}) {
  const { subject, html } = recurringExpiringBusinessEmail(data);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.ownerEmail, subject, html });
    console.log(`[Email] Recurring expiring business sent to ${data.ownerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring expiring business:", err);
  }
}

export async function sendRecurringConflictWarningClient(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  originalDate: Date;
  businessName: string;
}) {
  const { subject, html } = recurringConflictWarningClientEmail(data);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.customerEmail, subject, html });
    console.log(`[Email] Recurring conflict warning sent to ${data.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring conflict warning:", err);
  }
}
