import { Prisma } from "@prisma/client";
import type { GrowthScope } from "./access";
import { growthWindow, type GrowthRules } from "./contracts";
import { appointmentSqlScope } from "./sql-scope";
// One SQL definition for aggregate evidence and backend recipient selection.
export function inactiveCohortCte(
  scope: GrowthScope,
  rules: GrowthRules,
  now: Date,
) {
  const window = growthWindow(scope.timezone, rules, now),
    filter = appointmentSqlScope(scope);
  return Prisma.sql`WITH visits AS (
        SELECT DISTINCT a."clientId" AS client,(a."startTime" AT TIME ZONE ${scope.timezone})::date AS day
        FROM "Appointment" a JOIN "Client" c ON c.id=a."clientId" AND c."businessId"=a."businessId"
        WHERE ${filter} AND a.status='COMPLETED' AND a."startTime">=${window.historyStart} AND a."startTime"<${now}
      ), gaps AS (SELECT client,day-lag(day) OVER(PARTITION BY client ORDER BY day) AS gap FROM visits),
      cadence AS (SELECT client,count(gap) AS n,percentile_cont(.5) WITHIN GROUP(ORDER BY gap) FILTER(WHERE gap>0) AS median FROM gaps GROUP BY client),
      population AS (SELECT count(gap) AS n,count(DISTINCT client) AS clients,percentile_cont(.5) WITHIN GROUP(ORDER BY gap) AS median FROM gaps WHERE gap>0),
      candidates AS (SELECT v.client,max(v.day) AS last_day,
        least(180,greatest(14,ceil(CASE WHEN c.n>=3 THEN c.median*2 WHEN p.n>=${rules.minimumFrequencyGaps} AND p.clients>=${rules.minimumClients} THEN p.median*2 ELSE ${rules.inactivityFallbackDays} END)))::int AS threshold,
        CASE WHEN c.n>=3 THEN 'PERSONAL_CADENCE' WHEN p.n>=${rules.minimumFrequencyGaps} AND p.clients>=${rules.minimumClients} THEN 'BUSINESS_CADENCE' ELSE 'CONFIGURED_FALLBACK' END AS basis
        FROM visits v JOIN cadence c ON c.client=v.client CROSS JOIN population p GROUP BY v.client,c.n,c.median,p.n,p.clients,p.median
      ), eligible AS (SELECT * FROM candidates c WHERE (${window.endKey}::date-c.last_day)>=c.threshold AND NOT EXISTS (
        SELECT 1 FROM "Appointment" f WHERE f."businessId"=${scope.businessId} AND f."clientId"=c.client AND f."startTime">=${now} AND f.status IN ('PENDING','AWAITING_PAYMENT','CONFIRMED','CHECKED_IN')))`;
}
