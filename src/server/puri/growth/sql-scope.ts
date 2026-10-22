import { Prisma } from "@prisma/client";
import type { GrowthScope } from "./access";
export function appointmentSqlScope(scope: GrowthScope) {
  return Prisma.sql`a."businessId"=${scope.businessId} ${scope.locationId ? Prisma.sql`AND (a."locationId"=${scope.locationId} ${scope.includeLegacyNullLocation ? Prisma.sql`OR a."locationId" IS NULL` : Prisma.empty})` : Prisma.empty}
    ${scope.staffId ? Prisma.sql`AND a."staffId"=${scope.staffId}` : Prisma.empty}`;
}
