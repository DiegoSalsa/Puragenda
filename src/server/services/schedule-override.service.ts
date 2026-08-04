import { prisma } from "@/server/db/prisma";

// ── Helpers ──

function toDateOnly(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00.000Z`) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ── Business Schedule Overrides ──

export async function getBusinessScheduleOverride(businessId: string, date: Date | string) {
  return prisma.businessScheduleOverride.findUnique({
    where: { businessId_date: { businessId, date: toDateOnly(date) } },
  });
}

export async function getBusinessScheduleOverrides(businessId: string, from?: Date, to?: Date) {
  return prisma.businessScheduleOverride.findMany({
    where: {
      businessId,
      ...(from && { date: { gte: toDateOnly(from) } }),
      ...(to && { date: { lte: toDateOnly(to) } }),
    },
    orderBy: { date: "asc" },
  });
}

export async function upsertBusinessScheduleOverride(
  businessId: string,
  data: {
    date: string; // YYYY-MM-DD
    isOpen: boolean;
    startTime?: string | null;
    endTime?: string | null;
    breakStart?: string | null;
    breakEnd?: string | null;
  },
) {
  const dateOnly = toDateOnly(data.date);
  return prisma.businessScheduleOverride.upsert({
    where: { businessId_date: { businessId, date: dateOnly } },
    create: {
      businessId,
      date: dateOnly,
      isOpen: data.isOpen,
      startTime: data.isOpen ? data.startTime || null : null,
      endTime: data.isOpen ? data.endTime || null : null,
      breakStart: data.isOpen ? data.breakStart || null : null,
      breakEnd: data.isOpen ? data.breakEnd || null : null,
    },
    update: {
      isOpen: data.isOpen,
      startTime: data.isOpen ? data.startTime || null : null,
      endTime: data.isOpen ? data.endTime || null : null,
      breakStart: data.isOpen ? data.breakStart || null : null,
      breakEnd: data.isOpen ? data.breakEnd || null : null,
    },
  });
}

export async function deleteBusinessScheduleOverride(businessId: string, date: string) {
  return prisma.businessScheduleOverride.deleteMany({
    where: { businessId, date: toDateOnly(date) },
  });
}

// ── Staff Schedule Overrides ──

export async function getStaffScheduleOverride(staffId: string, date: Date | string) {
  return prisma.staffScheduleOverride.findUnique({
    where: { staffId_date: { staffId, date: toDateOnly(date) } },
  });
}

export async function getStaffScheduleOverrides(staffId: string, from?: Date, to?: Date) {
  return prisma.staffScheduleOverride.findMany({
    where: {
      staffId,
      ...(from && { date: { gte: toDateOnly(from) } }),
      ...(to && { date: { lte: toDateOnly(to) } }),
    },
    orderBy: { date: "asc" },
  });
}

export async function upsertStaffScheduleOverride(
  staffId: string,
  data: {
    date: string;
    isWorking: boolean;
    startTime?: string | null;
    endTime?: string | null;
    breakStart?: string | null;
    breakEnd?: string | null;
  },
) {
  const dateOnly = toDateOnly(data.date);
  return prisma.staffScheduleOverride.upsert({
    where: { staffId_date: { staffId, date: dateOnly } },
    create: {
      staffId,
      date: dateOnly,
      isWorking: data.isWorking,
      startTime: data.isWorking ? data.startTime || null : null,
      endTime: data.isWorking ? data.endTime || null : null,
      breakStart: data.isWorking ? data.breakStart || null : null,
      breakEnd: data.isWorking ? data.breakEnd || null : null,
    },
    update: {
      isWorking: data.isWorking,
      startTime: data.isWorking ? data.startTime || null : null,
      endTime: data.isWorking ? data.endTime || null : null,
      breakStart: data.isWorking ? data.breakStart || null : null,
      breakEnd: data.isWorking ? data.breakEnd || null : null,
    },
  });
}

export async function deleteStaffScheduleOverride(staffId: string, date: string) {
  return prisma.staffScheduleOverride.deleteMany({
    where: { staffId, date: toDateOnly(date) },
  });
}
