"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PuriMascot } from "@/components/brand/puri-mascot";
import { PuriMessageText } from "@/components/dashboard/puri-message-text";
import type { GrowthStrategy } from "@/server/puri/growth/contracts";
import { ContactFlowLab, type ContactFlowSnapshot } from "./contact-flow-lab";
import { CommercialUsagePanel } from "../commercial-usage-panel";
import { commercialUsageMessage } from "@/core/commercial-usage";
type Signal = {
  id: string;
  kind: string;
  priority: number;
  confidence: string;
  createdAt: string;
  expiresAt: string;
  evidence: Record<string, unknown>;
};
type Recommendation = {
  id: string;
  title: string;
  explanation: string;
  status: string;
  version: number;
  contentHash: string;
  strategy: GrowthStrategy | null;
  expiresAt: string;
  evidence: Record<string, unknown>;
};
export type GrowthLabData = {
  contactFlowEnabled?: boolean;
  contactFlowSnapshot?: ContactFlowSnapshot;
  contactFlowOwner?: boolean;
  signals: Signal[];
  recommendations: Recommendation[];
  budgets?: {
    category: string;
    limitUnits: number;
    spentUnits: number;
    reservedUnits: number;
    spentMicros: number;
    reservedMicros: number;
    unknownCost: boolean;
    alertLevel: number;
  }[];
  usage?: {
    inputTokens: number | null;
    outputTokens: number | null;
    cachedTokens: number | null;
    unknownCalls: number;
    analyses: number;
    cacheHits: number;
  } | null;
  locations: { slug: string; name: string }[];
  selectedLocationSlug?: string;
  capabilities: { canPrepare: boolean };
  scope: { location: string; timezone: string };
};
const titles: Record<string, string> = {
  INACTIVE_CLIENTS: "Clientes que podrían volver",
  LOW_OCCUPANCY: "Capacidad disponible",
  DEMAND_DECLINE: "Menos reservas",
  SERVICE_TREND: "Cambios en servicios",
};
const statuses: Record<string, string> = {
  DRAFT: "Borrador",
  PROPOSED: "Preparada",
  REVIEWED: "Revisada",
  APPROVED: "Aprobada · sin ejecución",
  REJECTED: "Rechazada",
  EXPIRED: "Expirada",
  STALE: "Evidencia cambió",
};
const budgetLabels: Record<string, string> = {
  ALL: "Total del negocio",
  ANALYSIS_SQL: "Análisis con SQL",
  PROACTIVE_SQL: "Detección periódica",
  PLUS_INTERACTIVE: "Conversaciones Puri+",
  RECOMMENDATION: "Explicaciones",
  STANDARD_INTERACTIVE: "Puri estándar (preparado)",
};
const button =
  "rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[2px_2px_0_#171717] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-700 disabled:opacity-50";
function Evidence({ value }: { value: Record<string, unknown> }) {
  const period = value.period as
    | { start?: string; end?: string; days?: number; timezone?: string }
    | undefined;
  const counts = value.counts as
    | { current: number; previous: number; cancelled: number }
    | undefined;
  const cohort = value.cohort as
    | { inactive: number; thresholdDays: number; basis: string }
    | undefined;
  const occupancy = value.occupancy as
    | {
        percent: number | null;
        availableMinutes: number;
        occupiedMinutes: number;
        warnings: string[];
        hours?: {
          localHour: number;
          availableMinutes: number;
          occupiedMinutes: number;
        }[];
      }
    | undefined;
  const services = value.services as
    | {
        service: string;
        current: number;
        previous: number;
        collected?: number | null;
        nominal?: number;
        estimatedNominalAppointments?: number;
      }[]
    | undefined;
  return (
    <div className="space-y-2 text-sm text-neutral-700">
      {typeof value.priority === "number" && (
        <p>
          Prioridad {value.priority}/100 · confianza{" "}
          {
            (
              { LOW: "baja", MEDIUM: "media", HIGH: "alta" } as Record<
                string,
                string
              >
            )[String(value.confidence)]
          }
        </p>
      )}
      {period && (
        <p>
          {period.days} días completos · {period.start?.slice(0, 10)} a{" "}
          {period.end?.slice(0, 10)} (fin excluido) · {period.timezone}
        </p>
      )}
      {counts && (
        <p>
          Reservas: {counts.current} · anteriores: {counts.previous} ·
          canceladas: {counts.cancelled}
        </p>
      )}
      {cohort && (
        <p>
          {cohort.inactive} clientes sin próxima reserva. Umbral mínimo:{" "}
          {cohort.thresholdDays} días.{" "}
          {cohort.basis === "CONFIGURED_FALLBACK"
            ? "Historial insuficiente: umbral configurado."
            : "Cadencia histórica; el umbral puede variar por cliente."}{" "}
          Consentimiento por verificar.
        </p>
      )}
      {occupancy && (
        <p>
          Ocupación:{" "}
          {occupancy.percent === null ? "desconocida" : `${occupancy.percent}%`}{" "}
          · {occupancy.occupiedMinutes} de {occupancy.availableMinutes} minutos.
          Horarios actuales con excepciones almacenadas; el historial de
          horarios no está versionado.
        </p>
      )}
      {occupancy?.hours && (
        <details>
          <summary className="cursor-pointer font-bold">
            Ver franjas horarias
          </summary>
          <ul className="mt-2 space-y-1">
            {occupancy.hours.map((h) => (
              <li key={h.localHour}>
                {String(h.localHour).padStart(2, "0")}:00 · {h.occupiedMinutes}{" "}
                de {h.availableMinutes} minutos ocupados en el período.
              </li>
            ))}
          </ul>
        </details>
      )}
      {services && (
        <details>
          <summary className="cursor-pointer font-bold">Ver servicios</summary>
          <ul className="mt-2 space-y-2">
            {services.map((s) => (
              <li key={s.service}>
                {s.service}: {s.current} reservas frente a {s.previous}{" "}
                anteriores.
                {s.collected !== undefined && (
                  <>
                    {" "}
                    Cobro registrado:{" "}
                    {s.collected === null
                      ? "desconocido"
                      : `${s.collected.toLocaleString("es-CL")} ${String(value.currency ?? "")}`}
                    . Valor nominal{" "}
                    {s.estimatedNominalAppointments ? "estimado" : "reservado"}:{" "}
                    {s.nominal?.toLocaleString("es-CL")}{" "}
                    {String(value.currency ?? "")}; no equivale a ingreso.
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
export function GrowthLab({ initialData, dashboard = false }: { initialData: GrowthLabData; dashboard?: boolean }) {
  const Container = dashboard ? "section" : "main";
  const router = useRouter();
  const [data, setData] = useState<GrowthLabData>(initialData),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [reply, setReply] = useState(""),
    [checked, setChecked] = useState<string | null>(null),
    [viewed, setViewed] = useState<string | null>(null);
  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(dashboard ? "/api/dashboard/puri-plus" : "/api/internal/puri-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          locationSlug: data.selectedLocationSlug,
          ...extra,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.code ?? "UNAVAILABLE");
      window.dispatchEvent(new Event("commercial:usage-changed"));
      setData({
        contactFlowEnabled: initialData.contactFlowEnabled,
        contactFlowSnapshot: initialData.contactFlowSnapshot,
        contactFlowOwner: initialData.contactFlowOwner,
        ...body,
        locations: data.locations,
        selectedLocationSlug: data.selectedLocationSlug,
      });
      if (body.result?.answer)
        setReply(
          body.result.answer.message +
            (body.result.fallback
              ? "\nResumen preparado con datos verificados del negocio."
              : ""),
        );
    } catch (e) {
      setError(e instanceof Error ? commercialUsageMessage(e.message) ?? e.message : "No pudimos completar la consulta. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  const date = (s: string) =>
    new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeZone: data?.scope.timezone ?? "America/Santiago",
    }).format(new Date(s));
  return (
    <Container className="mx-auto min-h-screen max-w-6xl space-y-8 bg-[#FFFCF5] p-4 text-[#171717] sm:p-8">
      <header className="flex items-center gap-4 border-b-2 border-black pb-6">
        <PuriMascot
          variant={busy ? "thinking" : "greeting"}
          className="h-24 w-24 shrink-0"
        />
        <div>
          <p className="text-xs font-black uppercase tracking-widest">
            {dashboard ? "Puri+ · Inteligencia comercial" : "Puragenda+ · prueba interna"}
          </p>
          <h1 className="text-3xl font-black">
            Tu agenda se organiza.
            <br />
            Tu negocio crece.
          </h1>
          <p className="mt-2 text-sm">
            Puri observa datos, explica oportunidades y prepara propuestas para
            tu revisión.
          </p>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          {data?.scope.location ?? "Cargando alcance…"} · {data?.scope.timezone}
        </p>
        <button
          className={button + " bg-[#FFD84D]"}
          disabled={busy}
          onClick={() => void act("ANALYZE")}
        >
          Analizar oportunidades
        </button>
      </div>
      {data.locations.length > 1 && (
        <label className="flex items-center gap-3 text-sm font-bold">
          Sucursal
          <select
            className="max-w-full rounded-lg border-2 border-black bg-white p-2"
            value={data.selectedLocationSlug}
            disabled={busy}
            onChange={(e) =>
              router.push(
                `${dashboard ? "/dashboard/puri-plus" : "/internal/puri-plus"}?location=${encodeURIComponent(e.target.value)}`,
              )
            }
          >
            {data.locations.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <p role="status" aria-live="polite" className="text-sm">
        {busy
          ? "Puri está verificando los datos…"
          : "Las propuestas de esta prueba no envían mensajes ni activan automatizaciones."}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-xl border-2 border-black bg-[#FFF5BA] p-4"
        >
          No se completó la operación: {error}. Revisa permisos, vigencia o
          presupuesto.
        </p>
      )}
      <section aria-labelledby="opportunities">
        <h2 id="opportunities" className="mb-4 text-xl font-black">
          Oportunidades con evidencia
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data?.signals.length === 0 && (
            <p className="text-sm">
              Aún no hay oportunidades vigentes. Ejecuta un análisis; una
              muestra insuficiente puede no producir señales.
            </p>
          )}
          {data?.signals.map((s) => (
            <article
              key={s.id}
              className="space-y-4 rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_#171717]"
            >
              <p className="text-xs font-bold">
                Prioridad {s.priority}/100 · confianza{" "}
                {
                  (
                    { LOW: "baja", MEDIUM: "media", HIGH: "alta" } as Record<
                      string,
                      string
                    >
                  )[s.confidence]
                }{" "}
                · {date(s.createdAt)}
              </p>
              <h3 className="text-lg font-bold">{titles[s.kind]}</h3>
              <Evidence value={s.evidence} />
              <button
                disabled={busy}
                className={button}
                onClick={() => void act("DRAFT", { id: s.id })}
              >
                Ver recomendación
              </button>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="proposals">
        <h2 id="proposals" className="mb-4 text-xl font-black">
          Recomendaciones y estrategias
        </h2>
        <div className="space-y-4">
          {data?.recommendations.map((r) => (
            <article
              key={r.id}
              className="space-y-4 rounded-2xl border-2 border-black bg-[#F0E7FF] p-5"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-black">{r.title}</h3>
                <span className="text-sm font-bold">
                  {statuses[r.status] ?? r.status}
                </span>
              </div>
              <PuriMessageText content={r.explanation} />
              <p className="text-xs">
                Versión {r.version} · vence {date(r.expiresAt)}
              </p>
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  setViewed(r.id);
                  void act("VIEW", {
                    id: r.id,
                    hash: r.contentHash,
                    version: r.version,
                  });
                }}
              >
                Ver evidencia y propuesta
              </button>
              {viewed === r.id && (
                <div className="space-y-4">
                  <Evidence value={r.evidence} />
                  {r.strategy && (
                    <div className="rounded-xl border border-black bg-white p-4 text-sm">
                      <p className="font-bold">Propuesta para revisar</p>
                      <p>
                        {r.strategy.durationDays} días · máximo sugerido{" "}
                        {r.strategy.dailyLimit} contactos/día y{" "}
                        {r.strategy.monthlyLimit}/mes. Estos límites requieren
                        aprobación comercial antes de activar Contact Flow.
                      </p>
                      <p className="mt-2">
                        Audiencia preliminar: {r.strategy.estimatedAudience}. Se
                        recalculará por reglas, excluyendo próximas reservas,
                        supresiones, contactos recientes, suscripción vencida y
                        personas sin consentimiento verificable.
                      </p>
                      <p className="mt-2">
                        Plantilla pendiente de revisión. Sin estimación de
                        ingresos garantizados. No ejecutable.
                      </p>
                      <ul className="mt-2 list-inside list-disc">
                        {r.strategy.risks.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.capabilities.canPrepare && (
                    <div className="flex flex-wrap items-center gap-3">
                      {r.status === "DRAFT" && (
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() =>
                            void act("PREPARE", {
                              id: r.id,
                              hash: r.contentHash,
                              version: r.version,
                            })
                          }
                        >
                          Preparar estrategia
                        </button>
                      )}
                      {r.status === "PROPOSED" && (
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() =>
                            void act("REVIEW", {
                              id: r.id,
                              hash: r.contentHash,
                              version: r.version,
                            })
                          }
                        >
                          Revisar evidencia actual
                        </button>
                      )}
                      {r.status === "REVIEWED" && (
                        <>
                          <label className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4"
                              checked={checked === r.contentHash}
                              onChange={(e) =>
                                setChecked(
                                  e.target.checked ? r.contentHash : null,
                                )
                              }
                            />
                            He revisado esta versión. Apruebo la propuesta sin
                            activar campañas.
                          </label>
                          <button
                            className={button + " bg-[#FFD84D]"}
                            disabled={busy || checked !== r.contentHash}
                            onClick={() =>
                              void act("APPROVE", {
                                id: r.id,
                                hash: r.contentHash,
                                version: r.version,
                                explicit: true,
                              })
                            }
                          >
                            Aprobar propuesta
                          </button>
                        </>
                      )}
                      {["DRAFT", "PROPOSED", "REVIEWED"].includes(r.status) && (
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() =>
                            void act("REJECT", {
                              id: r.id,
                              hash: r.contentHash,
                              version: r.version,
                            })
                          }
                        >
                          Rechazar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <section
        className="rounded-2xl border-2 border-black bg-white p-5"
        aria-labelledby="ask-puri"
      >
        <div className="mb-4 flex items-center gap-3">
          <PuriMascot compact className="h-12 w-12" />
          <h2 id="ask-puri" className="text-xl font-black">
            Pregúntale a Puri
          </h2>
        </div>
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act("CHAT", { message });
          }}
        >
          <label htmlFor="growth-message" className="sr-only">
            Pregunta sobre las oportunidades
          </label>
          <input
            id="growth-message"
            className="min-w-0 flex-1 rounded-xl border-2 border-black p-3"
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Explícame la oportunidad principal"
          />
          <button className={button} disabled={busy || !message.trim()}>
            Consultar
          </button>
        </form>
        {reply && (
          <div aria-live="polite" className="mt-4 text-sm">
            <PuriMessageText content={reply} />
          </div>
        )}
      </section>
      {data.contactFlowEnabled && (
        <ContactFlowLab
          initialSnapshot={data.contactFlowSnapshot}
          dashboard={dashboard}
          recommendations={data.recommendations}
          locationSlug={data.selectedLocationSlug}
          owner={data.contactFlowOwner === true}
        />
      )}
      {dashboard ? <CommercialUsagePanel refreshKey={data.recommendations.length + data.signals.length} /> : <section aria-labelledby="usage">
        <h2 id="usage" className="mb-3 text-xl font-black">
          Uso y límites del mes
        </h2>
        {data.usage && (
          <p className="mb-4 text-sm">
            {data.usage.analyses} análisis guardados · {data.usage.cacheHits}{" "}
            consultas que reutilizaron el análisis. Tokens de entrada:{" "}
            {data.usage.inputTokens ?? "sin uso informado"}; salida:{" "}
            {data.usage.outputTokens ?? "sin uso informado"}; caché:{" "}
            {data.usage.cachedTokens ?? "sin uso informado"}. Llamadas con costo
            desconocido: {data.usage.unknownCalls}.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {(data.budgets ?? []).map((b) => (
            <div
              key={b.category}
              className="rounded-xl border border-black bg-white p-4 text-sm"
            >
              <p className="font-bold">
                {budgetLabels[b.category] ?? b.category}
              </p>
              <p>
                {b.spentUnits + b.reservedUnits} de {b.limitUnits} unidades
                comprometidas · alerta {b.alertLevel}%
              </p>
              <p>
                {b.spentMicros + b.reservedMicros > 0
                  ? `IA comprometida: US$${((b.spentMicros + b.reservedMicros) / 1e6).toFixed(4)}`
                  : "Sin reservas de gasto de IA"}
                {b.unknownCost
                  ? " · costo real desconocido, requiere conciliación"
                  : ""}
              </p>
            </div>
          ))}
          {!data.budgets?.length && (
            <p className="text-sm">
              El detalle de uso requiere autorización financiera del negocio. Si
              está autorizado y no aparece presupuesto, el procesamiento
              permanece bloqueado hasta configurarlo.
            </p>
          )}
        </div>
      </section>}
    </Container>
  );
}
