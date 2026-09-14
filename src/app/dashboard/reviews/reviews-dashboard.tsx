"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { track } from "@/lib/analytics/client";
import { REVIEW_REPORT_REASON_LABELS, REVIEW_REPORT_REASONS } from "@/lib/reviews/constants";
import { formatRatingAverage, type PublicRatingStats } from "@/lib/reviews/rating";
import { RatingStars } from "@/components/reviews/rating-stars";
import { VerifiedBookingBadge } from "@/components/reviews/verified-booking-badge";
import {
  publishReviewAction,
  replyReviewAction,
  reportReviewAction,
  requestReviewInvitesAction,
} from "@/server/actions/reviews.actions";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  status: "PENDING" | "PUBLISHED" | "REPORTED" | "REMOVED";
  submittedAt: string;
  publicReviewerName: string;
  serviceNameSnapshot: string | null;
  businessReply: string | null;
  appointment: {
    id: string;
    startTime: string;
    service?: { name: string } | null;
    staff?: { name: string } | null;
  };
};

type Reputation = {
  summary: PublicRatingStats;
  allCount: number;
  privateCount: number;
  pendingCount: number;
  reportedCount: number;
  positiveShare: number | null;
  averageDelta: number | null;
};

const FILTERS = [
  { id: "ALL", label: "Todas", empty: "Todavía no tienes reseñas." },
  { id: "PENDING", label: "Pendientes", empty: "No tienes reseñas pendientes." },
  { id: "PUBLISHED", label: "Publicadas", empty: "Aún no hay reseñas publicadas." },
  { id: "PRIVATE", label: "Privadas", empty: "No hay feedback privado." },
  { id: "REPORTED", label: "Reportadas", empty: "No hay reseñas reportadas." },
] as const;

export function ReviewsDashboard({
  reputation,
  reviews,
  filter,
  opportunity,
}: {
  reputation: Reputation;
  reviews: ReviewRow[];
  filter: string;
  opportunity: { completedRecently: number; pendingReviews: number; canRequest: boolean };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const average = formatRatingAverage(reputation.summary.average);
  const attention = reputation.pendingCount + reputation.reportedCount;
  const counts: Record<string, number> = {
    ALL: reputation.allCount,
    PENDING: reputation.pendingCount,
    PUBLISHED: reputation.summary.count,
    PRIVATE: reputation.privateCount,
    REPORTED: reputation.reportedCount,
  };
  const emptyCopy = FILTERS.find((item) => item.id === filter)?.empty ?? FILTERS[0].empty;

  async function run(
    action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; sent?: number }>,
    formData: FormData,
    success: string,
    event?: "review_published" | "business_replied",
  ) {
    const result = await action(formData);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    if (event) track(event, { source: "dashboard" });
    setMessage(typeof result.sent === "number" ? `Enviamos ${result.sent} invitaciones.` : success);
    router.refresh();
  }

  return (
    <div className="space-y-6 pb-14">
      <header>
        <h1 className="text-3xl font-black">Reseñas</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">
          Opiniones de clientes con reservas verificadas en Puragenda.
        </p>
      </header>

      {opportunity.canRequest ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Tienes {opportunity.completedRecently} atenciones completadas recientemente y {opportunity.pendingReviews} clientes todavía pueden dejar una opinión.
          </p>
          <form
            action={async () => {
              const result = await requestReviewInvitesAction();
              if (!result.ok) {
                setMessage(result.error);
                return;
              }
              setMessage(`Enviamos ${result.sent} invitaciones.`);
              track("review_invited", { source: "dashboard" });
              router.refresh();
            }}
          >
            <button className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-bold" type="submit">
              Solicitar reseñas
            </button>
          </form>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">Valoración promedio</p>
          <p className="mt-2 text-3xl font-black tabular-nums">{average ?? "—"}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {reputation.summary.count === 0
              ? "Aún no hay reseñas públicas"
              : `${reputation.summary.count} reseñas verificadas`}
          </p>
          {reputation.averageDelta != null ? (
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {reputation.averageDelta > 0 ? "↑" : reputation.averageDelta < 0 ? "↓" : "→"}{" "}
              {Math.abs(reputation.averageDelta).toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} vs período anterior
            </p>
          ) : null}
        </article>
        <Metric label="Reseñas públicas" value={String(reputation.summary.count)} />
        <Metric
          label="Satisfacción"
          value={reputation.positiveShare == null ? "—" : `${reputation.positiveShare} %`}
          hint="4–5 estrellas"
        />
        {attention > 0 ? (
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-bold text-muted-foreground">Requieren atención</p>
            <p className="mt-2 text-3xl font-black tabular-nums">{attention}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {reputation.pendingCount} pendiente{reputation.pendingCount === 1 ? "" : "s"}
              {" · "}
              {reputation.reportedCount} reportada{reputation.reportedCount === 1 ? "" : "s"}
            </p>
          </article>
        ) : null}
      </section>

      <nav className="-mx-1 flex flex-wrap gap-2 overflow-x-auto px-1 pb-1" aria-label="Filtros de reseñas">
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <a
              key={item.id}
              href={item.id === "ALL" ? "/dashboard/reviews" : `/dashboard/reviews?filter=${item.id}`}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 ${
                selected ? "border-foreground bg-foreground text-background" : "border-border bg-background"
              }`}
            >
              {item.label} ({counts[item.id]})
            </a>
          );
        })}
      </nav>

      {message ? <p role="status" className="text-sm font-semibold">{message}</p> : null}

      {reviews.length === 0 ? (
        <p className="py-6 text-sm font-medium text-muted-foreground">{emptyCopy}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <RatingStars value={review.rating} size="sm" />
                  <p className="mt-2 font-black">{review.publicReviewerName}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {review.serviceNameSnapshot || review.appointment.service?.name || "Servicio"}
                    {review.appointment.staff?.name ? ` · ${review.appointment.staff.name}` : ""}
                    {" · "}
                    {format(new Date(review.appointment.startTime), "d MMM yyyy", { locale: es })}
                  </p>
                  <div className="mt-1">
                    <VerifiedBookingBadge compact />
                  </div>
                </div>
                <StatusBadge visibility={review.visibility} status={review.status} />
              </div>
              {review.comment ? (
                <p className="mt-3 max-w-prose text-sm leading-6">“{review.comment}”</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Sin comentario.</p>
              )}
              {review.businessReply ? (
                <div className="mt-3 max-w-prose rounded-xl bg-muted/50 p-3">
                  <p className="text-xs font-bold text-muted-foreground">Tu respuesta</p>
                  <p className="mt-1 text-sm leading-6">{review.businessReply}</p>
                </div>
              ) : null}

              {review.visibility === "PUBLIC" && review.status === "PENDING" ? (
                <PendingActions reviewId={review.id} run={run} />
              ) : null}

              {review.visibility === "PUBLIC" && review.status === "PUBLISHED" ? (
                <form className="mt-4 max-w-prose space-y-2" action={(formData) => run(replyReviewAction, formData, "Respuesta actualizada.", "business_replied")}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <label className="text-xs font-bold" htmlFor={`reply-pub-${review.id}`}>Respuesta pública</label>
                  <textarea id={`reply-pub-${review.id}`} name="reply" required rows={3} defaultValue={review.businessReply ?? ""} className="w-full rounded-xl border border-border bg-background p-2 text-sm" />
                  <button className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold" type="submit">
                    {review.businessReply ? "Actualizar respuesta" : "Responder"}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PendingActions({
  reviewId,
  run,
}: {
  reviewId: string;
  run: (
    action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; sent?: number }>,
    formData: FormData,
    success: string,
    event?: "review_published" | "business_replied",
  ) => Promise<void>;
}) {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
        <form action={(formData) => run(publishReviewAction, formData, "Reseña publicada.", "review_published")}>
          <input type="hidden" name="reviewId" value={reviewId} />
          <button className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-foreground px-4 text-sm font-bold text-background sm:w-auto" type="submit">
            Publicar
          </button>
        </form>
        <details className="min-w-0 sm:flex-1">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-xl border border-border px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40">
            Responder y publicar
          </summary>
          <form className="mt-2 max-w-prose space-y-2" action={(formData) => run(replyReviewAction, formData, "Respuesta publicada.", "business_replied")}>
            <input type="hidden" name="reviewId" value={reviewId} />
            <input type="hidden" name="publish" value="true" />
            <label className="sr-only" htmlFor={`reply-${reviewId}`}>Respuesta pública</label>
            <textarea id={`reply-${reviewId}`} name="reply" required rows={3} className="w-full rounded-xl border border-border bg-background p-2 text-sm" />
            <button className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold" type="submit">
              Responder y publicar
            </button>
          </form>
        </details>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40">
          Reportar
        </summary>
        <form className="mt-2 max-w-prose space-y-2" action={(formData) => run(reportReviewAction, formData, "Reporte enviado a moderación.")}>
          <input type="hidden" name="reviewId" value={reviewId} />
          <label className="text-xs font-bold" htmlFor={`reason-${reviewId}`}>Motivo</label>
          <select id={`reason-${reviewId}`} name="reason" required className="w-full min-h-11 rounded-xl border border-border bg-background p-2 text-sm">
            {REVIEW_REPORT_REASONS.map((reason) => (
              <option key={reason} value={reason}>{REVIEW_REPORT_REASON_LABELS[reason]}</option>
            ))}
          </select>
          <textarea name="details" rows={2} placeholder="Detalle opcional" className="w-full rounded-xl border border-border bg-background p-2 text-sm" />
          <button className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold" type="submit">
            Enviar reporte
          </button>
        </form>
      </details>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium text-muted-foreground">{hint}</p> : null}
    </article>
  );
}

function StatusBadge({ visibility, status }: { visibility: string; status: string }) {
  const label = visibility === "PRIVATE" ? "Privada" : status === "PENDING" ? "Pendiente" : status === "PUBLISHED" ? "Publicada" : status === "REPORTED" ? "Reportada" : status;
  return (
    <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[11px] font-bold">
      <span className="sr-only">Estado: </span>
      {label}
    </span>
  );
}
