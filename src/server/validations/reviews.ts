import { z } from "zod";
import {
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_MAX_RATING,
  REVIEW_MIN_RATING,
  REVIEW_MODERATION_NOTES_MAX_LENGTH,
  REVIEW_REPLY_MAX_LENGTH,
  REVIEW_REPORT_DETAILS_MAX_LENGTH,
  REVIEW_REPORT_REASONS,
} from "@/lib/reviews/constants";

export const reviewRatingSchema = z.number().int().min(REVIEW_MIN_RATING).max(REVIEW_MAX_RATING);
export const reviewVisibilitySchema = z.enum(["PRIVATE", "PUBLIC"]);
export const reviewReportReasonSchema = z.enum(REVIEW_REPORT_REASONS);
export const reviewModerationDecisionSchema = z.enum(["APPROVE", "REMOVE", "KEEP_PRIVATE"]);

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => (value && value.length > 0 ? value : undefined));

export const submitReviewSchema = z.object({
  token: z.string().min(20).max(2000).optional(),
  appointmentId: z.string().cuid().optional(),
  rating: reviewRatingSchema,
  comment: optionalText(REVIEW_COMMENT_MAX_LENGTH),
  visibility: reviewVisibilitySchema,
});

export const editReviewSchema = z.object({
  token: z.string().min(20).max(2000).optional(),
  rating: reviewRatingSchema.optional(),
  comment: z.string().trim().max(REVIEW_COMMENT_MAX_LENGTH).nullable().optional(),
  visibility: reviewVisibilitySchema.optional(),
});

export const replyReviewSchema = z.object({
  reply: z.string().trim().min(1).max(REVIEW_REPLY_MAX_LENGTH),
  publish: z.boolean().optional(),
});

export const reportReviewSchema = z.object({
  reason: reviewReportReasonSchema,
  details: optionalText(REVIEW_REPORT_DETAILS_MAX_LENGTH),
});

export const moderateReviewSchema = z.object({
  decision: reviewModerationDecisionSchema,
  notes: optionalText(REVIEW_MODERATION_NOTES_MAX_LENGTH),
});

export const requestReviewInvitesSchema = z.object({
  appointmentIds: z.array(z.string().cuid()).max(50).optional(),
});
