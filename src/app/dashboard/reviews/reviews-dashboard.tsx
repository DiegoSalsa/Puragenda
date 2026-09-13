"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { track } from "@/lib/analytics/client";
import { REVIEW_REPORT_REASON_LABELS, REVIEW_REPORT_REASONS } from "@/lib/reviews/constants";
import { formatRatingAverage, type PublicRatingStats } from "@/lib/reviews/rating";
import { RatingStars } from "@/components/reviews/rating-stars";
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
  privateCount: number;
  pendingCount: number;
  reportedCount: number;
  positiveShare: number | null;
  averageDelta: number | null;
  abuse: {
    received: number;
    reported: number;
    reportedShare: number;
    reportedAverage: number | null;
    rejectedReports: number;
  };
};

const FILTERS = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING", label: "Pendientes" },
  { id: "PUBLISHED", label: "Publicadas" },
  { id: "PRIVATE", label: "Privadas" },
  { id: "REPORTED", label: "Reportadas" },
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

  async function run(action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; sent?: number }>, formData: FormData, success: string, event?: "review_published" | "business_replied") {
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
    <div className="space-y-7 pb-14">
      <header>
        <h1 className="text-3xl font-black">Reseñas</h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Opiniones de clientes con reservas verificadas en Puragenda.
        </p>
      </header>

      {opportunity.canRequest ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">
            Tienes {opportunity.completedRecently} atenciones completadas recientemente y {opportunity.pendingReviews} clientes todavía pueden dejar una opinión.
          </p>
          <form
            className="mt-3"
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
            <button className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold" type="submit">
              Solicitar reseñas
            </button>
          </form>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Valoración promedio" value={average ?? "—"} hint={reputation.summary.count === 0 ? "Aún no hay reseñas públicas" : `${reputation.summary.count} reseñas verificadas`} />
        <Metric label="Reseñas verificadas" value={String(reputation.summary.count)} />
        <Metric label="4–5 estrellas" value={reputation.positiveShare == null ? "—" : `${reputation.positiveShare} %`} />
        <Metric
          label="vs período anterior"
          value={reputation.averageDelta == null ? "—" : `${reputation.averageDelta > 0 ? "+" : ""}${reputation.averageDelta.toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
          hint={reputation.averageDelta == null ? "Se muestra cuando hay suficientes datos" : "Últimos 30 días"}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Públicas" value={String(reputation.summary.count)} />
        <Metric label="Privadas" value={String(reputation.privateCount)} />
        <Metric label="Pendientes" value={String(reputation.pendingCount)} />
        <Metric label="Reportadas" value={String(reputation.reportedCount)} />
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Filtros de reseñas">
        {FILTERS.map((item) => (
          <a
            key={item.id}
            href={item.id === "ALL" ? "/dashboard/reviews" : `/dashboard/reviews?filter=${item.id}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-bold ${filter === item.id ? "border-foreground bg-foreground text-background" : "border-border"}`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {message ? <p role="status" className="text-sm font-semibold">{message}</p> : null}

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-black">Todavía no tienes reseñas.</p>
          <p className="mt-1 text-sm text-muted-foreground">Cuando tus clientes completen una atención podrán compartir su experiencia contigo.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <RatingStars value={review.rating} size="sm" />
                  <p className="mt-2 font-black">{review.publicReviewerName}</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Servicio: {review.serviceNameSnapshot || review.appointment.service?.name || "Servicio"}
                    {review.appointment.staff?.name ? ` · ${review.appointment.staff.name}` : ""}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Atención: {format(new Date(review.appointment.startTime), "d MMMM yyyy", { locale: es })}
                  </p>
                  <p className="mt-1 text-xs font-bold">✓ Reserva #{review.appointment.id.slice(-6)}</p>
                </div>
                <StatusBadge visibility={review.visibility} status={review.status} />
              </div>
              {review.comment ? <p className="mt-3 text-sm leading-6">“{review.comment}”</p> : <p className="mt-3 text-sm text-muted-foreground">Sin comentario.</p>}
              {review.businessReply ? (
                <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm"><span className="font-black">Tu respuesta: </span>{review.businessReply}</p>
              ) : null}

              {review.visibility === "PUBLIC" && review.status === "PENDING" ? (
                <div className="mt-4 flex flex-col gap-3">
                  <form action={(formData) => run(publishReviewAction, formData, "Reseña publicada.", "review_published")}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <button className="rounded-xl border border-border px-3 py-2 text-sm font-bold" type="submit">Publicar</button>
                  </form>
                  <details>
                    <summary className="cursor-pointer text-sm font-bold">Responder y publicar</summary>
                    <form className="mt-2 space-y-2" action={(formData) => run(replyReviewAction, formData, "Respuesta publicada.", "business_replied")}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input type="hidden" name="publish" value="true" />
                      <label className="sr-only" htmlFor={`reply-${review.id}`}>Respuesta pública</label>
                      <textarea id={`reply-${review.id}`} name="reply" required rows={3} className="w-full rounded-xl border border-border bg-background p-2 text-sm" />
                      <button className="rounded-xl border border-border px-3 py-2 text-sm font-bold" type="submit">Responder y publicar</button>
                    </form>
                  </details>
                  <details>
                    <summary className="cursor-pointer text-sm font-bold">Reportar</summary>
                    <form className="mt-2 space-y-2" action={(formData) => run(reportReviewAction, formData, "Reporte enviado a moderación.")}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <label className="text-xs font-bold" htmlFor={`reason-${review.id}`}>Motivo</label>
                      <select id={`reason-${review.id}`} name="reason" required className="w-full rounded-xl border border-border bg-background p-2 text-sm">
                        {REVIEW_REPORT_REASONS.map((reason) => (
                          <option key={reason} value={reason}>{REVIEW_REPORT_REASON_LABELS[reason]}</option>
                        ))}
                      </select>
                      <textarea name="details" rows={2} placeholder="Detalle opcional" className="w-full rounded-xl border border-border bg-background p-2 text-sm" />
                      <button className="rounded-xl border border-border px-3 py-2 text-sm font-bold" type="submit">Enviar reporte</button>
                    </form>
                  </details>
                </div>
              ) : null}

              {review.visibility === "PUBLIC" && review.status === "PUBLISHED" ? (
                <form className="mt-4 space-y-2" action={(formData) => run(replyReviewAction, formData, "Respuesta actualizada.", "business_replied")}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <label className="text-xs font-bold" htmlFor={`reply-pub-${review.id}`}>Respuesta pública</label>
                  <textarea id={`reply-pub-${review.id}`} name="reply" required rows={3} defaultValue={review.businessReply ?? ""} className="w-full rounded-xl border border-border bg-background p-2 text-sm" />
                  <button className="rounded-xl border border-border px-3 py-2 text-sm font-bold" type="submit">
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

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ visibility, status }: { visibility: string; status: string }) {
  const label = visibility === "PRIVATE" ? "Privada" : status === "PENDING" ? "Pendiente" : status === "PUBLISHED" ? "Publicada" : status === "REPORTED" ? "Reportada" : status;
  return <span className="rounded-full border border-border px-2 py-1 text-[10px] font-black uppercase">{label}</span>;
}
