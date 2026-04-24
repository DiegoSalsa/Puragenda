// ═══════════════════════════════════════════
// Puragenda — Domain Entities (TypeScript types)
// ═══════════════════════════════════════════

// ---------- Enums ----------

export type UserRole = "OWNER" | "STAFF";
export type SubscriptionPlan = "FREE" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "CANCELLED";
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

// ---------- User ----------

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<User, "createdAt" | "updatedAt"> & {
  createdAt?: Date;
  updatedAt?: Date;
};

// ---------- Business ----------

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

// ---------- Staff ----------

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

// ---------- Service ----------

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number; // minutes
  price: number;
  businessId: string;
}

// ---------- Appointment ----------

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

// ---------- Subscription ----------

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  businessId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Session ----------

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// ---------- Widget ----------

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

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface BlockedSlot {
  startTime: string;
  endTime: string;
}
