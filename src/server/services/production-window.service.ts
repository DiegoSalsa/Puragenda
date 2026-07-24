import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { prisma } from "@/server/db/prisma";
import { customProductionWindowSchema } from "@/server/validations/booking";

export const ACTIVE_PRODUCTION_STATUSES = [
  "AWAITING_DEPOSIT",
  "REFERENCES_REVIEW",
  "QUEUED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "BALANCE_DUE",
  "READY_TO_SHIP",
  "SHIPPED",
] as const;

export interface ProductionWindow {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  capacity: number;
  used: number;
  available: number;
  scheduleMode: "WEEKLY" | "CUSTOM";
}

interface ProductionServiceSchedule {
  id: string;
  productionScheduleMode: "WEEKLY" | "CUSTOM";
  weeklyProductionCapacity: number;
  productionWeeksAhead: number;
  productionLeadTimeWeeks: number;
  customProductionWindows: unknown;
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function parseCustomProductionWindows(value: unknown) {
  const parsed = customProductionWindowSchema.array().safeParse(value);
  return parsed.success ? parsed.data : [];
}

export async function getProductionWindows(
  service: ProductionServiceSchedule,
): Promise<ProductionWindow[]> {
  if (service.productionScheduleMode === "CUSTOM") {
    const today = format(new Date(), "yyyy-MM-dd");
    const configured = parseCustomProductionWindows(service.customProductionWindows)
      .filter((window) => window.isActive && window.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (configured.length === 0) return [];

    const usage = await prisma.productionOrder.groupBy({
      by: ["productionWindowKey"],
      where: {
        serviceId: service.id,
        productionWindowKey: { in: configured.map((window) => window.key) },
        status: { in: [...ACTIVE_PRODUCTION_STATUSES] },
      },
      _count: { _all: true },
    });
    const usedByKey = new Map(usage.map((row) => [row.productionWindowKey, row._count._all]));

    return configured.map((window) => {
      const used = usedByKey.get(window.key) ?? 0;
      return {
        key: window.key,
        label: window.label,
        startDate: window.startDate,
        endDate: window.endDate,
        capacity: window.capacity,
        used,
        available: Math.max(0, window.capacity - used),
        scheduleMode: "CUSTOM" as const,
      };
    });
  }

  const firstWeekLocal = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    service.productionLeadTimeWeeks,
  );
  const firstWeekKey = format(firstWeekLocal, "yyyy-MM-dd");
  const firstWeek = dateOnly(firstWeekKey);
  const lastWeek = addWeeks(firstWeek, service.productionWeeksAhead);
  const existing = await prisma.productionOrder.groupBy({
    by: ["productionWeek"],
    where: {
      serviceId: service.id,
      status: { in: [...ACTIVE_PRODUCTION_STATUSES] },
      productionWeek: { gte: firstWeek, lt: lastWeek },
    },
    _count: { _all: true },
  });
  const usedByWeek = new Map(
    existing.map((row) => [row.productionWeek.toISOString().slice(0, 10), row._count._all]),
  );

  return Array.from({ length: service.productionWeeksAhead }, (_, index) => {
    const weekStart = addWeeks(firstWeek, index);
    const startDate = weekStart.toISOString().slice(0, 10);
    const endDate = addDays(weekStart, 6).toISOString().slice(0, 10);
    const used = usedByWeek.get(startDate) ?? 0;
    return {
      key: `week:${startDate}`,
      label: `Semana del ${format(weekStart, "dd/MM/yyyy")}`,
      startDate,
      endDate,
      capacity: service.weeklyProductionCapacity,
      used,
      available: Math.max(0, service.weeklyProductionCapacity - used),
      scheduleMode: "WEEKLY" as const,
    };
  });
}
