"use client";

import { useState } from "react";
import { track } from "@/lib/analytics/client";
import { REVIEW_COMMENT_MAX_LENGTH } from "@/lib/reviews/constants";
import { RatingStars } from "./rating-stars";

type ReviewFormProps = {
  token?: string | null;
  appointmentId?: string;
  businessName: string;
  serviceName: string;
  source?: string;
  authenticated?: boolean;
  onSubmitted?: (result: { visibility: string; status: string }) => void;
};

export function ReviewForm({
  token,
  appointmentId,
  businessName,
  serviceName,
  source = "review_form",
  authenticated = false,
  onSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Elige una puntuación de 1 a 5 estrellas.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          appointmentId: appointmentId || undefined,
          rating,
          comment: comment.trim() || undefined,
          visibility,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo enviar tu opinión.");
        return;
      }
      track("review_submitted", { source, visibility, authenticated });
      if (visibility === "PUBLIC") {
        track("public_review_requested", { source, authenticated });
      }
      onSubmitted?.({ visibility: data.visibility, status: data.status });
    } catch {
      setError("No se pudo enviar tu opinión.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <p id="review-rating-label" className="text-sm font-black">
          ¿Cómo estuvo tu atención en {businessName}?
        </p>
        <p className="mt-1 text-xs font-semibold text-black/55">{serviceName}</p>
        <div className="mt-3">
          <RatingStars value={rating} interactive size="lg" onChange={setRating} labelledBy="review-rating-label" />
        </div>
      </div>

      <div>
        <label htmlFor="review-comment" className="text-sm font-black">
          Cuéntanos tu experiencia
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, REVIEW_COMMENT_MAX_LENGTH))}
          rows={4}
          className="mt-2 w-full rounded-2xl border-2 border-black bg-white p-3 text-sm font-medium outline-none focus-visible:ring-4 focus-visible:ring-[#7C3AED]/40"
          placeholder="Opcional"
        />
        <p className="mt-1 text-right text-xs font-semibold text-black/45">
          {comment.length}/{REVIEW_COMMENT_MAX_LENGTH}
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-black">¿Quién puede ver tu comentario?</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-black bg-white p-3">
          <input
            type="radio"
            name="visibility"
            value="PRIVATE"
            checked={visibility === "PRIVATE"}
            onChange={() => setVisibility("PRIVATE")}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-black">Solo el negocio</span>
            <span className="text-xs font-semibold text-black/55">Feedback privado. No aparece en Puragenda.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-black bg-white p-3">
          <input
            type="radio"
            name="visibility"
            value="PUBLIC"
            checked={visibility === "PUBLIC"}
            onChange={() => setVisibility("PUBLIC")}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-black">Publicarlo como opinión en Puragenda</span>
            <span className="text-xs font-semibold text-black/55">
              Las opiniones públicas pueden aparecer en el perfil del negocio. Solo mostramos información mínima de tu perfil.
            </span>
          </span>
        </label>
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-black bg-[#7C3AED] px-4 text-sm font-black text-white shadow-[3px_3px_0_#000] disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar opinión"}
      </button>
    </form>
  );
}
