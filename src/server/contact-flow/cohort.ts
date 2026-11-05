import { Prisma } from "@prisma/client";
import type { GrowthScope } from "@/server/puri/growth/access";
import { growthWindow, type GrowthRules } from "@/server/puri/growth/contracts";
import { appointmentSqlScope } from "@/server/puri/growth/sql-scope";
import { inactiveCohortCte } from "@/server/puri/growth/inactive-cohort";

// Same cadence, completed-day boundary, history horizon and future-booking
// exclusion as Puri+; IDs stay inside this backend, never in model tool output.
export async function cohortClients(
  tx: Prisma.TransactionClient,
  scope: GrowthScope,
  rules: GrowthRules,
  objective: string,
  serviceId: string,
  now: Date,
) {
  const w = growthWindow(scope.timezone, rules, now),
    filter = appointmentSqlScope(scope);
  if (objective === "RECOVERY")
    return tx.$queryRaw<{ id: string; email: string }[]>(
      Prisma.sql`${inactiveCohortCte(scope, rules, now)} SELECT c.id,c.email FROM eligible x JOIN "Client" c ON c.id=x.client AND c."businessId"=${scope.businessId} ORDER BY c.id LIMIT 1001`,
    );
  return tx.$queryRaw<
    { id: string; email: string }[]
  >(Prisma.sql`SELECT c.id,c.email FROM "Client" c WHERE c."businessId"=${scope.businessId}
    AND EXISTS(SELECT 1 FROM "Appointment" a WHERE ${filter} AND a."clientId"=c.id AND a.status='COMPLETED' AND a."startTime">=${w.historyStart} AND a."startTime"<${now} ${objective === "REVIEW_DEMAND" ? Prisma.sql`AND a."serviceId"=${serviceId}` : Prisma.empty})
    AND NOT EXISTS(SELECT 1 FROM "Appointment" f WHERE f."businessId"=${scope.businessId} AND f."clientId"=c.id AND f."startTime">=${now} AND f.status IN ('PENDING','AWAITING_PAYMENT','CONFIRMED','CHECKED_IN')) ORDER BY c.id LIMIT 1001`);
}
