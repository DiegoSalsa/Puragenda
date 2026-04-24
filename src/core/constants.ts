// ═══════════════════════════════════════════
// Puragenda — Business Constants
// ═══════════════════════════════════════════

export const APP_NAME = "Puragenda";
export const AGENCY_NAME = "PuroCode";
export const DEFAULT_BRAND_COLOR = "7C3AED"; // Purple-600
export const DEFAULT_TIMEZONE = "America/Santiago";

// Auth
export const SALT_ROUNDS = 12;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const AUTH_COOKIE_NAME = "puragenda_session";

// SuperAdmin emails (hardcoded fallback)
export const SUPERADMIN_EMAILS = [
  "admin@purocode.cl",
  "diego@purocode.cl",
];

// Roles
export const ROLES = {
  OWNER: "OWNER",
  STAFF: "STAFF",
  SUPERADMIN: "SUPERADMIN",
} as const;

// Plans
export const PLANS = {
  BASIC: "BASIC",
  PRO: "PRO",
} as const;

// Pricing (CLP)
export const PRICING = {
  BASIC: 24990,
  PRO: 39990,
} as const;

// Trial
export const TRIAL_DURATION_DAYS = 30;

// Appointment statuses
export const APPOINTMENT_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
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
