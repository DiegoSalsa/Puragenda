"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Star } from "@/components/icons/hover-icons";
import { track } from "@/lib/analytics/client";
import { BOOKING_FEEDBACK_SOURCE, GOOGLE_REVIEW_URL } from "@/lib/booking-feedback/constants";
import {
  readBookingFeedbackFrequency,
  shouldShowPostBookingFeedback,
  writeBookingFeedbackFrequency,
} from "@/lib/booking-feedback/frequency";
import { getWidgetContrastColor } from "@/components/widget/widget-shell";

type FeedbackRating = "POSITIVE" | "IMPROVE";
type FeedbackPhase = "prompt" | "positive" | "improve";

export function BookingFeedbackPanel({
  phase,
  showGoogleCta,
  commentOpen,
  comment,
  commentSaved,
  saving,
  primaryColor,
  textColor,
  textSecondary,
  title,
  subtitle,
  positiveLabel,
  improveLabel,
  positiveThanksTitle,
  positiveThanksBody,
  improveThanksTitle,
  improveThanksBody,
  commentPrompt,
  commentPlaceholder,
  submitComment,
  addComment,
  commentSavedLabel,
  googleCtaPositive,
  googleCtaImprove,
  googleCtaOptional,
  savingLabel,
  onSelectRating,
  onToggleComment,
  onCommentChange,
  onSubmitComment,
  onGoogleClick,
}: {
  phase: FeedbackPhase;
  showGoogleCta: boolean;
  commentOpen: boolean;
  comment: string;
  commentSaved: boolean;
  saving: boolean;
  primaryColor: string;
  textColor: string;
  textSecondary: string;
  title: string;
  subtitle: string;
  positiveLabel: string;
  improveLabel: string;
  positiveThanksTitle: string;
  positiveThanksBody: string;
  improveThanksTitle: string;
  improveThanksBody: string;
  commentPrompt: string;
  commentPlaceholder: string;
  submitComment: string;
  addComment: string;
  commentSavedLabel: string;
  googleCtaPositive: string;
  googleCtaImprove: string;
  googleCtaOptional: string;
  savingLabel: string;
  onSelectRating?: (rating: FeedbackRating) => void;
  onToggleComment?: () => void;
  onCommentChange?: (value: string) => void;
  onSubmitComment?: () => void;
  onGoogleClick?: () => void;
}) {
  const commentId = useId();
  const pc = primaryColor;
  const contrast = getWidgetContrastColor(pc);
  const isPrompt = phase === "prompt";
  const googleLabel = phase === "improve" ? googleCtaImprove : googleCtaPositive;

  return (
    <section
      className="mx-auto max-w-md overflow-hidden rounded-2xl border p-4 text-left transition-[padding] duration-200"
      style={{ background: `${pc}08`, borderColor: `${pc}25` }}
      aria-label={title}
    >
      {isPrompt ? (
        <>
          <h3 className="text-base font-semibold" style={{ color: textColor }}>{title}</h3>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: textSecondary }}>{subtitle}</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onSelectRating?.("POSITIVE")}
              disabled={saving}
              aria-label={positiveLabel}
              className="min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ borderColor: `${pc}55`, background: "var(--wbg)", color: textColor }}
            >
              👍 {positiveLabel}
            </button>
            <button
              type="button"
              onClick={() => onSelectRating?.("IMPROVE")}
              disabled={saving}
              aria-label={improveLabel}
              className="min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ borderColor: "var(--wborder)", background: "var(--wbg)", color: textColor }}
            >
              😐 {improveLabel}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold" style={{ color: textColor }}>
              {phase === "positive" ? positiveThanksTitle : improveThanksTitle}
            </h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: textSecondary }}>
              {phase === "positive" ? positiveThanksBody : improveThanksBody}
            </p>
          </div>

          {showGoogleCta && (
            <div>
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onGoogleClick}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90 hover:shadow-md active:scale-95"
                style={{ background: pc, color: contrast }}
              >
                <Star className="h-4 w-4" aria-hidden="true" />
                {googleLabel}
              </a>
              <p className="mt-2 text-xs" style={{ color: textSecondary }}>{googleCtaOptional}</p>
            </div>
          )}

          {phase === "improve" || commentOpen ? (
            commentSaved ? (
              <p className="flex items-center gap-2 text-sm font-medium text-green-500">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {commentSavedLabel}
              </p>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSubmitComment?.();
                }}
              >
                <label htmlFor={commentId} className="block text-sm font-medium" style={{ color: textColor }}>
                  {commentPrompt}
                </label>
                <textarea
                  id={commentId}
                  value={comment}
                  onChange={(event) => onCommentChange?.(event.target.value)}
                  placeholder={commentPlaceholder}
                  rows={3}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--wborder)", background: "var(--wbg)", color: textColor }}
                />
                <button
                  type="submit"
                  disabled={saving || !comment.trim()}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  style={{ borderColor: `${pc}55`, color: pc, background: `${pc}12` }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {saving ? savingLabel : submitComment}
                </button>
              </form>
            )
          ) : (
            <button
              type="button"
              onClick={onToggleComment}
              className="text-sm font-medium underline underline-offset-4"
              style={{ color: textSecondary }}
            >
              {addComment}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function BookingFeedbackCard({
  previewMode,
  isRecurringSuccess,
  feedbackToken,
  authenticated,
  businessSlug,
  primaryColor,
  textColor,
  textSecondary,
}: {
  previewMode: boolean;
  isRecurringSuccess: boolean;
  feedbackToken: string | null;
  authenticated: boolean;
  businessSlug: string;
  primaryColor: string;
  textColor: string;
  textSecondary: string;
}) {
  const t = useTranslations("widget.feedback");
  const locale = useLocale();
  const [frequency] = useState(() => readBookingFeedbackFrequency());
  const visibility = shouldShowPostBookingFeedback({
    previewMode,
    hasFeedbackToken: Boolean(feedbackToken),
    isRecurringSuccess,
    frequency,
  });
  const [phase, setPhase] = useState<FeedbackPhase>("prompt");
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [commentSaved, setCommentSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const shownRef = useRef(false);
  const googleShownRef = useRef(false);

  useEffect(() => {
    if (!visibility.showPrompt || shownRef.current) return;
    shownRef.current = true;
    track("booking_feedback_shown", {
      source: BOOKING_FEEDBACK_SOURCE,
      authenticated,
    }, { businessSlug });
  }, [authenticated, businessSlug, visibility.showPrompt]);

  useEffect(() => {
    if (!visibility.showPrompt || phase === "prompt" || !visibility.showGoogleCta || googleShownRef.current) return;
    googleShownRef.current = true;
    track("google_review_cta_shown", {
      source: BOOKING_FEEDBACK_SOURCE,
      rating: phase === "positive" ? "positive" : "improve",
      authenticated,
    }, { businessSlug });
  }, [authenticated, businessSlug, phase, visibility.showGoogleCta, visibility.showPrompt]);

  const token = feedbackToken;
  if (!visibility.showPrompt || !token) return null;

  async function persist(payload: { rating?: FeedbackRating; comment?: string; googleReviewClicked?: boolean }) {
    try {
      setSaving(true);
      await fetch("/api/booking-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          locale,
          ...payload,
        }),
      });
    } catch {
      // Best-effort: the booking is already confirmed.
    } finally {
      setSaving(false);
    }
  }

  async function handleRating(rating: FeedbackRating) {
    setPhase(rating === "POSITIVE" ? "positive" : "improve");
    writeBookingFeedbackFrequency({ lastFeedbackAt: Date.now() });
    track(rating === "POSITIVE" ? "booking_feedback_positive" : "booking_feedback_improve", {
      source: BOOKING_FEEDBACK_SOURCE,
      rating: rating === "POSITIVE" ? "positive" : "improve",
      authenticated,
    }, { businessSlug });
    void persist({ rating });
  }

  async function handleComment() {
    if (!comment.trim()) return;
    await persist({ comment });
    setCommentSaved(true);
    track("booking_feedback_comment_submitted", {
      source: BOOKING_FEEDBACK_SOURCE,
      rating: phase === "positive" ? "positive" : "improve",
      authenticated,
    }, { businessSlug });
  }

  function handleGoogleClick() {
    writeBookingFeedbackFrequency({ googleClickedAt: Date.now() });
    track("google_review_cta_clicked", {
      source: BOOKING_FEEDBACK_SOURCE,
      rating: phase === "positive" ? "positive" : "improve",
      authenticated,
    }, { businessSlug });
    void persist({ googleReviewClicked: true });
  }

  return (
    <BookingFeedbackPanel
      phase={phase}
      showGoogleCta={visibility.showGoogleCta}
      commentOpen={commentOpen}
      comment={comment}
      commentSaved={commentSaved}
      saving={saving}
      primaryColor={primaryColor}
      textColor={textColor}
      textSecondary={textSecondary}
      title={t("title")}
      subtitle={t("subtitle")}
      positiveLabel={t("positive")}
      improveLabel={t("improve")}
      positiveThanksTitle={t("positiveThanksTitle")}
      positiveThanksBody={t("positiveThanksBody")}
      improveThanksTitle={t("improveThanksTitle")}
      improveThanksBody={t("improveThanksBody")}
      commentPrompt={t("commentPrompt")}
      commentPlaceholder={t("commentPlaceholder")}
      submitComment={t("submitComment")}
      addComment={t("addComment")}
      commentSavedLabel={t("commentSaved")}
      googleCtaPositive={t("googleCtaPositive")}
      googleCtaImprove={t("googleCtaImprove")}
      googleCtaOptional={t("googleCtaOptional")}
      savingLabel={t("saving")}
      onSelectRating={handleRating}
      onToggleComment={() => setCommentOpen(true)}
      onCommentChange={setComment}
      onSubmitComment={() => { void handleComment(); }}
      onGoogleClick={handleGoogleClick}
    />
  );
}
