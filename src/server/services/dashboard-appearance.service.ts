import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/server/db/prisma";

export const CHRISTMAS_DASHBOARD_END_DATE = "2027-01-06";

export function isChristmasDashboardSeason(now = new Date()) {
  if (process.env.NODE_ENV === "development" && process.env.DASHBOARD_CHRISTMAS_PREVIEW === "1") {
    return true;
  }

  const date = formatInTimeZone(now, "America/Santiago", "yyyy-MM-dd");
  return date >= "2026-11-20" && date <= CHRISTMAS_DASHBOARD_END_DATE;
}

export async function getBusinessChristmasPreference(businessId: string) {
  const appearance = await prisma.businessDashboardAppearance.findUnique({
    where: { businessId },
    select: { christmasEnabled: true },
  });
  return appearance?.christmasEnabled ?? true;
}
