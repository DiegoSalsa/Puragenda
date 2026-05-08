// ═══════════════════════════════════════════
// Puragenda — Business Constants
// ═══════════════════════════════════════════

export const APP_NAME = "Puragenda";
export const AGENCY_NAME = "PuroCode";
export const DEFAULT_BRAND_COLOR = "7C3AED";
export const DEFAULT_TIMEZONE = "America/Santiago";

// Auth
export const SALT_ROUNDS = 12;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const AUTH_COOKIE_NAME = "puragenda_session";

// SuperAdmin emails
export const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || "admin@purocode.com,diego@purocode.com,contacto@purocode.com").split(",").map(e => e.trim());

// Emails that receive notifications when a new business registers
export const ADMIN_NOTIFICATION_EMAILS = (process.env.ADMIN_NOTIFICATION_EMAILS || "contacto@purocode.com").split(",").map(e => e.trim());

// Secret admin panel path (must match the folder in src/app/para/)
export const ADMIN_SECRET_PATH = "/para/x7k9m2v4q8";

// Roles
export const ROLES = { ADMIN: "ADMIN", RECEPTIONIST: "RECEPTIONIST", STAFF: "STAFF", SUPERADMIN: "SUPERADMIN" } as const;

// Plans
export const PLANS = { INDIVIDUAL: "INDIVIDUAL", EQUIPO: "EQUIPO", TEST: "TEST" } as const;

// Pricing (CLP/month)
export const PRICING = {
  INDIVIDUAL: { monthly: 12990, name: "Individual" },
  EQUIPO:     { monthly: 29990, name: "Equipo" },
  TEST:       { monthly: 1000, name: "Test" },
} as const;

// Which plan offers a free trial
export const TRIAL_PLAN = PLANS.EQUIPO;

// Extra staff cost (CLP/month) — same rate for Equipo
export const EXTRA_STAFF_COST = {
  EQUIPO: 3000,
} as const;

// Annual discount: pay 10 months, get 12
export const ANNUAL_MULTIPLIER = 10;

// Trial
export const TRIAL_DURATION_DAYS = 30;

// Staff limits per plan
export const STAFF_LIMITS = {
  INDIVIDUAL: 1,
  EQUIPO: 3,     // 3 included, extras purchasable
  TEST: 1,
} as const;

// Marketing email limits per plan
export const MARKETING_LIMITS = {
  INDIVIDUAL: { maxEmails: 50, maxCampaignsPerMonth: 1 },
  EQUIPO: { maxEmails: 100, maxCampaignsPerMonth: 1 },
  TEST: { maxEmails: 10, maxCampaignsPerMonth: 1 },
} as const;

// Appointment statuses
export const APPOINTMENT_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  CHECKED_IN: "CHECKED_IN",
  NO_SHOW: "NO_SHOW",
} as const;

// Subscription statuses
export const SUBSCRIPTION_STATUS = {
  ACTIVE: "ACTIVE",
  TRIALING: "TRIALING",
  INACTIVE: "INACTIVE",
  CANCELLED: "CANCELLED",
} as const;

// Business hours defaults
export const DEFAULT_WORK_START_HOUR = 9;
export const DEFAULT_WORK_END_HOUR = 19;
export const SLOT_STEP_MINUTES = 30;
export const MAX_BOOKING_DAYS_AHEAD = 30;
export const WIDGET_DAYS_TO_SHOW = 10;

// API Key prefix
export const API_KEY_PREFIX = "pg_";

// Days of week (Spanish)
export const DAYS_OF_WEEK = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
] as const;
