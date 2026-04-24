// ═══════════════════════════════════════════
// Puragenda — Domain Entities (TypeScript types)
// ═══════════════════════════════════════════

export type UserRole = "OWNER" | "STAFF" | "SUPERADMIN";
export type SubscriptionPlan = "BASIC" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "TRIALING" | "INACTIVE" | "CANCELLED";
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isSuperAdmin: boolean;
  trialUsedAt: Date | null;
  registrationIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<User, "createdAt" | "updatedAt"> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export interface Business {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  brandColor: string | null;
  allowedOrigins: string[];
  timezone: string;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Staff {
  id: string;
  name: string;
  email: string | null;
  businessId: string;
  userId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  businessId: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  businessId: string;
  serviceId: string;
  staffId: string | null;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isTrial: boolean;
  trialEndsAt: Date | null;
  businessId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isSuperAdmin: boolean;
}

export interface WidgetBusiness {
  name: string;
  slug: string;
  apiKey: string;
  brandColor: string | null;
}

export interface WidgetService {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
}

export interface TimeSlot { start: Date; end: Date; }
export interface BlockedSlot { startTime: string; endTime: string; }
