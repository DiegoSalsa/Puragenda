import Link from "next/link";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { formatFeedbackPercent, getBookingFeedbackAdminData } from "@/server/services/booking-feedback.service";
import { BarChart3, Star, StickyNote } from "@/components/icons/hover-icons";
import type { BookingFeedbackRating } from "@prisma/client";

export const dynamic = "force-dynamic";

const RANGE_OPTIONS = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "all", label: "Todo" },
] as const;

const RATING_OPTIONS = [
  { value: "ALL", label: "Todos" },
  { value: "POSITIVE", label: "Muy fácil" },
  { value: "IMPROVE", label: "Podría mejorar" },
] as const;

const GOOGLE_OPTIONS = [
  { value: "ALL", label: "Todos" },
  { value: "CLICKED", label: "Hizo click" },
  { value: "NOT_CLICKED", label: "No hizo click" },
] as const;

function buildHref(params: { range?: string; rating?: string; google?: string; business?: string; page?: string }) {
  const search = new URLSearchParams();
  if (params.range && params.range !== "30") search.set("range", params.range);
  if (params.rating && params.rating !== "ALL") search.set("rating", params.rating);
  if (params.google && params.google !== "ALL") search.set("google", params.google);
  if (params.business) search.set("business", params.business);
  if (params.page && params.page !== "1") search.set("page", params.page);
  const query = search.toString();
  return query ? `${ADMIN_SECRET_PATH}/feedback?${query}` : `${ADMIN_SECRET_PATH}/feedback`;
}

export default async function AdminBookingFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; rating?: string; google?: string; business?: string; page?: string }>;
}) {
  const params = await searchParams;
  const range = RANGE_OPTIONS.some((option) => option.value === params.range) ? params.range! : "30";
  const rating = RATING_OPTIONS.some((option) => option.value === params.rating)
    ? params.rating as "ALL" | BookingFeedbackRating
    : "ALL";
  const google = GOOGLE_OPTIONS.some((option) => option.value === params.google)
    ? params.google as "ALL" | "CLICKED" | "NOT_CLICKED"
    : "ALL";
  const businessQuery = params.business?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const since = range === "all" ? null : subDays(new Date(), Number(range) - 1);

  const data = await getBookingFeedbackAdminData({
    since,
    rating,
    google,
    businessQuery,
    page,
  });

  const hrefBase = {
    range,
    rating,
    google,
    business: businessQuery || undefined,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-black/45">Producto</p>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-tighter text-black sm:text-4xl">Feedback de reservas</h1>
          <p className="mt-1 text-sm font-bold text-black/55">
            Opinión interna sobre reservar con Puragenda. Los negocios no ven estos comentarios.
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000]" action={`${ADMIN_SECRET_PATH}/feedback`} method="get">
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildHref({ ...hrefBase, range: option.value, page: "1" })}
              className={`border-2 border-black px-3 py-2 text-xs font-black uppercase ${range === option.value ? "bg-black text-white" : "bg-[#FFF5BA] text-black hover:bg-[#BFFCC6]"}`}
            >
              {option.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildHref({ ...hrefBase, rating: option.value, page: "1" })}
              className={`border-2 border-black px-3 py-2 text-xs font-black uppercase ${rating === option.value ? "bg-black text-white" : "bg-white text-black hover:bg-[#BFFCC6]"}`}
            >
              {option.label}
            </Link>
          ))}
          {GOOGLE_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildHref({ ...hrefBase, google: option.value, page: "1" })}
              className={`border-2 border-black px-3 py-2 text-xs font-black uppercase ${google === option.value ? "bg-[#7C3AED] text-white" : "bg-white text-black hover:bg-[#DDD0FF]"}`}
            >
              Google: {option.label}
            </Link>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <input type="hidden" name="range" value={range} />
          <input type="hidden" name="rating" value={rating} />
          <input type="hidden" name="google" value={google} />
          <input
            type="search"
            name="business"
            defaultValue={businessQuery}
            placeholder="Buscar negocio"
            className="min-w-0 flex-1 border-2 border-black px-3 py-2 text-sm font-bold outline-none"
          />
          <button type="submit" className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white">
            Filtrar
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Experiencia positiva", value: formatFeedbackPercent(data.metrics.positiveRate), sub: `${data.metrics.positive} de ${data.metrics.responses}`, bg: "bg-[#BFFCC6]", icon: Star },
          { label: "Respuestas", value: String(data.metrics.responses), sub: "feedbacks internos", bg: "bg-[#FFF5BA]", icon: BarChart3 },
          { label: "Comentarios", value: String(data.metrics.comments), sub: "con texto", bg: "bg-[#85E3FF]", icon: StickyNote },
          { label: "Clicks a Google", value: String(data.metrics.googleClicks), sub: "abrieron la reseña", bg: "bg-[#FFB5E8]", icon: Star },
          { label: "Tasa de click a Google", value: formatFeedbackPercent(data.metrics.googleClickRate), sub: "sobre respuestas", bg: "bg-[#B28DFF]", icon: Star },
        ].map((stat) => (
          <div key={stat.label} className={`border-4 border-black ${stat.bg} p-4 shadow-[5px_5px_0_#000]`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-black/60">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-black/55" />
            </div>
            <p className="mt-3 text-2xl font-black tracking-tighter text-black sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs font-bold text-black/55">{stat.sub}</p>
          </div>
        ))}
      </div>

      <section className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
        <div className="border-b-4 border-black bg-[#FFF5BA] px-5 py-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-black">Feedback reciente</h2>
          <p className="mt-1 text-xs font-bold text-black/55">{data.total} respuestas · más recientes primero</p>
        </div>
        {data.items.length === 0 ? (
          <p className="p-6 text-sm font-bold text-black/55">Aún no hay feedback para estos filtros.</p>
        ) : (
          <ul className="divide-y-4 divide-black">
            {data.items.map((item) => (
              <li key={item.id} className="space-y-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-black text-black">
                    {item.rating === "POSITIVE" ? "👍 Muy fácil" : "😐 Podría mejorar"}
                  </p>
                  <p className="text-xs font-bold text-black/55">
                    {format(item.createdAt, "dd MMM yyyy · HH:mm", { locale: es })}
                  </p>
                </div>
                <p className="text-sm font-black text-black">
                  <Link href={`${ADMIN_SECRET_PATH}/businesses/${item.business.id}`} className="underline underline-offset-2">
                    {item.business.name}
                  </Link>
                </p>
                <p className="text-sm font-bold text-black/80">
                  {item.comment?.trim() ? `“${item.comment.trim()}”` : "Sin comentario"}
                </p>
                <p className="text-xs font-bold text-black/55">
                  {item.googleReviewClickedAt ? "→ Hizo clic en Google" : "→ No hizo clic en Google"}
                  {" · "}
                  {item.authenticated ? "Autenticado" : "No autenticado"}
                  {" · "}
                  Cita {item.appointmentId.slice(-8)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {data.pageCount > 1 && (
          <div className="flex items-center justify-between border-t-4 border-black px-5 py-3">
            <p className="text-xs font-black uppercase text-black/55">Página {data.page} de {data.pageCount}</p>
            <div className="flex gap-2">
              {data.page > 1 && (
                <Link href={buildHref({ ...hrefBase, page: String(data.page - 1) })} className="border-2 border-black px-3 py-1 text-xs font-black uppercase">
                  Anterior
                </Link>
              )}
              {data.page < data.pageCount && (
                <Link href={buildHref({ ...hrefBase, page: String(data.page + 1) })} className="border-2 border-black bg-black px-3 py-1 text-xs font-black uppercase text-white">
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
