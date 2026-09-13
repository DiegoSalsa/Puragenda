import { ADMIN_SECRET_PATH } from "@/core/constants";
import { REVIEW_REPORT_REASON_LABELS } from "@/lib/reviews/constants";
import { listAdminReportedReviews } from "@/server/services/reviews.service";
import { AdminReviewModerationForm } from "./moderation-form";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await listAdminReportedReviews(page);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-black/45">Marketplace</p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tighter text-black sm:text-4xl">Moderación de reseñas</h1>
        <p className="mt-1 text-sm font-bold text-black/55">
          Casos reportados por negocios. Aprobar publica la opinión; retirar la saca del promedio público.
        </p>
      </div>

      {data.items.length === 0 ? (
        <p className="border-4 border-black bg-white p-6 text-sm font-bold text-black/55">No hay reseñas reportadas.</p>
      ) : (
        <ul className="space-y-4">
          {data.items.map((review) => (
            <li key={review.id} className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-black/45">{review.business.name}</p>
                  <p className="mt-1 text-lg font-black">{review.rating} / 5 · {review.publicReviewerName}</p>
                  <p className="text-xs font-bold text-black/55">
                    {review.serviceNameSnapshot || review.appointment.service?.name || "Servicio"}
                    {review.reportReason ? ` · ${REVIEW_REPORT_REASON_LABELS[review.reportReason]}` : ""}
                  </p>
                </div>
                <span className="border-2 border-black bg-[#FFF5BA] px-2 py-1 text-[10px] font-black uppercase">Reportada</span>
              </div>
              {review.comment ? <p className="mt-3 text-sm font-medium">“{review.comment}”</p> : <p className="mt-3 text-sm text-black/50">Sin comentario.</p>}
              {review.reportDetails ? <p className="mt-2 text-xs font-semibold text-black/60">Detalle del reporte: {review.reportDetails}</p> : null}
              <p className="mt-2 text-xs font-bold text-black/45">
                Reportó {review.reportedByUser?.name || "el negocio"}
              </p>
              <AdminReviewModerationForm reviewId={review.id} />
            </li>
          ))}
        </ul>
      )}

      {data.pageCount > 1 ? (
        <p className="text-sm font-bold">
          Página {data.page} de {data.pageCount}. {data.page < data.pageCount ? (
            <a className="underline" href={`${ADMIN_SECRET_PATH}/reviews?page=${data.page + 1}`}>Siguiente</a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
