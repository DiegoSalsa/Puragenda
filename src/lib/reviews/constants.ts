export const REVIEW_AUTO_PUBLISH_DELAY_MS = 72 * 60 * 60 * 1000;
export const REVIEW_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const REVIEW_COMMENT_MAX_LENGTH = 2000;
export const REVIEW_REPLY_MAX_LENGTH = 2000;
export const REVIEW_REPORT_DETAILS_MAX_LENGTH = 1000;
export const REVIEW_MODERATION_NOTES_MAX_LENGTH = 2000;
export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;
export const REVIEW_EDIT_AFTER_PUBLISH_MS = 48 * 60 * 60 * 1000;
export const REVIEW_INVITE_DELAY_AFTER_END_MS = 2 * 60 * 60 * 1000;
export const REVIEW_INVITE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const REVIEW_INVITE_MAX_PER_APPOINTMENT = 2;
export const REVIEW_PUBLIC_LIST_PAGE_SIZE = 10;
export const REVIEW_DASHBOARD_PAGE_SIZE = 20;
export const REVIEW_COMPARISON_MIN_SAMPLE = 5;

export const REVIEWABLE_APPOINTMENT_STATUSES = ["CHECKED_IN", "COMPLETED"] as const;

export const REVIEW_REPORT_REASONS = [
  "INSULTS",
  "THREATS",
  "PERSONAL_DATA",
  "SPAM",
  "SEXUAL_CONTENT",
  "DISCRIMINATION",
  "NOT_ABOUT_SERVICE",
  "EXTORTION",
  "OTHER",
] as const;

export type ReviewReportReasonCode = (typeof REVIEW_REPORT_REASONS)[number];

export const REVIEW_REPORT_REASON_LABELS: Record<ReviewReportReasonCode, string> = {
  INSULTS: "Insultos o acoso",
  THREATS: "Amenazas",
  PERSONAL_DATA: "Datos personales",
  SPAM: "Spam",
  SEXUAL_CONTENT: "Contenido sexual",
  DISCRIMINATION: "Contenido discriminatorio",
  NOT_ABOUT_SERVICE: "No corresponde a la atención",
  EXTORTION: "Intento de extorsión",
  OTHER: "Otro incumplimiento de las reglas",
};

export const REVIEW_TOKEN_PURPOSE = "verified_review" as const;
