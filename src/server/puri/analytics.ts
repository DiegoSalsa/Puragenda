import { addDays, format, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { startOfLocalDay } from "@/lib/zoned-appointment-time";
import { PURI_ANALYTICS_TIMEZONE, PURI_HABITUAL_DAYS, PURI_HABITUAL_WINDOW_DAYS } from "./telemetry";

const TABS = ["resumen", "uso", "negocios", "consultas", "tools", "calidad", "costos"] as const;
export type PuriTab = typeof TABS[number];
export type PuriAnalyticsFilters = {
  tab: PuriTab; range: "today" | "7d" | "30d" | "custom";
  from: Date; to: Date; fromKey: string; toKey: string;
  business?: string; plan?: string; role?: string; location?: string; tool?: string; intent?: string;
  metric: "users" | "messages" | "sessions" | "tools"; search: string; sort: string; page: number;
};

function dateKey(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + "T12:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
function habitualWindow(end: Date) {
  const lastDay = format(toZonedTime(new Date(end.getTime() - 1), PURI_ANALYTICS_TIMEZONE), "yyyy-MM-dd");
  const firstDay = format(subDays(new Date(lastDay + "T12:00:00Z"), PURI_HABITUAL_WINDOW_DAYS - 1), "yyyy-MM-dd");
  return { from: startOfLocalDay(firstDay, PURI_ANALYTICS_TIMEZONE), to: end };
}
export function parsePuriFilters(params: Record<string, string | string[] | undefined>, now = new Date()): PuriAnalyticsFilters {
  const param = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  const today = format(toZonedTime(now, PURI_ANALYTICS_TIMEZONE), "yyyy-MM-dd");
  const requestedRange = param("range");
  const range = requestedRange === "today" || requestedRange === "7d" || requestedRange === "custom" ? requestedRange : "30d";
  const requestedFrom = dateKey(param("from"));
  const requestedTo = dateKey(param("to"));
  const fromKey = range === "custom" && requestedFrom && requestedTo && requestedFrom <= requestedTo && Date.parse(requestedTo) - Date.parse(requestedFrom) <= 366 * 86400000 ? requestedFrom
    : range === "today" ? today : format(subDays(new Date(today + "T12:00:00Z"), range === "7d" ? 6 : 29), "yyyy-MM-dd");
  const toKey = range === "custom" && requestedFrom && requestedTo && requestedFrom <= requestedTo && Date.parse(requestedTo) - Date.parse(requestedFrom) <= 366 * 86400000 ? requestedTo : today;
  const tab = TABS.includes(param("tab") as PuriTab) ? param("tab") as PuriTab : "resumen";
  const metric = (["users", "messages", "sessions", "tools"] as const).find((item) => item === param("metric")) ?? (tab === "consultas" ? "messages" : tab === "tools" ? "tools" : "users");
  const clean = (key: string, max = 100) => param(key)?.trim().slice(0, max) || undefined;
  return { tab, range, fromKey, toKey, from: startOfLocalDay(fromKey, PURI_ANALYTICS_TIMEZONE),
    to: startOfLocalDay(format(addDays(new Date(toKey + "T12:00:00Z"), 1), "yyyy-MM-dd"), PURI_ANALYTICS_TIMEZONE),
    business: clean("business"), plan: clean("plan", 30), role: clean("role", 30), location: clean("location"), tool: clean("tool"), intent: clean("intent", 50),
    metric, search: clean("search", 80) ?? "", sort: clean("sort", 30) ?? "messages",
    page: /^\d{1,4}$/.test(param("page") ?? "1") ? Math.max(1, Math.min(1000, Number(param("page") ?? "1"))) : 1 };
}

function where(f: PuriAnalyticsFilters, alias = "r"): Prisma.Sql {
  const clauses: Prisma.Sql[] = [Prisma.sql`${Prisma.raw(alias)}."createdAt" >= ${f.from}`, Prisma.sql`${Prisma.raw(alias)}."createdAt" < ${f.to}`];
  if (f.business) clauses.push(Prisma.sql`${Prisma.raw(alias)}."businessId" = ${f.business}`);
  if (f.role) clauses.push(Prisma.sql`${Prisma.raw(alias)}."role" = ${f.role}`);
  if (f.location) clauses.push(Prisma.sql`${Prisma.raw(alias)}."businessLocationId" = ${f.location}`);
  if (f.intent) clauses.push(Prisma.sql`${Prisma.raw(alias)}."intent" = ${f.intent}`);
  if (f.tool) clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM "PuriToolCall" ft WHERE ft."requestId" = ${Prisma.raw(alias)}."id" AND ft."toolName" = ${f.tool})`);
  if (f.plan) clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM "Subscription" s WHERE s."businessId" = ${Prisma.raw(alias)}."businessId" AND s."plan"::text = ${f.plan})`);
  return Prisma.join(clauses, " AND ");
}

export type PuriOverview = { businesses: number; users: number; sessions: number; messages: number; responded: number; respondedWithTools: number; respondedWithoutTools: number; noData: number; errors: number; denied: number; unsupported: number; avgDuration: number | null; p50Duration: number | null; p95Duration: number | null; promptTokens: number; completionTokens: number; cachedTokens: number; estimatedCostUsd: number | null; pricedRequests: number };
export async function getPuriOverview(f: PuriAnalyticsFilters): Promise<PuriOverview> {
  const [row] = await prisma.$queryRaw<PuriOverview[]>(Prisma.sql`
    SELECT COUNT(DISTINCT r."businessId")::int AS businesses, COUNT(DISTINCT r."userId")::int AS users,
      COUNT(DISTINCT (r."businessId", r."userId", r."sessionId"))::int AS sessions, COUNT(*)::int AS messages,
      COUNT(*) FILTER (WHERE r.status IN ('SUCCESS','NO_DATA','DENIED'))::int AS responded,
      COUNT(*) FILTER (WHERE r.status IN ('SUCCESS','NO_DATA','DENIED') AND EXISTS (SELECT 1 FROM "PuriToolCall" t WHERE t."requestId" = r.id))::int AS "respondedWithTools",
      COUNT(*) FILTER (WHERE r.status IN ('SUCCESS','NO_DATA','DENIED') AND NOT EXISTS (SELECT 1 FROM "PuriToolCall" t WHERE t."requestId" = r.id))::int AS "respondedWithoutTools",
      COUNT(*) FILTER (WHERE r.status = 'NO_DATA')::int AS "noData",
      COUNT(*) FILTER (WHERE r.status IN ('ERROR','TIMEOUT'))::int AS errors,
      COUNT(*) FILTER (WHERE r.status = 'DENIED')::int AS denied,
      COUNT(*) FILTER (WHERE r.intent = 'ACTION_REQUEST_UNSUPPORTED')::int AS unsupported,
      AVG(r."totalDurationMs")::float AS "avgDuration",
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r."totalDurationMs")::float AS "p50Duration",
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r."totalDurationMs")::float AS "p95Duration",
      COALESCE(SUM(r."promptTokens"),0)::int AS "promptTokens", COALESCE(SUM(r."completionTokens"),0)::int AS "completionTokens",
      COALESCE(SUM(r."cachedTokens"),0)::int AS "cachedTokens", SUM(r."estimatedCostUsd")::float AS "estimatedCostUsd",
      COUNT(r."estimatedCostUsd")::int AS "pricedRequests"
    FROM "PuriRequest" r WHERE ${where(f)}`);
  return row;
}

export type PuriToolSummary = { toolName: string; calls: number; success: number; noData: number; denied: number; invalidScope: number; errors: number; timeouts: number; p50: number | null; p95: number | null; users: number; businesses: number };
export async function getPuriTools(f: PuriAnalyticsFilters): Promise<PuriToolSummary[]> {
  return prisma.$queryRaw<PuriToolSummary[]>(Prisma.sql`
    SELECT t."toolName", COUNT(*)::int AS calls,
      COUNT(*) FILTER (WHERE t.status = 'SUCCESS')::int AS success,
      COUNT(*) FILTER (WHERE t.status = 'NO_DATA')::int AS "noData",
      COUNT(*) FILTER (WHERE t.status = 'DENIED')::int AS denied,
      COUNT(*) FILTER (WHERE t.status = 'INVALID_SCOPE')::int AS "invalidScope",
      COUNT(*) FILTER (WHERE t.status = 'ERROR')::int AS errors,
      COUNT(*) FILTER (WHERE t.status = 'TIMEOUT')::int AS timeouts,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t."durationMs")::float AS p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY t."durationMs")::float AS p95,
      COUNT(DISTINCT t."userId")::int AS users, COUNT(DISTINCT t."businessId")::int AS businesses
    FROM "PuriToolCall" t JOIN "PuriRequest" r ON r.id = t."requestId"
    WHERE ${where(f)} ${f.tool ? Prisma.sql`AND t."toolName" = ${f.tool}` : Prisma.empty} GROUP BY t."toolName" ORDER BY calls DESC LIMIT 100`);
}

export type PuriIntentSummary = { intent: string; count: number; users: number; businesses: number };
export async function getPuriIntents(f: PuriAnalyticsFilters): Promise<PuriIntentSummary[]> {
  return prisma.$queryRaw<PuriIntentSummary[]>(Prisma.sql`SELECT r.intent, COUNT(*)::int AS count,
    COUNT(DISTINCT r."userId")::int AS users, COUNT(DISTINCT r."businessId")::int AS businesses
    FROM "PuriRequest" r WHERE ${where(f)} GROUP BY r.intent ORDER BY count DESC LIMIT 50`);
}

export type PuriTrendPoint = { bucket: Date; users: number; messages: number; sessions: number; tools: number };
export async function getPuriTrend(f: PuriAnalyticsFilters): Promise<PuriTrendPoint[]> {
  const dayCount = (f.to.getTime() - f.from.getTime()) / 86400000;
  const unit = dayCount <= 1.5 ? "hour" : dayCount <= 45 ? "day" : "week";
  return prisma.$queryRaw<PuriTrendPoint[]>(Prisma.sql`
    SELECT DATE_TRUNC(${unit}, r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE}) AS bucket,
      COUNT(DISTINCT r."userId")::int AS users, COUNT(*)::int AS messages,
      COUNT(DISTINCT (r."businessId", r."userId", r."sessionId"))::int AS sessions,
      COALESCE(SUM(tc.calls),0)::int AS tools
    FROM "PuriRequest" r LEFT JOIN LATERAL (SELECT COUNT(*)::int AS calls FROM "PuriToolCall" t WHERE t."requestId" = r.id ${f.tool ? Prisma.sql`AND t."toolName" = ${f.tool}` : Prisma.empty}) tc ON TRUE
    WHERE ${where(f)} GROUP BY 1 ORDER BY 1`);
}

export type PuriFunnel = { impression: number; opened: number; asked: number; answered: number; data: number; returned: number };
export async function getPuriFunnel(f: PuriAnalyticsFilters): Promise<PuriFunnel> {
  const uiClauses: Prisma.Sql[] = [Prisma.sql`u."createdAt" >= ${f.from}`, Prisma.sql`u."createdAt" < ${f.to}`];
  if (f.business) uiClauses.push(Prisma.sql`u."businessId" = ${f.business}`);
  if (f.role) uiClauses.push(Prisma.sql`u.role = ${f.role}`);
  if (f.location) uiClauses.push(Prisma.sql`u."businessLocationId" = ${f.location}`);
  if (f.plan) uiClauses.push(Prisma.sql`EXISTS (SELECT 1 FROM "Subscription" s WHERE s."businessId" = u."businessId" AND s.plan::text = ${f.plan})`);
  const [row] = await prisma.$queryRaw<PuriFunnel[]>(Prisma.sql`
    WITH impressions AS (SELECT u."businessId", u."userId", MIN(u."createdAt") AS at FROM "PuriUiEvent" u
      WHERE ${Prisma.join(uiClauses, " AND ")} AND u.event = 'impression' GROUP BY u."businessId", u."userId"),
    opens AS (SELECT u."businessId", u."userId", MIN(u."createdAt") AS at FROM "PuriUiEvent" u JOIN impressions i ON i."userId" = u."userId" AND i."businessId" = u."businessId"
      WHERE ${Prisma.join(uiClauses, " AND ")} AND u.event = 'opened' AND u."createdAt" >= i.at GROUP BY u."businessId", u."userId"),
    asked AS (SELECT r."businessId", r."userId", MIN(r."createdAt") AS at FROM "PuriRequest" r JOIN opens o ON o."userId" = r."userId" AND o."businessId" = r."businessId"
      WHERE ${where(f)} AND r."createdAt" >= o.at GROUP BY r."businessId", r."userId"),
    answered AS (SELECT r."businessId", r."userId", MIN(r."createdAt") AS at FROM "PuriRequest" r JOIN asked a ON a."userId" = r."userId" AND a."businessId" = r."businessId"
      WHERE ${where(f)} AND r."createdAt" >= a.at AND r.status IN ('SUCCESS','NO_DATA','DENIED') GROUP BY r."businessId", r."userId"),
    data_users AS (SELECT r."businessId", r."userId", MIN(r."createdAt") AS at FROM "PuriRequest" r JOIN answered a ON a."userId" = r."userId" AND a."businessId" = r."businessId"
      WHERE ${where(f)} AND r."createdAt" >= a.at AND EXISTS (SELECT 1 FROM "PuriToolCall" t WHERE t."requestId" = r.id AND t.status = 'SUCCESS' ${f.tool ? Prisma.sql`AND t."toolName" = ${f.tool}` : Prisma.empty}) GROUP BY r."businessId", r."userId"),
    returners AS (SELECT DISTINCT r."businessId", r."userId" FROM "PuriRequest" r JOIN data_users d ON d."userId" = r."userId" AND d."businessId" = r."businessId"
      WHERE ${where(f)} AND (r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date > (d.at AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date)
    SELECT (SELECT COUNT(*)::int FROM impressions) AS impression, (SELECT COUNT(*)::int FROM opens) AS opened,
      (SELECT COUNT(*)::int FROM asked) AS asked, (SELECT COUNT(*)::int FROM answered) AS answered,
      (SELECT COUNT(*)::int FROM data_users) AS data, (SELECT COUNT(*)::int FROM returners) AS returned`);
  return row;
}

export type PuriHabitual = { tried: number; habitual: number };
export async function getPuriHabitual(f: PuriAnalyticsFilters, now = new Date()): Promise<PuriHabitual> {
  const windowEnd = f.to < now ? f.to : now;
  const windowFilters = { ...f, ...habitualWindow(windowEnd) };
  const [row] = await prisma.$queryRaw<PuriHabitual[]>(Prisma.sql`WITH activity AS (
    SELECT r."userId", COUNT(DISTINCT (r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date)::int AS days
    FROM "PuriRequest" r WHERE ${where(windowFilters)} GROUP BY r."userId")
    SELECT COUNT(*)::int AS tried, COUNT(*) FILTER (WHERE days >= ${PURI_HABITUAL_DAYS})::int AS habitual FROM activity`);
  return row;
}

export type PuriRetention = { day: number; eligible: number; returned: number };
export async function getPuriRetention(f: PuriAnalyticsFilters, now = new Date()): Promise<PuriRetention[]> {
  const rows = await prisma.$queryRaw<PuriRetention[]>(Prisma.sql`WITH candidates AS (
    SELECT DISTINCT r."userId", r."businessId", (r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date AS activity_day
    FROM "PuriRequest" r WHERE ${where(f)}), cohort AS (
    SELECT c."userId", c."businessId", c.activity_day AS first_day FROM candidates c
    JOIN LATERAL (SELECT (p."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date AS first_day
      FROM "PuriRequest" p WHERE p."userId" = c."userId" AND p."businessId" = c."businessId" ORDER BY p."createdAt" ASC LIMIT 1) first_use
      ON first_use.first_day = c.activity_day)
    SELECT d.day::int AS day, COUNT(*) FILTER (WHERE c.first_day + d.day < (${now} AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date)::int AS eligible,
      COUNT(*) FILTER (WHERE c.first_day + d.day < (${now} AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date AND EXISTS (
        SELECT 1 FROM "PuriRequest" later WHERE later."userId" = c."userId" AND later."businessId" = c."businessId"
        AND (later."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date = c.first_day + d.day))::int AS returned
    FROM cohort c CROSS JOIN (VALUES (1),(7),(30)) AS d(day) GROUP BY d.day ORDER BY d.day`);
  return [1, 7, 30].map((day) => rows.find((row) => row.day === day) ?? { day, eligible: 0, returned: 0 });
}

export type PuriBusinessRow = { businessId: string; name: string; plan: string | null; users: number; sessions: number; messages: number; tools: number; errors: number; lastUse: Date; last7: number; habitual: number };
export async function getPuriBusinesses(f: PuriAnalyticsFilters): Promise<{ rows: PuriBusinessRow[]; total: number }> {
  const sorts: Record<string, Prisma.Sql> = { messages: Prisma.sql`messages DESC`, users: Prisma.sql`users DESC`, tools: Prisma.sql`tools DESC`, errors: Prisma.sql`errors DESC`, last: Prisma.sql`"lastUse" DESC` };
  const search = f.search ? Prisma.sql`AND b.name ILIKE ${"%" + f.search + "%"}` : Prisma.empty;
  const order = sorts[f.sort] ?? sorts.messages;
  const now = new Date();
  const recent = { ...f, ...habitualWindow(f.to < now ? f.to : now) };
  const rows = await prisma.$queryRaw<PuriBusinessRow[]>(Prisma.sql`
    WITH activity AS (SELECT r."businessId", COUNT(DISTINCT r."userId")::int AS users,
      COUNT(DISTINCT (r."userId", r."sessionId"))::int AS sessions, COUNT(*)::int AS messages,
      COUNT(*) FILTER (WHERE r.status IN ('ERROR','TIMEOUT'))::int AS errors,
      MAX(r."createdAt") AS "lastUse", COALESCE(SUM(tc.calls),0)::int AS tools
      FROM "PuriRequest" r LEFT JOIN LATERAL (SELECT COUNT(*)::int AS calls FROM "PuriToolCall" t WHERE t."requestId" = r.id ${f.tool ? Prisma.sql`AND t."toolName" = ${f.tool}` : Prisma.empty}) tc ON TRUE
      WHERE ${where(f)} GROUP BY r."businessId"), habitual AS (
      SELECT r."businessId", SUM(r.messages)::int AS last7, COUNT(*) FILTER (WHERE days >= ${PURI_HABITUAL_DAYS})::int AS habitual FROM (
        SELECT r."businessId", r."userId", COUNT(*)::int AS messages, COUNT(DISTINCT (r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date)::int AS days
        FROM "PuriRequest" r WHERE ${where(recent)} GROUP BY r."businessId", r."userId"
      ) r GROUP BY r."businessId")
    SELECT a."businessId", b.name, s.plan::text AS plan, a.users, a.sessions, a.messages, a.tools, a.errors, a."lastUse", COALESCE(h.last7,0)::int AS last7,
      COALESCE(h.habitual,0)::int AS habitual
    FROM activity a JOIN "Business" b ON b.id = a."businessId"
    LEFT JOIN "Subscription" s ON s."businessId" = b.id LEFT JOIN habitual h ON h."businessId" = b.id
    WHERE 1=1 ${search} ORDER BY ${order}, a."businessId" ASC LIMIT 25 OFFSET ${(f.page - 1) * 25}`);
  const [countRow] = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`SELECT COUNT(DISTINCT r."businessId")::int AS total FROM "PuriRequest" r
    JOIN "Business" b ON b.id = r."businessId" WHERE ${where(f)} ${search}`);
  return { rows, total: countRow?.total ?? 0 };
}

export type PuriUserRow = { userId: string; name: string; role: string; sessions: number; messages: number; days: number; lastUse: Date };
export async function getPuriBusinessUsers(f: PuriAnalyticsFilters): Promise<PuriUserRow[]> {
  if (!f.business) return [];
  return prisma.$queryRaw<PuriUserRow[]>(Prisma.sql`SELECT r."userId", u.name, MAX(r.role) AS role,
    COUNT(DISTINCT r."sessionId")::int AS sessions, COUNT(*)::int AS messages,
    COUNT(DISTINCT (r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date)::int AS days,
    MAX(r."createdAt") AS "lastUse" FROM "PuriRequest" r JOIN "User" u ON u.id = r."userId"
    WHERE ${where(f)} GROUP BY r."userId", u.name ORDER BY messages DESC LIMIT 50`);
}

export type PuriFeedbackSummary = { rating: string; reason: string | null; count: number };
export async function getPuriFeedback(f: PuriAnalyticsFilters): Promise<PuriFeedbackSummary[]> {
  return prisma.$queryRaw<PuriFeedbackSummary[]>(Prisma.sql`SELECT fb.rating, fb.reason, COUNT(*)::int AS count
    FROM "PuriFeedback" fb JOIN "PuriRequest" r ON r.id = fb."requestId"
    WHERE ${where(f)} GROUP BY fb.rating, fb.reason ORDER BY count DESC`);
}

export type PuriFeedbackRow = { requestId: string; rating: string; reason: string | null; createdAt: Date; intent: string; status: string; model: string | null; durationMs: number | null; businessId: string };
export async function getPuriFeedbackRows(f: PuriAnalyticsFilters): Promise<PuriFeedbackRow[]> {
  return prisma.$queryRaw<PuriFeedbackRow[]>(Prisma.sql`SELECT fb."requestId", fb.rating, fb.reason, fb."createdAt",
    r.intent, r.status, r.model, r."totalDurationMs" AS "durationMs", r."businessId"
    FROM "PuriFeedback" fb JOIN "PuriRequest" r ON r.id = fb."requestId"
    WHERE ${where(f)} ORDER BY fb."createdAt" DESC LIMIT 20`);
}

export async function getPuriResponseMetadata(id: string, f: PuriAnalyticsFilters) {
  const matching = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT r.id FROM "PuriRequest" r WHERE r.id = ${id} AND ${where(f)} LIMIT 1`);
  if (!matching.length) return null;
  return prisma.puriRequest.findUnique({ where: { id }, select: {
    id: true, businessId: true, userId: true, role: true, model: true, intent: true, status: true, errorCode: true,
    createdAt: true, totalDurationMs: true, modelDurationMs: true, toolsDurationMs: true,
    promptTokens: true, completionTokens: true, cachedTokens: true, estimatedCostUsd: true,
    toolCalls: { select: { toolName: true, status: true, errorCode: true, resultCount: true, durationMs: true }, orderBy: { createdAt: "asc" } },
  } });
}

export type PuriFeedbackDay = { day: Date; positive: number; negative: number };
export async function getPuriFeedbackEvolution(f: PuriAnalyticsFilters): Promise<PuriFeedbackDay[]> {
  return prisma.$queryRaw<PuriFeedbackDay[]>(Prisma.sql`SELECT DATE_TRUNC('day', fb."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE}) AS day,
    COUNT(*) FILTER (WHERE fb.rating = 'positive')::int AS positive,
    COUNT(*) FILTER (WHERE fb.rating = 'negative')::int AS negative
    FROM "PuriFeedback" fb JOIN "PuriRequest" r ON r.id = fb."requestId"
    WHERE ${where(f)} GROUP BY 1 ORDER BY 1 LIMIT 366`);
}

export type PuriLatency = { modelP50: number | null; modelP95: number | null; toolsP50: number | null; toolsP95: number | null };
export async function getPuriLatency(f: PuriAnalyticsFilters): Promise<PuriLatency> {
  const [row] = await prisma.$queryRaw<PuriLatency[]>(Prisma.sql`SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r."modelDurationMs")::float AS "modelP50",
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r."modelDurationMs")::float AS "modelP95",
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r."toolsDurationMs")::float AS "toolsP50",
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r."toolsDurationMs")::float AS "toolsP95"
    FROM "PuriRequest" r WHERE ${where(f)}`);
  return row;
}

export type PuriHabitualWeek = { week: Date; tried: number; habitual: number };
export async function getPuriHabitualEvolution(f: PuriAnalyticsFilters): Promise<PuriHabitualWeek[]> {
  return prisma.$queryRaw<PuriHabitualWeek[]>(Prisma.sql`WITH activity AS (
    SELECT DATE_TRUNC('week', r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE}) AS week,
      r."userId", COUNT(DISTINCT (r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE})::date)::int AS days
    FROM "PuriRequest" r WHERE ${where(f)} GROUP BY 1, 2)
    SELECT week, COUNT(*)::int AS tried, COUNT(*) FILTER (WHERE days >= ${PURI_HABITUAL_DAYS})::int AS habitual
    FROM activity GROUP BY week ORDER BY week DESC LIMIT 12`);
}

export type PuriErrorCode = { errorCode: string; count: number };
export async function getPuriErrors(f: PuriAnalyticsFilters): Promise<PuriErrorCode[]> {
  return prisma.$queryRaw<PuriErrorCode[]>(Prisma.sql`SELECT COALESCE(t."errorCode", 'UNKNOWN') AS "errorCode", COUNT(*)::int AS count
    FROM "PuriToolCall" t JOIN "PuriRequest" r ON r.id = t."requestId"
    WHERE ${where(f)} ${f.tool ? Prisma.sql`AND t."toolName" = ${f.tool}` : Prisma.empty} AND t.status IN ('ERROR','TIMEOUT','DENIED','INVALID_SCOPE') GROUP BY 1 ORDER BY count DESC LIMIT 20`);
}

export async function getPuriSecurityEvents(f: PuriAnalyticsFilters): Promise<PuriErrorCode[]> {
  if (f.tool || f.intent) return [];
  const clauses: Prisma.Sql[] = [Prisma.sql`u.event = 'permission_denied'`, Prisma.sql`u."createdAt" >= ${f.from}`, Prisma.sql`u."createdAt" < ${f.to}`];
  if (f.business) clauses.push(Prisma.sql`u."businessId" = ${f.business}`);
  if (f.role) clauses.push(Prisma.sql`u.role = ${f.role}`);
  if (f.location) clauses.push(Prisma.sql`u."businessLocationId" = ${f.location}`);
  if (f.plan) clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM "Subscription" s WHERE s."businessId" = u."businessId" AND s.plan::text = ${f.plan})`);
  return prisma.$queryRaw<PuriErrorCode[]>(Prisma.sql`SELECT COALESCE(u."errorCode", 'UNKNOWN') AS "errorCode", COUNT(*)::int AS count
    FROM "PuriUiEvent" u WHERE ${Prisma.join(clauses, " AND ")} GROUP BY 1 ORDER BY count DESC LIMIT 20`);
}

export async function getPuriRequestErrors(f: PuriAnalyticsFilters): Promise<PuriErrorCode[]> {
  return prisma.$queryRaw<PuriErrorCode[]>(Prisma.sql`SELECT COALESCE(r."errorCode", 'UNKNOWN') AS "errorCode", COUNT(*)::int AS count
    FROM "PuriRequest" r WHERE ${where(f)} AND r."errorCode" IN ('NOT_CONFIGURED','MODEL_TIMEOUT','MODEL_OR_PROVIDER_ERROR') GROUP BY 1 ORDER BY count DESC LIMIT 20`);
}

export type PuriCostRow = { key: string; name: string; requests: number; input: number; output: number; cached: number; cost: number | null; priced: number };
export async function getPuriCosts(f: PuriAnalyticsFilters, dimension: "day" | "business" | "user" | "session" | "model"): Promise<PuriCostRow[]> {
  const keys: Record<typeof dimension, Prisma.Sql> = {
    day: Prisma.sql`TO_CHAR(r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE}, 'YYYY-MM-DD')`,
    business: Prisma.sql`r."businessId"`, user: Prisma.sql`r."userId"`,
    session: Prisma.sql`r."businessId" || ':' || r."userId" || ':' || r."sessionId"`, model: Prisma.sql`COALESCE(r.model, 'unknown')`,
  };
  const expressions: Record<typeof dimension, Prisma.Sql> = {
    day: Prisma.sql`TO_CHAR(r."createdAt" AT TIME ZONE ${PURI_ANALYTICS_TIMEZONE}, 'YYYY-MM-DD')`,
    business: Prisma.sql`COALESCE(b.name, r."businessId")`, user: Prisma.sql`COALESCE(u.name, r."userId")`,
    session: Prisma.sql`r."sessionId"`, model: Prisma.sql`COALESCE(r.model, 'unknown')`,
  };
  return prisma.$queryRaw<PuriCostRow[]>(Prisma.sql`SELECT ${keys[dimension]} AS key, ${expressions[dimension]} AS name, COUNT(*)::int AS requests,
    SUM(r."promptTokens")::int AS input, SUM(r."completionTokens")::int AS output,
    SUM(r."cachedTokens")::int AS cached, SUM(r."estimatedCostUsd")::float AS cost,
    COUNT(r."estimatedCostUsd")::int AS priced FROM "PuriRequest" r
    LEFT JOIN "Business" b ON b.id = r."businessId" LEFT JOIN "User" u ON u.id = r."userId"
    WHERE ${where(f)} GROUP BY 1, 2 ORDER BY requests DESC LIMIT 50`);
}

export async function getPuriFilterOptions(businessId?: string) {
  const [plans, locations] = await Promise.all([
    prisma.subscription.groupBy({ by: ["plan"], _count: { _all: true } }),
    businessId ? prisma.businessLocation.findMany({ where: { businessId }, select: { id: true, name: true, businessId: true }, orderBy: { name: "asc" }, take: 200 }) : Promise.resolve([]),
  ]);
  return { plans: plans.map((item) => item.plan), locations };
}
