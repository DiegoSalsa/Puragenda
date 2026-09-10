import { z } from "zod";
import { BOOKING_FEEDBACK_COMMENT_MAX_LENGTH } from "@/lib/booking-feedback/constants";

export const bookingFeedbackRatingSchema = z.enum(["POSITIVE", "IMPROVE"]);

export const bookingFeedbackRequestSchema = z.object({
  token: z.string().min(20).max(500),
  rating: bookingFeedbackRatingSchema.optional(),
  comment: z.string().trim().max(BOOKING_FEEDBACK_COMMENT_MAX_LENGTH).optional(),
  googleReviewClicked: z.boolean().optional(),
  locale: z.string().trim().max(16).optional(),
}).refine(
  (value) => value.rating !== undefined || value.comment !== undefined || value.googleReviewClicked === true,
  { message: "Debes enviar una valoración, un comentario o el clic de Google." },
);
