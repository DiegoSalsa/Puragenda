// ═══════════════════════════════════════════
// Puragenda — Domain Entities
// ═══════════════════════════════════════════

export type UserRole = "ADMIN" | "RECEPTIONIST" | "STAFF" | "SUPERADMIN";
export type SubscriptionPlan = "INDIVIDUAL" | "EQUIPO" | "TEST";
export type SubscriptionStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "INACTIVE" | "CANCELLED";
export type BillingCycle = "MONTHLY" | "ANNUAL";
export type AppointmentStatus = "PENDING" | "AWAITING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "COMPLETED" | "NO_SHOW";

export interface User {
  id: string; email: string; name: string; role: UserRole;
  isSuperAdmin: boolean; trialUsedAt: Date | null; registrationIp: string | null;
  createdAt: Date; updatedAt: Date;
}

export type SafeUser = Omit<User, "createdAt" | "updatedAt"> & { createdAt?: Date; updatedAt?: Date; };

export interface Business {
  id: string; name: string; slug: string; apiKey: string;
  logoUrl: string | null; primaryColor: string; secondaryColor: string;
  brandColor: string | null; allowedOrigins: string[]; timezone: string;
  ownerId: string | null; createdAt: Date; updatedAt: Date;
}

export interface BusinessHoursEntry {
  id: string; dayOfWeek: number; startTime: string; endTime: string;
  isOpen: boolean; businessId: string;
}

export interface BlockedDate {
  id: string; date: Date; reason: string | null; businessId: string; createdAt: Date;
}

export interface Staff {
  id: string; name: string; email: string | null; businessId: string;
  userId: string | null; isActive: boolean; createdAt: Date; updatedAt: Date;
}

export interface Service {
  id: string; name: string; description: string | null; duration: number;
  price: number; businessId: string;
}

export interface Appointment {
  id: string; customerName: string; customerEmail: string; customerPhone: string | null;
  startTime: Date; endTime: Date; status: AppointmentStatus; businessId: string;
  serviceId: string; staffId: string | null; createdAt: Date;
}

export interface Subscription {
  id: string; plan: SubscriptionPlan; status: SubscriptionStatus;
  billingCycle: BillingCycle; isTrial: boolean; trialEndsAt: Date | null;
  extraStaffCount: number; businessId: string;
  mpCustomerId: string | null; mpSubscriptionId: string | null;
  currentPeriodEnd: Date | null; paymentFailedAt: Date | null;
  gracePeriodEndsAt: Date | null; nextPaymentAttemptAt: Date | null;
  createdAt: Date; updatedAt: Date;
}

export interface SessionUser {
  id: string; email: string; name: string; role: UserRole; isSuperAdmin: boolean;
  tokenVersion: number;
  adminAccess?: boolean;
}

export interface WidgetBusiness {
  name: string; slug: string; apiKey: string;
  logoUrl: string | null; primaryColor: string; secondaryColor: string;
  brandColor: string | null;
}

export interface WidgetService { id: string; name: string; description: string | null; duration: number; price: number; }
export interface TimeSlot { start: Date; end: Date; }
export interface BlockedSlot { startTime: string; endTime: string; }

export interface MarketingCampaign {
  id: string;
  businessId: string;
  subject: string;
  body: string;
  audienceSize: number;
  sentAt: Date;
}

export interface MarketingStatus {
  campaignsSentThisMonth: number;
  maxCampaignsPerMonth: number;
  maxAudienceSize: number;
  plan: SubscriptionPlan;
  lastCampaign: { subject: string; audienceSize: number; sentAt: string } | null;
}
