import Link from "next/link";
import { redirect } from "next/navigation";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { getCurrentAdminSessionUser } from "@/server/auth/admin-session";
import { createAuditLog } from "@/server/lib/audit";
import { puriToolNames } from "@/server/puri/tools";
import { PURI_ANALYTICS_TIMEZONE, PURI_HABITUAL_DAYS, PURI_HABITUAL_WINDOW_DAYS } from "@/server/puri/telemetry";
import {
  getPuriBusinessUsers, getPuriBusinesses, getPuriCosts, getPuriErrors, getPuriFeedback,
  getPuriFeedbackRows, getPuriFeedbackEvolution, getPuriResponseMetadata, getPuriSecurityEvents, getPuriRequestErrors, getPuriFilterOptions, getPuriFunnel, getPuriHabitual,
  getPuriHabitualEvolution, getPuriIntents, getPuriLatency, getPuriOverview,
  getPuriRetention, getPuriTools, getPuriTrend, parsePuriFilters,
  type PuriAnalyticsFilters, type PuriOverview, type PuriTrendPoint,
} from "@/server/puri/analytics";

export const dynamic = "force-dynamic";

const TABS = [
  ["resumen", "Resumen"], ["uso", "Uso"], ["negocios", "Negocios"],
  ["consultas", "Consultas"], ["tools", "Tools"], ["calidad", "Calidad"], ["costos", "Costos"],
] as const;
const box = "rounded-xl border border-black/15 bg-white p-4";
const th = "whitespace-nowrap border-b border-black/15 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-black/55";
const td = "whitespace-nowrap border-b border-black/10 px-3 py-2.5 text-sm";
const n = (value: number | null | undefined) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(value ?? 0);
const pct = (part: number, total: number) => total ? `${Math.round(part / total * 100)}%` : "—";
const ms = (value: number | null | undefined) => value == null ? "—" : `${n(value)} ms`;
const usd = (value: number | null | undefined) => value == null ? "Sin tarifa" : `US$ ${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 4 }).format(value)}`;
const dateTime = (value: Date | null | undefined) => value ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: PURI_ANALYTICS_TIMEZONE }).format(value) : "—";

function href(f: PuriAnalyticsFilters, change: Record<string, string | undefined>) {
  const q = new URLSearchParams({ tab: f.tab, range: f.range, metric: f.metric });
  if (f.range === "custom") { q.set("from", f.fromKey); q.set("to", f.toKey); }
  for (const key of ["business", "plan", "role", "location", "tool", "intent"] as const) if (f[key]) q.set(key, f[key]);
  if (f.search) q.set("search", f.search);
  if (f.sort !== "messages") q.set("sort", f.sort);
  for (const [key, value] of Object.entries(change)) { if (value) q.set(key, value); else q.delete(key); }
  return `${ADMIN_SECRET_PATH}/puri?${q}`;
}

function Kpi({ label, value, detail, tone = "normal" }: { label: string; value: string | number; detail?: string; tone?: "normal" | "error" | "success" | "warning" }) {
  const colors = { normal: "text-[#5B21B6]", error: "text-[#B42318]", success: "text-[#067647]", warning: "text-[#A15C00]" };
  return <div className={box}><p className="text-xs font-semibold text-black/60">{label}</p><p className={`mt-1 text-2xl font-bold tabular-nums ${colors[tone]}`}>{value}</p>{detail && <p className="mt-1 text-xs text-black/50">{detail}</p>}</div>;
}

function Empty() { return <div className="rounded-xl border border-dashed border-black/20 bg-white p-8 text-center text-sm text-black/60">Aún no hay suficiente actividad en este período.</div>; }

function isMissingPuriTelemetryTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const issue = error as { code?: unknown; meta?: { code?: unknown; message?: unknown; table?: unknown }; message?: unknown };
  const missingRelation = issue.code === "P2021" || issue.code === "42P01"
    || (issue.code === "P2010" && issue.meta?.code === "42P01");
  const detail = [issue.meta?.table, issue.meta?.message, issue.message].filter((value): value is string => typeof value === "string").join(" ");
  return missingRelation && /\bPuri(Request|ToolCall|Feedback|UiEvent)\b/.test(detail);
}

function Trend({ points, f }: { points: PuriTrendPoint[]; f: PuriAnalyticsFilters }) {
  const metric = f.metric;
  const max = Math.max(1, ...points.map((point) => point[metric]));
  const choices = [["users", "Usuarios"], ["messages", "Mensajes"], ["sessions", "Conversaciones"], ["tools", "Tools"]] as const;
  return <section className={box}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Uso en el tiempo</h2><p className="text-xs text-black/50">Hora para hoy, día hasta 45 días, semana para períodos largos · {PURI_ANALYTICS_TIMEZONE}</p></div><div className="flex flex-wrap gap-1">{choices.map(([key, label]) => <Link key={key} href={href(f, { metric: key })} className={`rounded px-2 py-1 text-xs font-semibold ${metric === key ? "bg-[#5B21B6] text-white" : "bg-black/5"}`}>{label}</Link>)}</div></div>
    {points.length ? <div className="mt-5 flex min-h-44 items-end gap-1 overflow-x-auto border-b border-black/15 pb-2">{points.map((point) => <div key={point.bucket.toString()} className="flex min-w-8 flex-1 flex-col items-center justify-end gap-1" title={`${dateTime(point.bucket)} · ${n(point[metric])}`}><span className="text-[10px] tabular-nums text-black/60">{n(point[metric])}</span><div className="w-full min-w-3 rounded-t bg-[#7C3AED]" style={{ height: `${Math.max(3, point[metric] / max * 130)}px` }} /><span className="text-[10px] text-black/50">{new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", hour: f.range === "today" ? "2-digit" : undefined, timeZone: "UTC" }).format(point.bucket)}</span></div>)}</div> : <div className="mt-4"><Empty /></div>}
  </section>;
}

function Filters({ f, plans, locations }: { f: PuriAnalyticsFilters; plans: string[]; locations: Array<{ id: string; name: string }> }) {
  return <form method="get" className={`${box} flex flex-wrap items-end gap-3 text-xs`}>
    <input type="hidden" name="tab" value={f.tab} />
    <label className="grid gap-1 font-semibold">Período<select name="range" defaultValue={f.range} className="rounded border border-black/20 bg-white px-2 py-2"><option value="today">Hoy</option><option value="7d">7 días</option><option value="30d">30 días</option><option value="custom">Personalizado</option></select></label>
    <label className="grid gap-1 font-semibold">Desde<input type="date" name="from" defaultValue={f.fromKey} className="rounded border border-black/20 px-2 py-2" /></label>
    <label className="grid gap-1 font-semibold">Hasta<input type="date" name="to" defaultValue={f.toKey} className="rounded border border-black/20 px-2 py-2" /></label>
    <label className="grid gap-1 font-semibold">Plan<select name="plan" defaultValue={f.plan ?? ""} className="rounded border border-black/20 bg-white px-2 py-2"><option value="">Todos</option>{plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}</select></label>
    <label className="grid gap-1 font-semibold">Rol<select name="role" defaultValue={f.role ?? ""} className="rounded border border-black/20 bg-white px-2 py-2"><option value="">Todos</option>{["ADMIN", "RECEPTIONIST", "STAFF", "SUPERADMIN"].map((role) => <option key={role}>{role}</option>)}</select></label>
    {f.business && <><input type="hidden" name="business" value={f.business} /><label className="grid gap-1 font-semibold">Sucursal<select name="location" defaultValue={f.location ?? ""} className="rounded border border-black/20 bg-white px-2 py-2"><option value="">Todas</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label></>}
    <label className="grid gap-1 font-semibold">Tool<select name="tool" defaultValue={f.tool ?? ""} className="rounded border border-black/20 bg-white px-2 py-2"><option value="">Todas</option>{puriToolNames.map((tool) => <option key={tool}>{tool}</option>)}</select></label>
    <label className="grid gap-1 font-semibold">Categoría<input name="intent" defaultValue={f.intent ?? ""} placeholder="Todas" maxLength={50} className="w-36 rounded border border-black/20 px-2 py-2" /></label>
    <button className="rounded bg-[#5B21B6] px-4 py-2 font-bold text-white">Aplicar</button>
    <Link href={`${ADMIN_SECRET_PATH}/puri?tab=${f.tab}`} className="px-1 py-2 text-black/60 underline">Limpiar</Link>
  </form>;
}

function OverviewCards({ overview, toolCalls, habitual }: { overview: PuriOverview; toolCalls: number; habitual: number }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <Kpi label="Negocios activos en Puri" value={n(overview.businesses)} detail="Al menos una consulta válida" />
    <Kpi label="Usuarios únicos" value={n(overview.users)} />
    <Kpi label="Conversaciones" value={n(overview.sessions)} detail="Negocio + usuario + sesión" />
    <Kpi label="Mensajes" value={n(overview.messages)} detail={`${overview.sessions ? (overview.messages / overview.sessions).toFixed(1) : "0"} por conversación`} />
    <Kpi label="Tool calls" value={n(toolCalls)} />
    <Kpi label="Respuestas con error" value={n(overview.errors)} tone="error" />
    <Kpi label="Respuestas sin datos" value={n(overview.noData)} tone="warning" />
    <Kpi label="Usuarios habituales" value={n(habitual)} detail={`${PURI_HABITUAL_DAYS} días distintos en ${PURI_HABITUAL_WINDOW_DAYS} días`} />
    <Kpi label="Latencia promedio" value={ms(overview.avgDuration)} detail={`p50 ${ms(overview.p50Duration)} · p95 ${ms(overview.p95Duration)}`} />
    <Kpi label="Tokens totales" value={n(overview.promptTokens + overview.completionTokens)} />
    <Kpi label="Costo estimado" value={usd(overview.estimatedCostUsd)} detail={`${n(overview.pricedRequests)} de ${n(overview.messages)} requests con tarifa`} />
  </div>;
}

export default async function PuriPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await getCurrentAdminSessionUser();
  if (!admin) redirect(`${ADMIN_SECRET_PATH}/login`);
  const params = await searchParams;
  const f = parsePuriFilters(params);
  if (f.business) await createAuditLog("SUPERADMIN_PURI_BUSINESS_ANALYTICS_VIEWED", { businessId: f.business, tab: f.tab }, admin.id);
  let options: Awaited<ReturnType<typeof getPuriFilterOptions>>;
  let overview: PuriOverview;
  try {
    [options, overview] = await Promise.all([getPuriFilterOptions(f.business), getPuriOverview(f)]);
  } catch (error) {
    if (!isMissingPuriTelemetryTable(error)) throw error;
    return <div className="space-y-5 text-[#171717]">
      <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5B21B6]">Superadmin / Operación de producto</p><h1 className="mt-1 text-3xl font-black">Puri</h1></header>
      <nav className="flex gap-1 overflow-x-auto border-b border-black/15" aria-label="Secciones de Puri">{TABS.map(([key, label]) => <Link key={key} href={href(f, { tab: key, page: undefined })} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${f.tab === key ? "border-[#5B21B6] text-[#5B21B6]" : "border-transparent text-black/55"}`}>{label}</Link>)}</nav>
      <section className={box} role="status"><h2 className="font-bold">Telemetría de Puri pendiente</h2><p className="mt-2 text-sm text-black/65">Esta base aún no tiene las tablas de monitoreo. El panel estará disponible cuando se aplique la migración en un entorno autorizado.</p></section>
    </div>;
  }
  const tools = f.tab === "resumen" || f.tab === "tools" || f.tab === "calidad" ? await getPuriTools(f) : [];
  const habitual = f.tab === "resumen" || f.tab === "uso" || f.tab === "negocios" ? await getPuriHabitual(f) : { tried: 0, habitual: 0 };
  const toolCalls = tools.reduce((sum, tool) => sum + tool.calls, 0);
  const toolSuccess = tools.reduce((sum, tool) => sum + tool.success, 0);

  return <div className="space-y-5 text-[#171717]"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5B21B6]">Superadmin / Operación de producto</p><h1 className="mt-1 text-3xl font-black">Puri</h1><p className="mt-1 text-sm text-black/60">Adopción, operación y calidad con metadata. Sin contenido de conversaciones ni resultados de tools.</p></header>
    <nav className="flex gap-1 overflow-x-auto border-b border-black/15" aria-label="Secciones de Puri">{TABS.map(([key, label]) => <Link key={key} href={href(f, { tab: key, page: undefined, metric: undefined })} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${f.tab === key ? "border-[#5B21B6] text-[#5B21B6]" : "border-transparent text-black/55"}`}>{label}</Link>)}</nav>
    <Filters f={f} plans={options.plans} locations={options.locations} />
    {f.business && <div className="flex items-center gap-3 rounded-lg bg-[#E9D8FF] px-3 py-2 text-xs"><span>Negocio: {f.business}</span><Link href={href(f, { business: undefined, location: undefined })} className="font-bold underline">Quitar filtro</Link></div>}
    {f.tab === "resumen" && <>
      <OverviewCards overview={overview} toolCalls={toolCalls} habitual={habitual.habitual} />
      <div className="grid gap-3 lg:grid-cols-2"><Kpi label="Éxito de tools" value={pct(toolSuccess, toolCalls)} detail={`${n(toolSuccess)} de ${n(toolCalls)} llamadas`} tone="success" /><Kpi label="Habituales / usuarios que probaron" value={pct(habitual.habitual, habitual.tried)} detail={`${n(habitual.habitual)} de ${n(habitual.tried)} en últimos 7 días`} /></div>
      <SummaryExtras f={f} />
    </>}
    {f.tab === "uso" && <Usage f={f} overview={overview} habitual={habitual} />}
    {f.tab === "negocios" && <Businesses f={f} overview={overview} habitual={habitual} />}
    {f.tab === "consultas" && <Queries f={f} overview={overview} />}
    {f.tab === "tools" && <Tools f={f} rows={tools} />}
    {f.tab === "calidad" && <Quality f={f} overview={overview} tools={tools} responseId={typeof params.response === "string" ? params.response : undefined} adminId={admin.id} />}
    {f.tab === "costos" && <Costs f={f} overview={overview} dimension={typeof params.dimension === "string" ? params.dimension : "day"} />}
  </div>;
}

async function SummaryExtras({ f }: { f: PuriAnalyticsFilters }) {
  const [funnel, retention, trend] = await Promise.all([f.intent || f.tool ? Promise.resolve(null) : getPuriFunnel(f), getPuriRetention(f), getPuriTrend(f)]);
  const steps = funnel ? [["Vio Puri", funnel.impression], ["Abrió Puri", funnel.opened], ["Preguntó", funnel.asked], ["Recibió respuesta", funnel.answered], ["Obtuvo datos/tools", funnel.data], ["Volvió otro día", funnel.returned]] as const : [];
  return <><div className="grid gap-3 xl:grid-cols-2"><section className={box}><h2 className="font-bold">Funnel de adopción</h2>{funnel ? <><p className="text-xs text-black/50">Pares negocio/usuario que completaron cada paso en orden durante el período.</p><div className="mt-3 space-y-2">{steps.map(([label, count], index) => <div key={label} className="flex items-center justify-between border-b border-black/10 py-1.5 text-sm"><span>{label}</span><span className="font-bold tabular-nums">{n(count)} <small className="ml-2 font-normal text-black/50">{index ? pct(count, steps[index - 1][1]) : ""}</small></span></div>)}</div></> : <p className="mt-3 text-sm text-black/60">El funnel no aplica con filtros de tool o categoría: impresión y apertura no tienen esos atributos.</p>}</section><section className={box}><h2 className="font-bold">Retención</h2><p className="text-xs text-black/50">Cohorte de primer uso real en el período; regreso en el día local exacto. Sólo cohortes maduras.</p><div className="mt-4 grid grid-cols-3 gap-3">{retention.map((row) => <Kpi key={row.day} label={`D${row.day}`} value={pct(row.returned, row.eligible)} detail={`${n(row.returned)} / ${n(row.eligible)}`} />)}</div></section></div><Trend points={trend} f={f} /></>;
}

async function Usage({ f, overview, habitual }: { f: PuriAnalyticsFilters; overview: PuriOverview; habitual: { tried: number; habitual: number } }) {
  const [trend, weeks, retention] = await Promise.all([getPuriTrend(f), getPuriHabitualEvolution(f), getPuriRetention(f)]);
  return <><div className="grid gap-3 sm:grid-cols-3"><Kpi label="Usuarios que probaron" value={n(overview.users)} detail="En el período elegido" /><Kpi label="Habituales · últimos 7 días" value={n(habitual.habitual)} /><Kpi label="Habituales / usuarios últimos 7 días" value={pct(habitual.habitual, habitual.tried)} /></div><Trend points={trend} f={f} /><div className="grid gap-3 lg:grid-cols-2"><section className={box}><h2 className="font-bold">Evolución semanal de habituales</h2>{weeks.length ? <div className="mt-3 space-y-2">{weeks.map((week) => <div key={week.week.toString()} className="flex justify-between border-b border-black/10 py-1 text-sm"><span>{new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeZone: "UTC" }).format(week.week)}</span><strong>{n(week.habitual)} / {n(week.tried)}</strong></div>)}</div> : <div className="mt-3"><Empty /></div>}</section><section className={box}><h2 className="font-bold">Regreso por cohorte</h2><div className="mt-3 space-y-2">{retention.map((row) => <div key={row.day} className="flex justify-between border-b border-black/10 py-1 text-sm"><span>D{row.day}</span><strong>{pct(row.returned, row.eligible)} <span className="font-normal text-black/50">({n(row.returned)}/{n(row.eligible)})</span></strong></div>)}</div></section></div></>;
}

async function Businesses({ f, overview, habitual }: { f: PuriAnalyticsFilters; overview: PuriOverview; habitual: { tried: number; habitual: number } }) {
  const [data, users, intents, trend, businessTools] = await Promise.all([getPuriBusinesses(f), getPuriBusinessUsers(f), f.business ? getPuriIntents(f) : Promise.resolve([]), f.business ? getPuriTrend(f) : Promise.resolve([]), f.business ? getPuriTools(f) : Promise.resolve([])]);
  return <><div className="grid gap-3 sm:grid-cols-3"><Kpi label="Negocios activos" value={n(overview.businesses)} /><Kpi label="Usuarios Puri" value={n(overview.users)} /><Kpi label="Habituales" value={n(habitual.habitual)} /></div>
    <form method="get" className="flex flex-wrap gap-2"><input type="hidden" name="tab" value="negocios" /><input type="hidden" name="range" value={f.range} />{f.range === "custom" && <><input type="hidden" name="from" value={f.fromKey} /><input type="hidden" name="to" value={f.toKey} /></>}{(["business", "plan", "role", "location", "tool", "intent"] as const).map((key) => f[key] ? <input key={key} type="hidden" name={key} value={f[key]} /> : null)}<input type="search" name="search" defaultValue={f.search} placeholder="Buscar negocio" className="rounded border border-black/20 bg-white px-3 py-2 text-sm" /><select name="sort" defaultValue={f.sort} className="rounded border border-black/20 bg-white px-3 py-2 text-sm">{[["messages", "Mensajes"], ["users", "Usuarios"], ["tools", "Tools"], ["errors", "Errores"], ["last", "Último uso"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="rounded bg-black px-3 py-2 text-sm font-semibold text-white">Buscar</button></form>
    <div className={`${box} overflow-x-auto p-0`}><table className="min-w-full"><thead><tr>{["Negocio", "Plan", "Usuarios", "Conversaciones", "Mensajes", "Tools", "Errores", "Último uso", "Últimos 7 días", "Habituales"].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{data.rows.map((row) => <tr key={row.businessId}><td className={td}><Link href={href(f, { business: row.businessId, page: undefined })} className="font-semibold text-[#5B21B6] underline">{row.name}</Link></td><td className={td}>{row.plan ?? "—"}</td><td className={td}>{n(row.users)}</td><td className={td}>{n(row.sessions)}</td><td className={td}>{n(row.messages)}</td><td className={td}>{n(row.tools)}</td><td className={td}>{n(row.errors)}</td><td className={td}>{dateTime(row.lastUse)}</td><td className={td}>{n(row.last7)}</td><td className={td}>{n(row.habitual)}</td></tr>)}</tbody></table>{!data.rows.length && <Empty />}</div>
    <div className="flex items-center gap-3 text-sm"><span>{n(data.total)} negocios · página {n(f.page)}</span>{f.page > 1 && <Link href={href(f, { page: String(f.page - 1) })} className="underline">Anterior</Link>}{f.page * 25 < data.total && <Link href={href(f, { page: String(f.page + 1) })} className="underline">Siguiente</Link>}</div>
    {f.business && <><h2 className="text-xl font-bold">Detalle del negocio</h2><OverviewCards overview={overview} toolCalls={businessTools.reduce((sum, row) => sum + row.calls, 0)} habitual={habitual.habitual} /><Trend points={trend} f={f} /><section className={box}><h3 className="font-bold">Categorías</h3><div className="mt-2 flex flex-wrap gap-2">{intents.map((item) => <span key={item.intent} className="rounded bg-black/5 px-2 py-1 text-xs">{item.intent}: {n(item.count)}</span>)}</div></section><section className={box}><h3 className="font-bold">Tools principales</h3><div className="mt-2 flex flex-wrap gap-2">{businessTools.slice(0, 10).map((tool) => <span key={tool.toolName} className="rounded bg-black/5 px-2 py-1 text-xs">{tool.toolName}: {n(tool.calls)}</span>)}</div></section><section className={`${box} overflow-x-auto`}><h3 className="mb-2 font-bold">Usuarios de Puri</h3><table className="min-w-full"><thead><tr>{["Usuario", "Rol", "Conversaciones", "Mensajes", "Días activos", "Última actividad"].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{users.map((row) => <tr key={row.userId}><td className={td}>{row.name}</td><td className={td}>{row.role}</td><td className={td}>{n(row.sessions)}</td><td className={td}>{n(row.messages)}</td><td className={td}>{n(row.days)}</td><td className={td}>{dateTime(row.lastUse)}</td></tr>)}</tbody></table>{!users.length && <Empty />}</section></>}
  </>;
}

async function Queries({ f, overview }: { f: PuriAnalyticsFilters; overview: PuriOverview }) {
  const [intents, trend] = await Promise.all([getPuriIntents(f), f.intent ? getPuriTrend(f) : Promise.resolve([])]);
  const totalIntentMessages = intents.reduce((sum, row) => sum + row.count, 0);
  return <><section className={box}><h2 className="font-bold">¿Para qué usan Puri?</h2><p className="text-xs text-black/50">Clasificación determinística por tool. unknown conserva la incertidumbre; no se leen consultas.</p>{intents.length ? <div className="mt-4 space-y-3">{intents.map((row) => <Link key={row.intent} href={href(f, { intent: row.intent })} className="block"><div className="flex justify-between text-sm"><span className="font-semibold">{row.intent}</span><span>{n(row.count)} · {pct(row.count, totalIntentMessages)} · {n(row.users)} usuarios · {n(row.businesses)} negocios</span></div><div className="mt-1 h-2 rounded bg-black/10"><div className="h-full rounded bg-[#7C3AED]" style={{ width: pct(row.count, totalIntentMessages) === "—" ? "0%" : pct(row.count, totalIntentMessages) }} /></div></Link>)}</div> : <div className="mt-3"><Empty /></div>}</section>{f.intent && <><div className="grid gap-3 sm:grid-cols-3"><Kpi label="Categoría" value={f.intent} /><Kpi label="Consultas" value={n(overview.messages)} /><Kpi label="Negocios" value={n(overview.businesses)} /></div><Trend points={trend} f={f} /></>}</>;
}

async function Tools({ f, rows }: { f: PuriAnalyticsFilters; rows: Awaited<ReturnType<typeof getPuriTools>> }) {
  const byName = new Map(rows.map((row) => [row.toolName, row]));
  const all = [...new Set([...puriToolNames, ...rows.map((row) => row.toolName)])].map((name) => byName.get(name) ?? { toolName: name, calls: 0, success: 0, noData: 0, denied: 0, invalidScope: 0, errors: 0, timeouts: 0, p50: null, p95: null, users: 0, businesses: 0 });
  const [errors, trend] = f.tool ? await Promise.all([getPuriErrors(f), getPuriTrend(f)]) : [[], []];
  return <><div className={`${box} overflow-x-auto p-0`}><table className="min-w-full"><thead><tr>{["Tool", "Llamadas", "Éxito", "Sin datos", "Bloqueadas", "Errores", "p50", "p95", "Usuarios", "Negocios"].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{all.map((row) => <tr key={row.toolName}><td className={td}><Link href={href(f, { tool: row.toolName })} className="font-semibold text-[#5B21B6] underline">{row.toolName}</Link></td><td className={td}>{n(row.calls)}</td><td className={`${td} text-[#067647]`}>{pct(row.success, row.calls)}</td><td className={`${td} text-[#A15C00]`}>{n(row.noData)}</td><td className={`${td} text-[#B42318]`}>{n(row.denied + row.invalidScope)}</td><td className={`${td} text-[#B42318]`}>{n(row.errors + row.timeouts)}</td><td className={td}>{ms(row.p50)}</td><td className={td}>{ms(row.p95)}</td><td className={td}>{n(row.users)}</td><td className={td}>{n(row.businesses)}</td></tr>)}</tbody></table></div>
    {f.tool && <><h2 className="text-xl font-bold">{f.tool}</h2><Trend points={trend} f={f} /><section className={box}><h3 className="font-bold">Principales códigos de error</h3>{errors.length ? <div className="mt-2 space-y-1">{errors.map((row) => <div key={row.errorCode} className="flex justify-between border-b border-black/10 py-1 text-sm"><span>{row.errorCode}</span><strong>{n(row.count)}</strong></div>)}</div> : <div className="mt-2"><Empty /></div>}</section></>}
  </>;
}

async function Quality({ f, overview, tools, responseId, adminId }: { f: PuriAnalyticsFilters; overview: PuriOverview; tools: Awaited<ReturnType<typeof getPuriTools>>; responseId?: string; adminId: string }) {
  const [latency, feedback, feedbackRows, errors, security, feedbackDays, requestErrors] = await Promise.all([getPuriLatency(f), getPuriFeedback(f), getPuriFeedbackRows(f), getPuriErrors(f), getPuriSecurityEvents(f), getPuriFeedbackEvolution(f), getPuriRequestErrors(f)]);
  const responseMetadata = responseId && /^[A-Za-z0-9_-]{1,40}$/.test(responseId) ? await getPuriResponseMetadata(responseId, f) : null;
  if (responseMetadata) await createAuditLog("SUPERADMIN_PURI_RESPONSE_METADATA_VIEWED", { businessId: responseMetadata.businessId, responseId: responseMetadata.id }, adminId);
  const positive = feedback.filter((row) => row.rating === "positive").reduce((sum, row) => sum + row.count, 0);
  const negative = feedback.filter((row) => row.rating === "negative").reduce((sum, row) => sum + row.count, 0);
  const contextDenied = security.reduce((sum, row) => sum + row.count, 0);
  return <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Respuestas completadas" value={n(overview.responded)} tone="success" /><Kpi label="Con error" value={n(overview.errors)} tone="error" /><Kpi label="Sin datos" value={n(overview.noData)} tone="warning" /><Kpi label="Bloqueadas por permisos/scope" value={n(overview.denied + contextDenied)} tone="error" /><Kpi label="Resueltas con tools" value={pct(overview.respondedWithTools, overview.responded)} /><Kpi label="Resueltas sin tools" value={pct(overview.respondedWithoutTools, overview.responded)} /><Kpi label="Acción solicitada no soportada" value={n(overview.unsupported)} tone="warning" /><Kpi label="Tool failures" value={n(tools.reduce((sum, row) => sum + row.errors + row.timeouts, 0))} tone="error" /></div>
    <div className="grid gap-3 lg:grid-cols-3"><Kpi label="Latencia total" value={`p50 ${ms(overview.p50Duration)}`} detail={`p95 ${ms(overview.p95Duration)}`} /><Kpi label="Modelo" value={`p50 ${ms(latency.modelP50)}`} detail={`p95 ${ms(latency.modelP95)}`} /><Kpi label="Tools" value={`p50 ${ms(latency.toolsP50)}`} detail={`p95 ${ms(latency.toolsP95)}`} /></div>
    <div className="grid gap-3 lg:grid-cols-2"><section className={box}><h2 className="font-bold">Feedback de respuestas</h2><div className="mt-3 grid grid-cols-3 gap-2"><Kpi label="Ratings" value={n(positive + negative)} /><Kpi label="Positivos" value={pct(positive, positive + negative)} tone="success" /><Kpi label="Negativos" value={pct(negative, positive + negative)} tone="error" /></div><h3 className="mt-4 text-sm font-semibold">Motivos negativos</h3>{feedback.filter((row) => row.rating === "negative").map((row) => <div key={row.reason ?? "none"} className="flex justify-between border-b border-black/10 py-1 text-sm"><span>{row.reason ?? "Sin motivo"}</span><strong>{n(row.count)}</strong></div>)}</section><section className={box}><h2 className="font-bold">Errores de tools</h2>{errors.length ? errors.map((row) => <div key={row.errorCode} className="flex justify-between border-b border-black/10 py-1 text-sm"><span>{row.errorCode}</span><strong>{n(row.count)}</strong></div>) : <div className="mt-3"><Empty /></div>}</section></div>
    <div className="grid gap-3 lg:grid-cols-2"><section className={box}><h2 className="font-bold">Bloqueos de contexto y sucursal</h2>{f.tool || f.intent ? <p className="mt-3 text-sm text-black/60">No aplica con filtros de tool o categoría: el bloqueo ocurrió antes de la consulta.</p> : security.length ? security.map((row) => <div key={row.errorCode} className="flex justify-between border-b border-black/10 py-1 text-sm"><span>{row.errorCode}</span><strong>{n(row.count)}</strong></div>) : <div className="mt-3"><Empty /></div>}</section><section className={box}><h2 className="font-bold">Evolución del feedback</h2>{feedbackDays.length ? feedbackDays.map((day) => <div key={day.day.toString()} className="flex justify-between border-b border-black/10 py-1 text-sm"><span>{new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeZone: "UTC" }).format(day.day)}</span><span><span className="text-[#067647]">👍 {n(day.positive)}</span> · <span className="text-[#B42318]">👎 {n(day.negative)}</span></span></div>) : <div className="mt-3"><Empty /></div>}</section></div>
    <section className={box}><h2 className="font-bold">Errores de modelo/proveedor</h2>{requestErrors.length ? requestErrors.map((row) => <div key={row.errorCode} className="flex justify-between border-b border-black/10 py-1 text-sm"><span>{row.errorCode}</span><strong>{n(row.count)}</strong></div>) : <div className="mt-3"><Empty /></div>}</section>
    <section className={`${box} overflow-x-auto`}><h2 className="mb-2 font-bold">Respuestas con feedback · sólo metadata</h2><table className="min-w-full"><thead><tr>{["Respuesta", "Rating", "Motivo", "Categoría", "Estado", "Modelo", "Duración", "Fecha"].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{feedbackRows.map((row) => <tr key={row.requestId}><td className={td}><Link href={href(f, { response: row.requestId })} className="text-[#5B21B6] underline">{row.requestId.slice(0, 12)}…</Link></td><td className={td}>{row.rating}</td><td className={td}>{row.reason ?? "—"}</td><td className={td}>{row.intent}</td><td className={td}>{row.status}</td><td className={td}>{row.model ?? "—"}</td><td className={td}>{ms(row.durationMs)}</td><td className={td}>{dateTime(row.createdAt)}</td></tr>)}</tbody></table>{!feedbackRows.length && <Empty />}</section>
    {responseMetadata && <section className={box}><div className="flex justify-between"><h2 className="font-bold">Metadata de respuesta {responseMetadata.id}</h2><Link href={href(f, { response: undefined })} className="text-sm underline">Cerrar</Link></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><p>Negocio: {responseMetadata.businessId}</p><p>Usuario: {responseMetadata.userId} · {responseMetadata.role}</p><p>Fecha: {dateTime(responseMetadata.createdAt)}</p><p>Estado: {responseMetadata.status}</p><p>Categoría: {responseMetadata.intent}</p><p>Modelo: {responseMetadata.model ?? "—"}</p><p>Error: {responseMetadata.errorCode ?? "—"}</p><p>Total: {ms(responseMetadata.totalDurationMs)}</p><p>Modelo/tools: {ms(responseMetadata.modelDurationMs)} / {ms(responseMetadata.toolsDurationMs)}</p><p>Tokens: {n(responseMetadata.promptTokens)} + {n(responseMetadata.completionTokens)} · {n(responseMetadata.cachedTokens)} cached</p><p>Costo estimado: {usd(responseMetadata.estimatedCostUsd)}</p></div><h3 className="mt-4 font-semibold">Tools</h3>{responseMetadata.toolCalls.length ? responseMetadata.toolCalls.map((tool, index) => <div key={index} className="flex flex-wrap justify-between gap-2 border-b border-black/10 py-1 text-sm"><span>{tool.toolName} · {tool.status}</span><span>{tool.errorCode ?? "—"} · {tool.resultCount == null ? "—" : n(tool.resultCount)} resultados · {ms(tool.durationMs)}</span></div>) : <p className="mt-2 text-sm text-black/50">Sin tools.</p>}</section>}
  </>;
}

async function Costs({ f, overview, dimension }: { f: PuriAnalyticsFilters; overview: PuriOverview; dimension: string }) {
  const selected = (["day", "business", "user", "session", "model"] as const).find((item) => item === dimension) ?? "day";
  const rows = await getPuriCosts(f, selected);
  return <><div className="grid gap-3 sm:grid-cols-3"><Kpi label="Requests" value={n(overview.messages)} /><Kpi label="Tokens" value={n(overview.promptTokens + overview.completionTokens)} detail={`${n(overview.cachedTokens)} cached`} /><Kpi label="Costo estimado" value={usd(overview.estimatedCostUsd)} detail={`${n(overview.pricedRequests)}/${n(overview.messages)} con tarifa configurada`} /></div><nav className="flex flex-wrap gap-1">{[["day", "Día"], ["business", "Negocio"], ["user", "Usuario"], ["session", "Conversación"], ["model", "Modelo"]].map(([key, label]) => <Link key={key} href={href(f, { dimension: key })} className={`rounded px-3 py-2 text-sm ${selected === key ? "bg-[#5B21B6] text-white" : "bg-white"}`}>{label}</Link>)}</nav><div className={`${box} overflow-x-auto p-0`}><table className="min-w-full"><thead><tr>{["Grupo", "Requests", "Prompt tokens", "Output tokens", "Cached tokens", "Costo estimado", "Con tarifa"].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.key}><td className={td}>{selected === "session" ? row.name.slice(0, 12) + "…" : row.name}</td><td className={td}>{n(row.requests)}</td><td className={td}>{n(row.input)}</td><td className={td}>{n(row.output)}</td><td className={td}>{n(row.cached)}</td><td className={td}>{usd(row.cost)}</td><td className={td}>{n(row.priced)}/{n(row.requests)}</td></tr>)}</tbody></table>{!rows.length && <Empty />}</div></>;
}
