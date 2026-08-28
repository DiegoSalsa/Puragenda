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
  clientPortalAccessEmail,
  clientPortalVerificationEmail,
  clientPortalPasswordResetEmail,
  adminLoginCodeEmail,
  newRegistrationAdminEmail,
  loyaltyStampEarnedEmail,
  loyaltyRewardWonEmail,
  trialExpiringEmail,
  trialExpiredEmail,
  subscriptionPaymentFailedEmail,
  subscriptionPaymentRecoveredEmail,
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
  withClientPortalAccess,
  type EmailTemplate,
} from "./templates";
import type { AppLocale } from "@/i18n/config";
import { isSupportedLocale, resolveLocale } from "@/i18n/config";
import { localizeEmailTemplate } from "./localization";
import { ADMIN_NOTIFICATION_EMAILS } from "@/core/constants";
import { issueCustomerAppointmentToken } from "@/server/services/customer-appointment-action.service";
import {
  getClientPortalAppUrl,
  issueClientPortalEmailToken,
} from "@/server/services/client-portal.service";

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
    timezone?: string;
    owner?: { email: string; name: string } | null;
    address?: string | null;
    mapsUrl?: string | null;
    locale?: string;
  };
}

interface EmailLocaleLookup {
  locale?: string | null;
  businessId?: string | null;
  businessName?: string | null;
  customerEmail?: string | null;
  ownerEmail?: string | null;
  staffEmail?: string | null;
  email?: string | null;
}

async function resolveEmailLocale(lookup: EmailLocaleLookup): Promise<AppLocale> {
  if (isSupportedLocale(lookup.locale)) return lookup.locale;
  const email = lookup.customerEmail || lookup.ownerEmail || lookup.staffEmail || lookup.email;
  const or = [
    lookup.businessId ? { id: lookup.businessId } : null,
    lookup.ownerEmail ? { owner: { email: { equals: lookup.ownerEmail, mode: "insensitive" as const } } } : null,
    lookup.staffEmail ? { staff: { some: { email: { equals: lookup.staffEmail, mode: "insensitive" as const } } } } : null,
    email && lookup.businessName ? {
      name: lookup.businessName,
      clients: { some: { email: { equals: email, mode: "insensitive" as const } } },
    } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (or.length > 0) {
    const business = await prisma.business.findFirst({
      where: { OR: or },
      orderBy: { updatedAt: "desc" },
      select: { locale: true },
    });
    if (business) return resolveLocale(business.locale);
  }
  return "es";
}

async function localized(template: EmailTemplate, lookup: EmailLocaleLookup): Promise<EmailTemplate> {
  return localizeEmailTemplate(template, await resolveEmailLocale(lookup));
}

async function deliverEmail(
  context: string,
  params: Parameters<typeof resend.emails.send>[0],
  options?: Parameters<typeof resend.emails.send>[1],
) {
  try {
    const result = options
      ? await resend.emails.send(params, options)
      : await resend.emails.send(params);
    if (result.error) {
      console.error(`[Email] Resend rejected ${context}:`, result.error);
      return false;
    }
    console.log(`[Email] Sent ${context}: ${result.data?.id ?? "no-id"}`);
    return true;
  } catch (err) {
    console.error(`[Email] Error sending ${context}:`, err);
    return false;
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
  const locale = await resolveEmailLocale({ locale: appointment.business.locale, businessId: appointment.businessId, businessName: appointment.business.name, customerEmail: appointment.customerEmail });
  const data = {
    locale,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    customerAddress: appointment.customerAddress,
    serviceName: appointment.service.name,
    staffName: appointment.staff?.name || "Sin asignar",
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    businessName: appointment.business.name,
    timezone: appointment.business.timezone,
    businessAddress: appointment.business.address,
    businessMapsUrl: appointment.business.mapsUrl,
  };

  const tasks: Promise<unknown>[] = [];

  // 1. Email to business owner
  if (appointment.business.owner?.email) {
    const { subject, html } = localizeEmailTemplate(newBookingOwnerEmail(data), locale);
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
    const { subject, html } = localizeEmailTemplate(newBookingStaffEmail(data), locale);
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
    const template = await addClientPortalLinkToEmail(
      appointment.customerEmail,
      newBookingClientEmail(data),
    );
    const { subject, html } = localizeEmailTemplate(template, locale);
    tasks.push(
      deliverEmail(`new booking to client ${appointment.customerEmail}`, {
        from: EMAIL_FROM,
        to: appointment.customerEmail,
        subject,
        html,
      })
    );
  }

  const results = await Promise.all(tasks);
  const delivered = results.filter((result) => result === true).length;
  console.log(
    `[Email] Booking notifications complete for appointment ${appointment.id ?? "unknown"}: ${delivered}/${tasks.length} delivered`
  );
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
export type DepositNotificationDeliveryState = {
  ownerDelivered?: boolean;
  staffDelivered?: boolean;
  customerDelivered?: boolean;
};

export type DepositNotificationDeliveryResult = {
  ownerDelivered: boolean;
  staffDelivered: boolean;
  customerDelivered: boolean;
  failedRecipients: Array<"owner" | "staff" | "customer">;
};

/**
 * Sends only notification recipients that have not yet been durably recorded.
 * Each recipient uses a stable Resend idempotency key, so a timeout can be
 * retried without creating duplicate confirmation messages.
 */
export async function sendDepositConfirmedNotifications(
  appointment: AppointmentWithRelations,
  deliveredState: DepositNotificationDeliveryState = {},
): Promise<DepositNotificationDeliveryResult> {
  const locale = await resolveEmailLocale({ locale: appointment.business.locale, businessId: appointment.businessId, businessName: appointment.business.name, customerEmail: appointment.customerEmail });
  const needsCustomerEmail = !deliveredState.customerDelivered;
  const actionUrls = needsCustomerEmail
    ? await buildCustomerAppointmentActionUrls(appointment)
    : { cancelUrl: undefined, rescheduleUrl: undefined };
  const data = {
    locale,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    customerAddress: appointment.customerAddress,
    serviceName: appointment.service.name,
    staffName: appointment.staff?.name || "Sin asignar",
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    businessName: appointment.business.name,
    timezone: appointment.business.timezone,
    businessAddress: appointment.business.address,
    businessMapsUrl: appointment.business.mapsUrl,
    ...actionUrls,
  };

  const tasks: Array<Promise<{ recipient: "owner" | "staff" | "customer"; delivered: boolean }>> = [];
  const idempotencyPrefix = appointment.id
    ? `deposit-confirmed/${appointment.id}`
    : undefined;
  const ownerEmail = appointment.business.owner?.email;
  const staffEmail = appointment.staff?.email;

  // 1. Email to business owner — notify about the new confirmed + paid booking
  if (!deliveredState.ownerDelivered && ownerEmail) {
    const { subject, html } = localizeEmailTemplate(newBookingOwnerEmail(data), locale);
    tasks.push((async () => ({
      recipient: "owner" as const,
      delivered: await deliverEmail(`deposit confirmed to owner ${ownerEmail}`, {
        from: EMAIL_FROM,
        to: ownerEmail,
        subject,
        html,
      }, idempotencyPrefix ? { idempotencyKey: `${idempotencyPrefix}/owner` } : undefined),
    }))());
  }

  // 2. Email to staff
  if (!deliveredState.staffDelivered && staffEmail) {
    const { subject, html } = localizeEmailTemplate(newBookingStaffEmail(data), locale);
    tasks.push((async () => ({
      recipient: "staff" as const,
      delivered: await deliverEmail(`deposit confirmed to staff ${staffEmail}`, {
        from: EMAIL_FROM,
        to: staffEmail,
        subject,
        html,
      }, idempotencyPrefix ? { idempotencyKey: `${idempotencyPrefix}/staff` } : undefined),
    }))());
  } else if (!deliveredState.staffDelivered) {
    console.warn(`[Email] Deposit-confirmed booking ${appointment.id ?? "unknown"} has no staff email`);
  }

  // 3. Email to customer — use CONFIRMED template (they paid, so it's confirmed immediately)
  if (needsCustomerEmail) {
    // A client-portal magic URL is intentionally not included: it changes on
    // every attempt, which would defeat the provider idempotency key. The
    // appointment action URL above is stable for the same appointment/time.
    const { subject, html } = localizeEmailTemplate(confirmedBookingClientEmail(data), locale);
    tasks.push((async () => ({
      recipient: "customer" as const,
      delivered: await deliverEmail(`deposit confirmed to client ${appointment.customerEmail}`, {
        from: EMAIL_FROM,
        to: appointment.customerEmail,
        subject,
        html,
      }, idempotencyPrefix ? { idempotencyKey: `${idempotencyPrefix}/customer` } : undefined),
    }))());
  }

  const results = await Promise.all(tasks);
  const deliveredByRecipient = new Map(results.map((result) => [result.recipient, result.delivered]));
  const ownerDelivered = deliveredState.ownerDelivered
    || !ownerEmail
    || deliveredByRecipient.get("owner") === true;
  const staffDelivered = deliveredState.staffDelivered
    || !staffEmail
    || deliveredByRecipient.get("staff") === true;
  const customerDelivered = deliveredState.customerDelivered || deliveredByRecipient.get("customer") === true;
  const failedRecipients = ([
    ["owner", ownerDelivered],
    ["staff", staffDelivered],
    ["customer", customerDelivered],
  ] as const)
    .filter(([, delivered]) => !delivered)
    .map(([recipient]) => recipient);

  if (failedRecipients.length > 0) {
    console.warn(
      `[Email] Deposit-confirmed notifications incomplete for appointment ${appointment.id ?? "unknown"}: ${failedRecipients.join(", ")}`,
    );
  } else {
    console.log(`[Email] Deposit-confirmed notifications sent for appointment with ${data.customerName}`);
  }
  return { ownerDelivered, staffDelivered, customerDelivered, failedRecipients };
}

/**
 * Send confirmation email to the customer when appointment status changes to CONFIRMED.
 */
export async function sendConfirmationEmail(appointment: AppointmentWithRelations) {
  const locale = await resolveEmailLocale({ locale: appointment.business.locale, businessId: appointment.businessId, businessName: appointment.business.name, customerEmail: appointment.customerEmail });
  const actionUrls = await buildCustomerAppointmentActionUrls(appointment);

  const data = {
    locale,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    serviceName: appointment.service.name,
    staffName: appointment.staff?.name || "Sin asignar",
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    businessName: appointment.business.name,
    timezone: appointment.business.timezone,
    businessAddress: appointment.business.address,
    businessMapsUrl: appointment.business.mapsUrl,
    ...actionUrls,
  };

  const template = await addClientPortalLinkToEmail(
    appointment.customerEmail,
    confirmedBookingClientEmail(data),
  );
  const { subject, html } = localizeEmailTemplate(template, locale);

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
  const locale = await resolveEmailLocale({ locale: appointment.business.locale, businessId: appointment.businessId, businessName: appointment.business.name, customerEmail: appointment.customerEmail });
  const data = {
    locale,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    serviceName: appointment.service.name,
    staffName: appointment.staff?.name || "Sin asignar",
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    businessName: appointment.business.name,
    timezone: appointment.business.timezone,
    businessAddress: appointment.business.address,
    businessMapsUrl: appointment.business.mapsUrl,
  };

  const template = await addClientPortalLinkToEmail(
    appointment.customerEmail,
    cancellationClientEmail(data),
  );
  const { subject, html } = localizeEmailTemplate(template, locale);

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
export async function sendWelcomeEmail(ownerEmail: string, ownerName: string, businessName: string, locale: AppLocale = "es") {
  const { subject, html } = localizeEmailTemplate(welcomeEmail({ ownerName, businessName }), locale);

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
  tempPassword: string,
  locale?: AppLocale,
) {
  const { subject, html } = await localized(
    staffInviteEmail({ staffName, businessName, email: staffEmail, tempPassword }),
    { locale, staffEmail, businessName },
  );

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
  const { subject, html } = await localized(forgotPasswordEmail({ resetLink }), { email });

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
export async function sendClientPortalAccessEmail(
  email: string,
  portalUrl: string,
  expiresInMinutes: number,
) {
  const { subject, html } = await localized(
    clientPortalAccessEmail({ portalUrl, expiresInMinutes }),
    { customerEmail: email },
  );
  return deliverEmail("client portal access link", {
    from: EMAIL_FROM,
    to: email,
    subject,
    html,
  });
}

export async function sendClientPortalVerificationEmail(
  email: string,
  name: string,
  verificationUrl: string,
) {
  const { subject, html } = await localized(
    clientPortalVerificationEmail({ verificationUrl, name }),
    { customerEmail: email },
  );
  return deliverEmail("client portal account verification", {
    from: EMAIL_FROM,
    to: email,
    subject,
    html,
  });
}

export async function sendClientPortalPasswordResetEmail(email: string, resetUrl: string) {
  const { subject, html } = await localized(
    clientPortalPasswordResetEmail({ resetUrl }),
    { customerEmail: email },
  );
  return deliverEmail("client portal password reset", {
    from: EMAIL_FROM,
    to: email,
    subject,
    html,
  });
}

export async function createClientPortalEmailUrl(customerEmail: string): Promise<string | null> {
  try {
    const account = await prisma.clientPortalAccount.findUnique({
      where: { email: customerEmail.trim().toLowerCase() },
      select: { emailVerifiedAt: true },
    });
    if (account?.emailVerifiedAt) return `${getClientPortalAppUrl()}/mi-agenda`;
    const { token } = await issueClientPortalEmailToken(customerEmail);
    return `${getClientPortalAppUrl()}/mi-agenda/entrar/${token}`;
  } catch (error) {
    console.error(`[Email] Could not create client portal link for ${customerEmail}:`, error);
    return null;
  }
}

export async function addClientPortalLinkToEmail(
  customerEmail: string,
  template: EmailTemplate,
): Promise<EmailTemplate> {
  const portalUrl = await createClientPortalEmailUrl(customerEmail);
  return portalUrl ? withClientPortalAccess(template, portalUrl) : template;
}

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
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, businessName: data.businessName, customerEmail: data.clientEmail });
  const portalUrl = await createClientPortalEmailUrl(data.clientEmail)
    ?? `${getClientPortalAppUrl()}/mi-agenda`;

  const { subject, html } = localizeEmailTemplate(loyaltyStampEarnedEmail({
    clientName: data.clientName,
    currentStamps: data.currentStamps,
    stampsRequired: data.stampsRequired,
    rewardName: data.rewardName,
    businessName: data.businessName,
    portalUrl,
  }), locale);

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
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, businessName: data.businessName, customerEmail: data.clientEmail });
  const portalUrl = await createClientPortalEmailUrl(data.clientEmail)
    ?? `${getClientPortalAppUrl()}/mi-agenda`;

  const { subject, html } = localizeEmailTemplate(loyaltyRewardWonEmail({
    clientName: data.clientName,
    stampsRequired: data.stampsRequired,
    rewardName: data.rewardName,
    rewardCode: data.rewardCode,
    discountType: data.discountType,
    discountValue: data.discountValue,
    businessName: data.businessName,
    portalUrl,
  }), locale);

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
  locale?: AppLocale;
}) {
  const { subject, html } = await localized(trialExpiringEmail(data), { locale: data.locale, ownerEmail: data.ownerEmail, businessName: data.businessName });

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
  locale?: AppLocale;
}) {
  const { subject, html } = await localized(trialExpiredEmail(data), { locale: data.locale, ownerEmail: data.ownerEmail, businessName: data.businessName });

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
export async function sendSubscriptionPaymentFailedEmail(data: {
  ownerEmail: string;
  ownerName?: string | null;
  businessName: string;
  gracePeriodEndsAt: Date;
  nextPaymentAttemptAt?: Date | null;
  amount?: number | null;
  finalWarning?: boolean;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, ownerEmail: data.ownerEmail, businessName: data.businessName });
  const { subject, html } = localizeEmailTemplate(subscriptionPaymentFailedEmail({ ...data, locale }), locale);
  return deliverEmail(`subscription payment warning to ${data.ownerEmail}`, {
    from: EMAIL_FROM,
    to: data.ownerEmail,
    subject,
    html,
  });
}

export async function sendSubscriptionPaymentRecoveredEmail(data: {
  ownerEmail: string;
  ownerName?: string | null;
  businessName: string;
  periodEnd: Date;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, ownerEmail: data.ownerEmail, businessName: data.businessName });
  const { subject, html } = localizeEmailTemplate(subscriptionPaymentRecoveredEmail({ ...data, locale }), locale);
  return deliverEmail(`subscription payment recovered to ${data.ownerEmail}`, {
    from: EMAIL_FROM,
    to: data.ownerEmail,
    subject,
    html,
  });
}

export async function sendAppointmentActionNotification(data: {
  action: "confirmed" | "cancelled";
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  businessName: string;
  timezone?: string;
  ownerEmail: string;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, ownerEmail: data.ownerEmail, businessName: data.businessName });
  const { subject, html } = localizeEmailTemplate(appointmentActionOwnerEmail({ ...data, locale }), locale);

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
  const { subject, html } = await localized(adminLoginCodeEmail({ name, code, expiresInMinutes }), { email });
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
  timezone?: string;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, staffEmail: data.staffEmail, businessName: data.businessName });
  const { subject, html } = localizeEmailTemplate(appointmentActionStaffEmail({ ...data, locale }), locale);

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
  timezone?: string;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, customerEmail: data.customerEmail, businessName: data.businessName });
  const template = await addClientPortalLinkToEmail(
    data.customerEmail,
    recurringBookingCreatedClientEmail({ ...data, locale }),
  );
  const { subject, html } = localizeEmailTemplate(template, locale);
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
  timezone?: string;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, ownerEmail: data.ownerEmail, businessName: data.businessName });
  const { subject, html } = localizeEmailTemplate(recurringBookingPendingApprovalBusinessEmail({ ...data, locale }), locale);
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
  timezone?: string;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, customerEmail: data.customerEmail, businessName: data.businessName });
  const template = await addClientPortalLinkToEmail(
    data.customerEmail,
    recurringBookingApprovedClientEmail({ ...data, locale }),
  );
  const { subject, html } = localizeEmailTemplate(template, locale);
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
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, customerEmail: data.customerEmail, businessName: data.businessName });
  const template = await addClientPortalLinkToEmail(
    data.customerEmail,
    recurringBookingRejectedClientEmail(data),
  );
  const { subject, html } = localizeEmailTemplate(template, locale);
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
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, customerEmail: data.customerEmail, businessName: data.businessName });
  const template = await addClientPortalLinkToEmail(
    data.customerEmail,
    recurringBookingCancelledClientEmail(data),
  );
  const { subject, html } = localizeEmailTemplate(template, locale);
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
  timezone?: string;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, customerEmail: data.customerEmail, businessName: data.businessName });
  const template = await addClientPortalLinkToEmail(
    data.customerEmail,
    recurringSessionCancelledClientEmail({ ...data, locale }),
  );
  const { subject, html } = localizeEmailTemplate(template, locale);
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
  timezone?: string;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, customerEmail: data.customerEmail, businessName: data.businessName });
  const template = await addClientPortalLinkToEmail(
    data.customerEmail,
    recurringExpiringClientEmail({ ...data, locale }),
  );
  const { subject, html } = localizeEmailTemplate(template, locale);
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
  timezone?: string;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, ownerEmail: data.ownerEmail, businessName: data.businessName });
  const { subject, html } = localizeEmailTemplate(recurringExpiringBusinessEmail({ ...data, locale }), locale);
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
  timezone?: string;
  locale?: AppLocale;
}) {
  const locale = await resolveEmailLocale({ locale: data.locale, customerEmail: data.customerEmail, businessName: data.businessName });
  const template = await addClientPortalLinkToEmail(
    data.customerEmail,
    recurringConflictWarningClientEmail({ ...data, locale }),
  );
  const { subject, html } = localizeEmailTemplate(template, locale);
  try {
    await resend.emails.send({ from: EMAIL_FROM, to: data.customerEmail, subject, html });
    console.log(`[Email] Recurring conflict warning sent to ${data.customerEmail}`);
  } catch (err) {
    console.error("[Email] Error sending recurring conflict warning:", err);
  }
}
