import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookingFeedbackPanel } from "@/components/widget/booking-feedback-card";
import { GOOGLE_REVIEW_URL } from "@/lib/booking-feedback/constants";
import { shouldShowPostBookingFeedback } from "@/lib/booking-feedback/frequency";

const copy = {
  title: "¿Cómo fue reservar con Puragenda?",
  subtitle: "¿Te resultó fácil?",
  positiveLabel: "Muy fácil",
  improveLabel: "Podría mejorar",
  positiveThanksTitle: "¡Qué bueno!",
  positiveThanksBody: "Tu opinión ayuda a que más negocios conozcan Puragenda.",
  improveThanksTitle: "Gracias por contárnoslo.",
  improveThanksBody: "Queremos que reservar sea cada vez más fácil.",
  commentPrompt: "¿Qué podríamos mejorar?",
  commentPlaceholder: "Cuéntanos qué te costó o qué cambiarías...",
  submitComment: "Enviar comentario",
  addComment: "Agregar un comentario",
  commentSavedLabel: "Comentario enviado. Gracias.",
  googleCtaPositive: "Calificar Puragenda en Google",
  googleCtaImprove: "Dejar una reseña en Google",
  googleCtaOptional: "Es opcional y toma menos de un minuto.",
  savingLabel: "Guardando…",
  primaryColor: "#7C3AED",
  textColor: "#111111",
  textSecondary: "#666666",
};

describe("post-booking feedback UI", () => {
  it("shows the Google CTA after a POSITIVE rating", () => {
    const html = renderToStaticMarkup(React.createElement(BookingFeedbackPanel, {
      ...copy,
      phase: "positive",
      showGoogleCta: true,
      commentOpen: false,
      comment: "",
      commentSaved: false,
      saving: false,
    }));
    expect(html).toContain("Calificar Puragenda en Google");
    expect(html).toContain(GOOGLE_REVIEW_URL);
    expect(html).not.toContain("déjanos 5 estrellas");
  });

  it("keeps the Google CTA visible after IMPROVE (no review gating)", () => {
    const html = renderToStaticMarkup(React.createElement(BookingFeedbackPanel, {
      ...copy,
      phase: "improve",
      showGoogleCta: true,
      commentOpen: false,
      comment: "",
      commentSaved: false,
      saving: false,
    }));
    expect(html).toContain("Dejar una reseña en Google");
    expect(html).toContain(GOOGLE_REVIEW_URL);
    expect(html).toContain("¿Qué podríamos mejorar?");
    expect(html).not.toContain("Solo si tuviste una buena experiencia");
  });

  it("does not show feedback in preview mode", () => {
    expect(shouldShowPostBookingFeedback({
      previewMode: true,
      hasFeedbackToken: true,
      isRecurringSuccess: false,
    })).toEqual({ showPrompt: false, showGoogleCta: false });
  });

  it("does not show feedback for recurring success without a real appointment token", () => {
    expect(shouldShowPostBookingFeedback({
      previewMode: false,
      hasFeedbackToken: false,
      isRecurringSuccess: true,
    }).showPrompt).toBe(false);
  });
});
