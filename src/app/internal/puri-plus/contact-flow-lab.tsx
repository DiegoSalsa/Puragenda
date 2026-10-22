"use client";
import { useCallback, useState } from "react";
type Recommendation = {
  id: string;
  title: string;
  status: string;
  contentHash: string;
  version: number;
  expiresAt: string;
};
type Campaign = {
  id: string;
  status: string;
  recommendationId: string;
  eligible: number;
  excluded: number;
  exclusions: Record<string, number>;
  states: Record<string, number>;
  errors: Record<string, number>;
  version: {
    id: string;
    version: number;
    contentHash: string;
    objective: string;
    subject: string;
    senderEmail: string;
    body: string;
    serviceName: string;
    servicePrice: number;
    maxContacts: number;
    dailyLimit: number;
    startsAt: string;
    expiresAt: string;
    authorizations: { createdAt: string; contentHash: string }[];
  };
};
export type ContactFlowSnapshot = {
  campaigns: Campaign[];
  policy: {
    killed: boolean;
    emailEnabled: boolean;
    dailyLimit: number;
    monthlyLimit: number;
    contactDays: number;
  } | null;
  global: { killed: boolean; emailEnabled: boolean } | null;
  quotas: {
    kind: string;
    period: string;
    limit: number;
    reserved: number;
    consumed: number;
  }[];
  services: { id: string; name: string; price: number }[];
};
const button =
  "rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[2px_2px_0_#171717] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-700 disabled:opacity-50";
const input = "w-full min-w-0 rounded-xl border-2 border-black bg-white p-2";
const state: Record<string, string> = {
  DRAFT: "Pendiente de autorización",
  READY: "Lista para simulación",
  RUNNING: "Simulación en curso",
  PAUSED: "Pausada",
  CANCELLED: "Cancelada",
  COMPLETED: "Ejecución terminada",
};
const reasons: Record<string, string> = {
  NO_VERIFIED_CONSENT: "Sin consentimiento verificable",
  SUPPRESSED: "Baja o supresión",
  RECENT_CONTACT: "Contacto reciente",
  CAMPAIGN_LIMIT: "Límite de campaña",
  INVALID_ADDRESS: "Dirección no sintética o inválida",
};
const deliveries: Record<string, string> = {
  QUEUED: "En cola",
  ACCEPTED: "Aceptados por simulador",
  DELIVERED: "Entregas simuladas confirmadas",
  BOUNCED: "Rebotes simulados",
  COMPLAINED: "Denuncias simuladas",
  FAILED: "Fallidos",
  EXCLUDED: "Excluidos antes del intento",
  UNKNOWN: "Resultado desconocido",
  EXPIRED: "Vencidos",
};
function localDate(date: Date) {
  return new Date(+date - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function ContactFlowLab({
  recommendations,
  locationSlug,
  owner,
  initialSnapshot,
}: {
  recommendations: Recommendation[];
  locationSlug?: string;
  owner: boolean;
  initialSnapshot?: ContactFlowSnapshot;
}) {
  const [data, setData] = useState<ContactFlowSnapshot | null>(
      initialSnapshot ?? null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [checked, setChecked] = useState<string | null>(null),
    [results, setResults] = useState<Record<string, unknown> | null>(null),
    [notice, setNotice] = useState("");
  const [recId, setRecId] = useState(""),
    [serviceId, setServiceId] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [maximum, setMaximum] = useState(5),
    [daily, setDaily] = useState(5);
  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setBusy(true);
      setError("");
      setNotice("");
      try {
        const response = await fetch("/api/internal/contact-flow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, locationSlug, ...extra }),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.code ?? "CONTACT_FLOW_UNAVAILABLE");
        setData(body);
        if (action === "RESULTS") setResults(body.result);
        if (action !== "LOAD")
          setNotice(
            "Operación registrada en el laboratorio. Los mensajes son simulados.",
          );
        setChecked(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "CONTACT_FLOW_UNAVAILABLE");
      } finally {
        setBusy(false);
      }
    },
    [locationSlug],
  );
  const approved = recommendations.filter((r) => r.status === "APPROVED"),
    selected = approved.find((r) => r.id === (recId || approved[0]?.id));
  const effectiveEnd =
    end || (selected ? localDate(new Date(selected.expiresAt)) : "");
  const draft = data?.campaigns.find(
    (c) => c.recommendationId === selected?.id && c.status === "DRAFT",
  );
  const confirmAction = (
    action: string,
    extra: Record<string, unknown> = {},
  ) => {
    if (
      window.confirm(
        action === "RUN"
          ? "¿Ejecutar hasta cinco trabajos con el proveedor simulado? No se enviarán correos reales."
          : "¿Confirmar esta acción de Contact Flow?",
      )
    )
      void act(action, { ...extra, explicit: true });
  };
  return (
    <section
      aria-labelledby="contact-flow-title"
      className="space-y-5 rounded-3xl border-2 border-black bg-[#F2E9FF] p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="contact-flow-title" className="text-2xl font-black">
          Contact Flow
        </h2>
        <button
          className={button}
          disabled={busy}
          onClick={() => void act("LOAD")}
        >
          Actualizar campañas
        </button>
      </div>
      <p className="text-sm font-bold">
        Laboratorio sintético · ejecución externa bloqueada por servidor
      </p>
      <p className="text-sm">
        Aprobar una propuesta de Puri+ y autorizar su campaña son decisiones
        distintas. Cada intento comprueba consentimiento, bajas y límites.
      </p>
      <p role="status" aria-live="polite" className="text-sm">
        {busy ? "Verificando Contact Flow…" : notice}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-xl border-2 border-black bg-[#FFF5BA] p-3"
        >
          No se completó la operación: {error}. Actualiza y revisa permisos,
          evidencia, fechas o límites.
        </p>
      )}
      {!data && !busy && <p>No hay información de Contact Flow disponible.</p>}
      {data && (
        <>
          <div className="rounded-xl border border-black bg-white p-3 text-sm">
            <p>
              Kill switch global:{" "}
              {data.global?.killed !== false ? "activo" : "inactivo"} · negocio:{" "}
              {data.policy?.killed !== false ? "activo" : "inactivo"}
            </p>
            <p>
              Cuotas de prueba: {data.policy?.dailyLimit ?? "sin configurar"} al
              día · {data.policy?.monthlyLimit ?? "sin configurar"} al mes ·
              frecuencia mínima {data.policy?.contactDays ?? "sin configurar"}{" "}
              días. Correo:{" "}
              {data.policy?.emailEnabled
                ? "habilitado para simulación"
                : "bloqueado"}
              .
            </p>
            {owner && data.policy && (
              <button
                className={button + " mt-3"}
                disabled={busy}
                onClick={() =>
                  confirmAction("KILL", { killed: !data.policy?.killed })
                }
              >
                {data.policy.killed
                  ? "Desbloquear simulación del negocio"
                  : "Bloquear simulación del negocio"}
              </button>
            )}
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selected) return;
              void act(draft ? "REVISE" : "PREPARE", {
                id: draft?.id,
                campaign: {
                  recommendationId: selected.id,
                  recommendationHash: selected.contentHash,
                  recommendationVersion: selected.version,
                  serviceId: serviceId || data.services[0]?.id,
                  startsAt: start
                    ? new Date(start).toISOString()
                    : new Date().toISOString(),
                  expiresAt: new Date(effectiveEnd).toISOString(),
                  maxContacts: maximum,
                  dailyLimit: daily,
                },
              });
            }}
          >
            <h3 className="text-lg font-black">
              Preparar desde una propuesta aprobada
            </h3>
            {!approved.length ? (
              <p className="text-sm">
                Primero revisa y aprueba una propuesta en las oportunidades de
                Puri+.
              </p>
            ) : (
              <>
                <label className="block text-sm font-bold">
                  Propuesta
                  <select
                    aria-label="Propuesta aprobada"
                    className={input}
                    value={recId || approved[0]?.id}
                    onChange={(e) => setRecId(e.target.value)}
                  >
                    {approved.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} · v{r.version}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-bold">
                  Servicio real
                  <select
                    aria-label="Servicio de campaña"
                    className={input}
                    value={serviceId || data.services[0]?.id}
                    onChange={(e) => setServiceId(e.target.value)}
                  >
                    {data.services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.price}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    Inicio opcional (hora del dispositivo)
                    <input
                      className={input}
                      type="datetime-local"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    Vencimiento (hora del dispositivo)
                    <input
                      className={input}
                      required
                      type="datetime-local"
                      value={effectiveEnd}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    Máximo de contactos
                    <input
                      aria-label="Máximo de contactos"
                      className={input}
                      type="number"
                      min={1}
                      max={50}
                      value={maximum}
                      onChange={(e) => setMaximum(Number(e.target.value))}
                    />
                  </label>
                  <label className="block text-sm">
                    Máximo diario
                    <input
                      aria-label="Máximo diario"
                      className={input}
                      type="number"
                      min={1}
                      max={5}
                      value={daily}
                      onChange={(e) => setDaily(Number(e.target.value))}
                    />
                  </label>
                </div>
                <p className="text-xs">
                  Canal: correo · finalidad: comercial · cohorte determinada en
                  servidor desde la regla aprobada. Sin descuentos ni horarios
                  garantizados.
                </p>
                <button
                  className={button + " bg-[#FFD84D]"}
                  disabled={busy || !data.services.length}
                >
                  {draft ? "Guardar nueva versión" : "Preparar campaña"}
                </button>
              </>
            )}
          </form>
          {!data.campaigns.length && (
            <p className="text-sm">
              Aún no hay campañas preparadas en esta sucursal.
            </p>
          )}
          {data.campaigns.map((c) => (
            <article
              key={c.id}
              className="space-y-3 rounded-2xl border-2 border-black bg-white p-4"
            >
              <h3 className="font-black">
                {c.version.subject} · versión {c.version.version}
              </h3>
              <p className="text-sm font-bold">{state[c.status] ?? c.status}</p>
              <p className="text-sm">
                {c.eligible} destinatarios elegibles · {c.excluded} excluidos.
                Máximo {c.version.maxContacts} contactos y{" "}
                {c.version.dailyLimit} al día.
              </p>
              <p className="text-sm">
                Ventana: {new Date(c.version.startsAt).toLocaleString("es-CL")}{" "}
                a {new Date(c.version.expiresAt).toLocaleString("es-CL")}.
              </p>
              {!!Object.keys(c.exclusions).length && (
                <ul className="list-inside list-disc text-sm">
                  {Object.entries(c.exclusions).map(([r, n]) => (
                    <li key={r}>
                      {reasons[r] ?? r}: {n}
                    </li>
                  ))}
                </ul>
              )}
              <details>
                <summary className="cursor-pointer font-bold">
                  Vista previa del correo
                </summary>
                <div className="mt-3 whitespace-pre-wrap rounded-xl border bg-neutral-50 p-4 text-sm">
                  <p className="font-bold">Asunto: {c.version.subject}</p>
                  <p>De: {c.version.senderEmail}</p>
                  <p className="mt-3">{c.version.body}</p>
                  <p className="mt-3 underline">
                    Consultar horarios y reservar (enlace firmado por
                    destinatario)
                  </p>
                  <p className="mt-3 underline">
                    Darme de baja comercial (sin iniciar sesión)
                  </p>
                  <p className="mt-2 text-xs">
                    La baja no desactiva los recordatorios de reservas. Esta
                    vista previa no modifica preferencias.
                  </p>
                </div>
              </details>
              <details>
                <summary className="cursor-pointer text-sm">
                  Versión y evidencia de autorización
                </summary>
                <p className="mt-2 break-all text-xs">
                  Hash: {c.version.contentHash}
                </p>
                <p className="text-sm">
                  {c.version.authorizations.length
                    ? "Autorización expresa registrada para esta versión."
                    : "Esta versión aún no tiene autorización de ejecución."}
                </p>
              </details>
              {owner && c.status === "DRAFT" && (
                <div className="space-y-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      aria-label="Autorizo ejecución simulada"
                      type="checkbox"
                      className="mt-1"
                      checked={checked === c.version.contentHash}
                      onChange={(e) =>
                        setChecked(
                          e.target.checked ? c.version.contentHash : null,
                        )
                      }
                    />
                    Revisé el correo, las exclusiones y los límites. Autorizo
                    expresamente esta versión para ejecución simulada.
                  </label>
                  <button
                    className={button + " bg-[#FFD84D]"}
                    disabled={
                      busy || checked !== c.version.contentHash || !c.eligible
                    }
                    onClick={() =>
                      void act("AUTHORIZE", {
                        id: c.id,
                        hash: c.version.contentHash,
                        version: c.version.version,
                        explicit: true,
                      })
                    }
                  >
                    Autorizar ejecución simulada
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {owner && ["READY", "RUNNING"].includes(c.status) && (
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => confirmAction("PAUSE", { id: c.id })}
                  >
                    Pausar campaña
                  </button>
                )}
                {owner && c.status === "PAUSED" && (
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => confirmAction("RESUME", { id: c.id })}
                  >
                    Reanudar campaña
                  </button>
                )}
                {owner && !["CANCELLED", "COMPLETED"].includes(c.status) && (
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => confirmAction("CANCEL", { id: c.id })}
                  >
                    Cancelar campaña
                  </button>
                )}
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void act("RESULTS", { id: c.id })}
                >
                  Ver resultados verificables
                </button>
              </div>
              <ul className="list-inside list-disc text-sm">
                {Object.entries(c.states).map(([s, n]) => (
                  <li key={s}>
                    {deliveries[s] ?? s}: {n}
                  </li>
                ))}
              </ul>
              {!!Object.keys(c.errors).length && (
                <p className="break-words text-sm">
                  Observaciones:{" "}
                  {Object.entries(c.errors)
                    .map(([code, n]) => `${code} (${n})`)
                    .join(", ")}
                </p>
              )}
            </article>
          ))}
          {owner && (
            <div className="flex flex-wrap gap-3">
              <button
                className={button}
                disabled={busy}
                onClick={() => confirmAction("RUN")}
              >
                Ejecutar laboratorio
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => confirmAction("RECONCILE")}
              >
                Reconciliar entregas simuladas
              </button>
            </div>
          )}
          {results && (
            <div
              aria-live="polite"
              className="rounded-xl border border-black bg-white p-4 text-sm"
            >
              <p className="font-bold">Atribución técnica verificable</p>
              <p>
                Reservas asociadas: {String(results.reservations)} ·
                completadas: {String(results.completed)} · canceladas:{" "}
                {String(results.cancelled)} · con devolución:{" "}
                {String(results.refunded)}.
              </p>
              <p>
                Ingresos registrados:{" "}
                {results.recordedRevenue === null
                  ? "importe total desconocido"
                  : String(
                      results.recordedRevenue ?? "sin permiso financiero",
                    )}{" "}
                · parte conocida:{" "}
                {String(results.knownRevenue ?? "sin permiso")} · importes
                desconocidos: {String(results.unknownAmounts ?? "sin permiso")}.
              </p>
              <p>{String(results.note)}</p>
              <p>
                Incrementalidad no determinada. Los resultados de entrega
                corresponden a simulaciones.
              </p>
            </div>
          )}
          {data.quotas.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-bold">
                Consumo y reservas de cuota
              </summary>
              <ul className="mt-2 list-inside list-disc text-sm">
                {data.quotas.map((q, i) => (
                  <li key={i}>
                    {q.kind} ({q.period}): {q.consumed} consumidos +{" "}
                    {q.reserved} reservados / {q.limit}.
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
