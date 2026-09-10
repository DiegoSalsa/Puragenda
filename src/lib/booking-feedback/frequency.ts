import {
  BOOKING_FEEDBACK_COOLDOWN_MS,
  BOOKING_FEEDBACK_STORAGE_KEY,
  GOOGLE_REVIEW_CTA_COOLDOWN_MS,
} from "./constants";

/**
 * V1 frequency caps (browser localStorage, unauthenticated-friendly):
 * - Ask the 2-button prompt at most once every 30 days.
 * - Hide the Google CTA for 180 days after a click.
 * Clear `puragenda_booking_feedback` to retest the prompt locally.
 */

export type BookingFeedbackFrequencyState = {
  lastFeedbackAt?: number;
  googleClickedAt?: number;
};

export function parseBookingFeedbackFrequencyState(raw: string | null): BookingFeedbackFrequencyState {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as BookingFeedbackFrequencyState;
    return {
      lastFeedbackAt: typeof parsed.lastFeedbackAt === "number" ? parsed.lastFeedbackAt : undefined,
      googleClickedAt: typeof parsed.googleClickedAt === "number" ? parsed.googleClickedAt : undefined,
    };
  } catch {
    return {};
  }
}

export function shouldAskForBookingFeedback(
  state: BookingFeedbackFrequencyState,
  now = Date.now(),
) {
  if (!state.lastFeedbackAt) return true;
  return now - state.lastFeedbackAt >= BOOKING_FEEDBACK_COOLDOWN_MS;
}

export function shouldShowGoogleReviewCta(
  state: BookingFeedbackFrequencyState,
  now = Date.now(),
) {
  if (!state.googleClickedAt) return true;
  return now - state.googleClickedAt >= GOOGLE_REVIEW_CTA_COOLDOWN_MS;
}

export function readBookingFeedbackFrequency(): BookingFeedbackFrequencyState {
  if (typeof window === "undefined") return {};
  try {
    return parseBookingFeedbackFrequencyState(window.localStorage.getItem(BOOKING_FEEDBACK_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function writeBookingFeedbackFrequency(patch: BookingFeedbackFrequencyState) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readBookingFeedbackFrequency(), ...patch };
    window.localStorage.setItem(BOOKING_FEEDBACK_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or blocked storage should not break the success screen.
  }
}

export function shouldShowPostBookingFeedback(options: {
  previewMode: boolean;
  hasFeedbackToken: boolean;
  isRecurringSuccess: boolean;
  frequency?: BookingFeedbackFrequencyState;
  now?: number;
}) {
  if (options.previewMode) return { showPrompt: false, showGoogleCta: false };
  if (options.isRecurringSuccess) return { showPrompt: false, showGoogleCta: false };
  if (!options.hasFeedbackToken) return { showPrompt: false, showGoogleCta: false };

  const frequency = options.frequency ?? {};
  const showPrompt = shouldAskForBookingFeedback(frequency, options.now);
  return {
    showPrompt,
    showGoogleCta: showPrompt && shouldShowGoogleReviewCta(frequency, options.now),
  };
}
