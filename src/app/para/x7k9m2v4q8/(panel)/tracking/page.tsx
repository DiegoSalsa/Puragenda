import Link from "next/link";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/server/db/prisma";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { ANALYTICS_POLICY_VERSION } from "@/lib/analytics/policy";
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  Users,
} from "@/components/icons/hover-icons";

export const dynamic = "force-dynamic";

const RANGE_OPTIONS = [7, 30, 90] as const;

function normalizeRange(value: string | undefined) {
  const parsed = Number(value);
  return RANGE_OPTIONS.includes(parsed as (typeof RANGE_OPTIONS)[number]) ? parsed : 30;
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? `${Math.round((numerator / denominator) * 100)}%` : "—";
}

function eventLabel(event: string) {
  return event.replaceAll("_", " ");
}

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = normalizeRange(params.range);
  const now = new Date();
  const since = subDays(now, range - 1);

  type NamedCount = { name: string; count: number };
  type EventVisitorCount = { event: string; count: number };
  type DayCount = { day: Date; count: number };
  const [recentEvents, totalEvents, eventCountsRows, visitorCountsRows, pageRows, sourceRows, dayRows, consentCounts, activatedSubscriptions, approvedDeposits] = await Promise.all([
    prisma.trackingEvent.findMany({
      where: { occurredAt: { gte: since } },
      select: { id: true, event: true, occurredAt: true, path: true, referrerDomain: true, utmSource: true },
      orderBy: { occurredAt: "desc" }, take: 20,
    }),
    prisma.trackingEvent.count({ where: { occurredAt: { gte: since } } }),
    prisma.$queryRaw<Array<{ event: string; count: number }>>`
      SELECT "event", COUNT(*)::int AS "count" FROM "TrackingEvent"
      WHERE "occurredAt" >= ${since} GROUP BY "event" ORDER BY "count" DESC`,
    prisma.$queryRaw<EventVisitorCount[]>`
      SELECT "event", COUNT(DISTINCT COALESCE("visitorId", "userId", "sessionId", "id"))::int AS "count"
      FROM "TrackingEvent" WHERE "occurredAt" >= ${since} GROUP BY "event"`,
    prisma.$queryRaw<NamedCount[]>`
      SELECT "path" AS "name", COUNT(*)::int AS "count" FROM "TrackingEvent"
      WHERE "occurredAt" >= ${since} AND "event" = 'page_view' AND "path" IS NOT NULL
      GROUP BY "path" ORDER BY "count" DESC LIMIT 8`,
    prisma.$queryRaw<NamedCount[]>`
      SELECT COALESCE("utmSource", "referrerDomain", 'Directo') AS "name", COUNT(*)::int AS "count"
      FROM "TrackingEvent" WHERE "occurredAt" >= ${since} AND "event" = 'page_view'
      GROUP BY 1 ORDER BY "count" DESC LIMIT 6`,
    prisma.$queryRaw<DayCount[]>`
      SELECT DATE_TRUNC('day', "occurredAt") AS "day", COUNT(*)::int AS "count"
      FROM "TrackingEvent" WHERE "occurredAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    prisma.trackingConsent.groupBy({
      by: ["decision"], where: { occurredAt: { gte: since } }, _count: { _all: true },
    }),
    prisma.subscription.count({
      where: {
        status: { in: ["ACTIVE", "TRIALING"] },
        createdAt: { gte: since },
      },
    }),
    prisma.appointment.count({
      where: {
        createdAt: { gte: since },
        paymentStatus: "APPROVED",
      },
    }),
  ]);

  const visitorCounts = new Map(visitorCountsRows.map((row) => [row.event, row.count]));
  const visitors = visitorCounts.get("page_view") || 0;
  const ctaVisitors = visitorCounts.get("landing_cta_clicked") || 0;
  const registrationStarts = visitorCounts.get("registration_started") || 0;
  const registrations = visitorCounts.get("registration_completed") || 0;
  const checkoutStarts = visitorCounts.get("checkout_started") || 0;
  const widgetOpens = visitorCounts.get("widget_opened") || 0;
  const serviceSelections = visitorCounts.get("booking_service_selected") || 0;
  const slotSelections = visitorCounts.get("booking_slot_selected") || 0;
  const detailsSubmissions = visitorCounts.get("booking_details_submitted") || 0;
  const bookings = visitorCounts.get("booking_created") || 0;
  const paymentsRequired = visitorCounts.get("booking_payment_required") || 0;
  const eventsByDay = new Map(dayRows.map((row) => [format(row.day, "yyyy-MM-dd"), row.count]));

  const days = Array.from({ length: range }, (_, index) => subDays(now, range - index - 1));
  const dailyCounts = days.map((day) => ({
    label: format(day, "d MMM", { locale: es }),
    total: eventsByDay.get(format(day, "yyyy-MM-dd")) || 0,
  }));
  const maxDailyCount = Math.max(1, ...dailyCounts.map((day) => day.total));
  const topPages = pageRows.map((row) => [row.name, row.count] as const);
  const topSources = sourceRows.map((row) => [row.name, row.count] as const);
  const topEvents = eventCountsRows.map((row) => [row.event, row.count] as const);
  const acceptedConsents = consentCounts.find((row) => row.decision === "accepted")?._count._all || 0;
  const rejectedConsents = consentCounts.find((row) => row.decision === "rejected")?._count._all || 0;

  const funnels = [
    {
      title: "Adquisición y registro",
      color: "bg-[#85E3FF]",
      steps: [
        ["Visitas", visitors],
        ["CTA principal", ctaVisitors],
        ["Inicio de registro", registrationStarts],
        ["Registro completado", registrations],
        ["Checkout iniciado", checkoutStarts],
        ["Suscripciones activadas", activatedSubscriptions],
      ],
    },
    {
      title: "Reserva del cliente",
      color: "bg-[#BFFCC6]",
      steps: [
        ["Widget abierto", widgetOpens],
        ["Servicio seleccionado", serviceSelections],
        ["Horario seleccionado", slotSelections],
        ["Datos enviados", detailsSubmissions],
        ["Reserva creada", bookings],
        ["Requiere pago", paymentsRequired],
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-black/45">Producto y adquisición</p>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-tighter text-black sm:text-4xl">Tracking</h1>
          <p className="mt-1 text-sm font-bold text-black/55">Eventos consentidos y seudonimizados, sin datos de contacto ni contenido de formularios. Política de consentimiento {ANALYTICS_POLICY_VERSION}.</p>
        </div>
        <div className="flex border-2 border-black bg-white p-1 shadow-[3px_3px_0_#000]">
          {RANGE_OPTIONS.map((option) => (
            <Link
              key={option}
              href={`${ADMIN_SECRET_PATH}/tracking?range=${option}`}
              className={`px-3 py-2 text-xs font-black uppercase transition-colors ${range === option ? "bg-black text-white" : "text-black/55 hover:bg-[#FFF5BA]"}`}
            >
              {option} días
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Visitantes", value: visitors, sub: `${totalEvents} eventos`, icon: Users, bg: "bg-[#85E3FF]" },
          { label: "Registro", value: percentage(registrations, ctaVisitors), sub: `${registrations} completados`, icon: TrendingUp, bg: "bg-[#BFFCC6]" },
          { label: "Reserva", value: percentage(bookings, widgetOpens), sub: `${bookings} creadas`, icon: CalendarCheck, bg: "bg-[#FFF5BA]" },
          { label: "Checkouts", value: checkoutStarts, sub: "iniciados", icon: CreditCard, bg: "bg-[#FFB5E8]" },
          { label: "Suscripciones", value: activatedSubscriptions, sub: "activadas en el período", icon: TrendingUp, bg: "bg-[#BFFCC6]" },
          { label: "Abonos aprobados", value: approvedDeposits, sub: "confirmados en el período", icon: CreditCard, bg: "bg-[#FFB5E8]" },
          { label: "Consentimiento", value: acceptedConsents, sub: `${rejectedConsents} rechazados`, icon: ShieldCheck, bg: "bg-[#BFFCC6]" },
          { label: "Datos recientes", value: recentEvents.length > 0 ? "Activo" : "Esperando", sub: recentEvents.length > 0 ? `último ${format(recentEvents[0].occurredAt, "d MMM HH:mm", { locale: es })}` : "acepta cookies para generar eventos", icon: BarChart3, bg: "bg-[#B28DFF]" },
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

      <div className="grid gap-6 xl:grid-cols-2">
        {funnels.map((funnel) => {
          const firstValue = funnel.steps[0][1] as number;
          return (
            <section key={funnel.title} className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
              <div className={`border-b-4 border-black ${funnel.color} px-5 py-4`}>
                <h2 className="text-sm font-black uppercase tracking-wide text-black">{funnel.title}</h2>
                <p className="mt-1 text-xs font-bold text-black/55">Cada etapa representa visitantes únicos del período seleccionado.</p>
              </div>
              <ol className="space-y-3 p-5">
                {funnel.steps.map(([label, value], index) => {
                  const count = value as number;
                  return (
                    <li key={label as string} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black bg-black text-xs font-black text-white">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-black text-black">{label as string}</p>
                          <p className="text-sm font-black text-black">{count}</p>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden border border-black bg-[#FFFAEB]">
                          <div className="h-full bg-[#7C3AED]" style={{ width: `${firstValue ? Math.max(2, (count / firstValue) * 100) : 0}%` }} />
                        </div>
                      </div>
                      <span className="w-10 text-right text-xs font-bold text-black/55">{percentage(count, firstValue)}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <section className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
        <div className="flex items-center justify-between border-b-4 border-black bg-[#FFF5BA] px-5 py-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-black">Volumen diario</h2>
            <p className="mt-1 text-xs font-bold text-black/55">Eventos permitidos por consentimiento durante los últimos {range} días.</p>
          </div>
          <BarChart3 className="h-5 w-5 text-black/65" />
        </div>
        <div className="flex h-44 items-end gap-1 overflow-x-auto px-4 pb-7 pt-6 sm:gap-2">
          {dailyCounts.map((day) => (
            <div key={day.label} className="flex min-w-7 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-black text-black/60">{day.total || ""}</span>
              <div className="w-full min-w-4 border-2 border-black bg-[#85E3FF]" style={{ height: `${Math.max(4, (day.total / maxDailyCount) * 100)}px` }} />
              <span className="whitespace-nowrap text-[9px] font-bold text-black/45">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
          <div className="border-b-4 border-black bg-[#85E3FF] px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-black">Páginas más vistas</h2>
          </div>
          <div className="space-y-2 p-4">
            {topPages.length === 0 ? <EmptyState /> : topPages.map(([path, count], index) => (
              <div key={path} className="flex items-center justify-between gap-3 border-2 border-black bg-[#FFFAEB] px-3 py-2">
                <p className="min-w-0 truncate text-sm font-bold text-black"><span className="mr-2 text-xs text-black/45">#{index + 1}</span>{path}</p>
                <span className="shrink-0 font-black text-black">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
          <div className="border-b-4 border-black bg-[#BFFCC6] px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-black">Canales de llegada</h2>
          </div>
          <div className="space-y-2 p-4">
            {topSources.length === 0 ? <EmptyState /> : topSources.map(([source, count]) => (
              <div key={source} className="flex items-center justify-between gap-3 border-2 border-black bg-[#FFFAEB] px-3 py-2">
                <p className="min-w-0 truncate text-sm font-bold text-black">{source}</p>
                <span className="shrink-0 font-black text-black">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
          <div className="border-b-4 border-black bg-[#FFB5E8] px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-black">Eventos principales</h2>
          </div>
          <div className="space-y-2 p-4">
            {topEvents.length === 0 ? <EmptyState /> : topEvents.map(([event, count]) => (
              <div key={event} className="flex items-center justify-between gap-3 border-2 border-black bg-[#FFFAEB] px-3 py-2">
                <p className="min-w-0 truncate text-sm font-bold capitalize text-black">{eventLabel(event)}</p>
                <span className="shrink-0 font-black text-black">{count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
        <div className="flex items-center justify-between border-b-4 border-black bg-black px-5 py-4 text-white">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">Eventos recientes</h2>
            <p className="mt-1 text-xs font-bold text-white/60">Muestra actividad anónima; no se almacenan formularios ni datos de clientes.</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-[#BFFCC6]" />
        </div>
        {recentEvents.length === 0 ? (
          <div className="p-5"><EmptyState /></div>
        ) : (
          <div className="divide-y-2 divide-black">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <div className="min-w-0">
                  <p className="font-black capitalize text-black">{eventLabel(event.event)}</p>
                  <p className="truncate text-xs font-bold text-black/50">{event.path || "sin página"} · {event.utmSource || event.referrerDomain || "Directo"}</p>
                </div>
                <p className="shrink-0 text-xs font-bold text-black/55">{format(event.occurredAt, "d MMM · HH:mm", { locale: es })}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return <p className="border-2 border-dashed border-black/30 bg-[#FFFAEB] p-4 text-center text-sm font-bold text-black/50">Aún no hay eventos en este período.</p>;
}
