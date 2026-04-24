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
export const SUPERADMIN_EMAILS = ["admin@purocode.cl", "diego@purocode.cl"];

// Roles
export const ROLES = { OWNER: "OWNER", STAFF: "STAFF", SUPERADMIN: "SUPERADMIN" } as const;

// Plans
export const PLANS = { INDIVIDUAL: "INDIVIDUAL", BASIC: "BASIC", PRO: "PRO" } as const;

// Pricing (CLP/month)
export const PRICING = {
  INDIVIDUAL: { monthly: 14990, name: "Individual" },
  BASIC:      { monthly: 24990, name: "Base" },
  PRO:        { monthly: 39990, name: "Pro" },
} as const;

// Extra staff cost (CLP/month)
export const EXTRA_STAFF_COST = {
  BASIC: 3000,
  PRO: 5000,
} as const;

// Annual discount: pay 10 months, get 12
export const ANNUAL_MULTIPLIER = 10;

// Trial
export const TRIAL_DURATION_DAYS = 30;

// Staff limits per plan
export const STAFF_LIMITS = {
  INDIVIDUAL: 1,
  BASIC: 1,  // 1 included, extras purchasable
  PRO: 1,     // 1 included, extras purchasable
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
