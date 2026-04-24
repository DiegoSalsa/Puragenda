import { prisma } from "@/server/db/prisma";
import { DAYS_OF_WEEK } from "@/core/constants";

/**
 * Get business hours for a business. Returns all 7 days (creates defaults if missing).
 */
export async function getBusinessHours(businessId: string) {
  const existing = await prisma.businessHours.findMany({
    where: { businessId },
    orderBy: { dayOfWeek: "asc" },
  });

  // If no hours configured, return defaults
  if (existing.length === 0) {
    return DAYS_OF_WEEK.map((_, i) => ({
      id: "",
      dayOfWeek: i,
      startTime: "09:00",
      endTime: "19:00",
      isOpen: i >= 1 && i <= 5, // Mon-Fri open by default
      businessId,
    }));
  }

  return existing;
}

/**
 * Upsert business hours for a business (all 7 days).
 */
export async function saveBusinessHours(
  businessId: string,
  hours: { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean }[]
) {
  const operations = hours.map((h) =>
    prisma.businessHours.upsert({
      where: { businessId_dayOfWeek: { businessId, dayOfWeek: h.dayOfWeek } },
      create: { businessId, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen },
      update: { startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen },
    })
  );

  return prisma.$transaction(operations);
}

/**
 * Get blocked dates for a business within a date range.
 */
export async function getBlockedDates(businessId: string, from?: Date, to?: Date) {
  return prisma.blockedDate.findMany({
    where: {
      businessId,
      ...(from && { date: { gte: from } }),
      ...(to && { date: { lte: to } }),
    },
    orderBy: { date: "asc" },
  });
}

/**
 * Check if a specific date is blocked for a business.
 */
export async function isDateBlocked(businessId: string, date: Date): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const blocked = await prisma.blockedDate.findUnique({
    where: { businessId_date: { businessId, date: startOfDay } },
  });

  return !!blocked;
}
