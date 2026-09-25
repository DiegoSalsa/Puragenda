import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { appointmentMoney } from "@/lib/today-dashboard";
import { loadTodayDashboard } from "@/server/services/today-dashboard.service";
import { getDashboardAvailability } from "@/server/services/dashboard-availability.service";
import { dashboardAvailabilityRequestSchema } from "@/server/validations/dashboard-availability";
import { getAvailabilityStoryInsights } from "@/server/services/availability-story.service";
import { prisma } from "@/server/db/prisma";
import { appointmentScope, hasPermission, requireAgenda, requirePermission } from "./context";
import { periodWindow, safeDateWindow, type PuriPeriod } from "./dates";
import { PuriAccessError, type PuriContext } from "./types";

const ACTIVE = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN", "COMPLETED"];
const COMPLETED = ["CHECKED_IN", "COMPLETED"];
const MAX_ROWS = 50;
const periodSchema = z.enum(["today", "tomorrow", "yesterday", "this_week", "next_week", "previous_week", "this_month", "previous_month"]);
const statusSchema = z.enum(["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CANCELLED", "CHECKED_IN", "COMPLETED", "NO_SHOW"]);

function locationScope(context: PuriContext) {
  if (!context.location) return {};
  return context.location.isPrimary || context.locationCount === 1
    ? { OR: [{ locationId: context.location.id }, { locationId: null }] }
    : { locationId: context.location.id };
}

function appointmentWhere(context: PuriContext, start: Date, end: Date): Prisma.AppointmentWhereInput {
  return {
    businessId: context.business.id,
    ...locationScope(context),
    ...appointmentScope(context),
    startTime: { gte: start, lt: end },
  };
}

function safeAppointment(row: {
  id: string; customerName: string; startTime: Date; endTime: Date; status: string;
  totalPrice: number | null; service: { name: string; price: number }; staff: { name: string } | null;
}) {
  return {
    id: row.id,
    customerName: row.customerName,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    status: row.status,
    serviceName: row.service.name,
    staffName: row.staff?.name ?? null,
    totalPrice: Number(row.totalPrice ?? row.service.price ?? 0),
  };
}

export async function getTodayOverview(context: PuriContext) {
  requireAgenda(context);
  const data = await loadTodayDashboard({
    user: context.user,
    business: context.business,
    permissions: context.permissions,
    agenda: context.ownAgenda ? "mine" : undefined,
    location: context.location?.slug,
  });
  return {
    date: data.dateKey,
    timezone: data.timeZone,
    appointments: data.appointments.slice(0, MAX_ROWS).map((item) => ({
      id: item.id, customerName: item.customerName, serviceName: item.serviceName,
      startTime: item.startTime, endTime: item.endTime, status: item.status, phase: item.phase,
      paymentLabel: data.canSeeMoney ? item.paymentLabel : "hidden",
    })),
    counts: {
      appointments: data.kpis.appointments,
      cancelled: data.kpis.cancelled,
      ...(data.canSeeMoney ? { collected: data.kpis.collected, pending: data.kpis.pending, projected: data.kpis.projected } : {}),
    },
    availability: {
      totalOpeningsAcrossStaff: data.kpis.openSlots,
      featuredOpportunityTimes: data.story?.opportunityCount ?? 0,
      featuredTimes: data.story?.times ?? [],
    },
    finished: data.finished,
    attention: data.attention.map(({ id, count, when }) => ({ id, count, when })),
    nextAppointment: data.appointments.find((item) => item.phase === "current" || item.phase === "next")?.id ?? null,
    canSeeMoney: data.canSeeMoney,
  };
}

export async function getAppointments(context: PuriContext, args: { period: PuriPeriod; status?: string }) {
  requireAgenda(context);
  const window = periodWindow(args.period, context.location?.timezone ?? context.business.timezone);
  const rows = await prisma.appointment.findMany({
    where: { ...appointmentWhere(context, window.start, window.end), ...(args.status ? { status: args.status as never } : {}) },
    orderBy: { startTime: "asc" },
    take: MAX_ROWS + 1,
    include: { service: { select: { name: true, price: true } }, staff: { select: { name: true } } },
  });
  const canSeeMoney = context.ownAgenda
    ? hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN) || hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS)
    : hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS);
  return { period: args.period, dateStart: window.dateKey, dateEnd: window.endKey, timezone: context.location?.timezone ?? context.business.timezone, hasMore: rows.length > MAX_ROWS, appointments: rows.slice(0, MAX_ROWS).map((row) => {
    const item = safeAppointment(row);
    return canSeeMoney ? item : { ...item, totalPrice: undefined };
  }) };
}

export async function getAvailability(context: PuriContext, args: { date: string; serviceId?: string; staffId?: string }) {
  requireAgenda(context);
  if (!context.location) throw new PuriAccessError("LOCATION_REQUIRED");
  if (args.staffId && (!context.canSeeAllAgendas && args.staffId !== context.staffId)) throw new PuriAccessError("STAFF_FORBIDDEN");
  const parsed = dashboardAvailabilityRequestSchema.parse({
    mode: args.serviceId ? "services" : "overview",
    locationId: context.location.id,
    serviceIds: args.serviceId ? [args.serviceId] : [],
    staffId: args.staffId ?? (context.ownAgenda ? context.staffId ?? undefined : undefined),
    fromDate: safeDateWindow(args.date, context.location.timezone).dateKey,
    days: 1,
  });
  const result = await getDashboardAvailability(context.user, context.business, parsed);
  const slots = result.days[0]?.slots ?? [];
  return { date: args.date, timezone: result.timezone, serviceNames: result.serviceNames, availableTimesCount: slots.length, times: slots.slice(0, 20).map(({ time }) => time) };
}

export async function searchClients(context: PuriContext, args: { query: string }) {
  requirePermission(context, DASHBOARD_PERMISSIONS.CLIENTS_MANAGE);
  const query = args.query.trim();
  if (query.length < 2) throw new PuriAccessError("QUERY_TOO_SHORT");
  const rows = await prisma.client.findMany({
    where: { businessId: context.business.id, OR: [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
    ]},
    orderBy: { updatedAt: "desc" }, take: 10,
    select: { id: true, name: true, email: true, phone: true, currentStamps: true, noShowCount: true },
  });
  return { clients: rows };
}

export async function getClientActivity(context: PuriContext, args: { sort: "frequent" | "inactive" | "no_show" }) {
  requirePermission(context, DASHBOARD_PERMISSIONS.CLIENTS_MANAGE);
  const noShow = args.sort === "no_show";
  const rows = await prisma.appointment.groupBy({
    by: ["clientId"],
    where: { businessId: context.business.id, clientId: { not: null }, status: noShow ? "NO_SHOW" : { in: ["CHECKED_IN", "COMPLETED"] } },
    _count: { _all: true },
    _max: { startTime: true },
    orderBy: args.sort === "inactive" ? { _max: { startTime: "asc" } } : { _count: { clientId: "desc" } },
    take: 10,
  });
  const ids = rows.map((row) => row.clientId).filter((id): id is string => Boolean(id));
  const clients = await prisma.client.findMany({ where: { businessId: context.business.id, id: { in: ids } }, select: { id: true, name: true } });
  const names = new Map(clients.map((client) => [client.id, client.name]));
  return { sort: args.sort, clients: rows.filter((row) => row.clientId && names.has(row.clientId)).map((row) => ({
    id: row.clientId, name: names.get(row.clientId!), count: row._count._all, lastVisit: row._max.startTime?.toISOString() ?? null,
  })) };
}

export async function getClientSummary(context: PuriContext, args: { clientId: string }) {
  requirePermission(context, DASHBOARD_PERMISSIONS.CLIENTS_MANAGE);
  const client = await prisma.client.findFirst({
    where: { id: args.clientId, businessId: context.business.id },
    select: {
      id: true, name: true, email: true, currentStamps: true, noShowCount: true, totalSpent: true,
      appointments: { where: { status: { in: ["CHECKED_IN", "COMPLETED"] } }, orderBy: { startTime: "desc" }, take: 1, select: { startTime: true } },
      recurringBookings: { where: { status: { in: ["ACTIVE", "PENDING_APPROVAL", "PAUSED"] } }, select: { status: true, service: { select: { name: true } } } },
    },
  });
  if (!client) throw new PuriAccessError("CLIENT_NOT_FOUND");
  const [visits, nextAppointment] = await Promise.all([
    prisma.appointment.count({ where: { businessId: context.business.id, clientId: client.id, status: { in: ["CHECKED_IN", "COMPLETED"] } } }),
    prisma.appointment.findFirst({ where: { businessId: context.business.id, clientId: client.id, startTime: { gte: new Date() }, status: { in: ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"] } }, orderBy: { startTime: "asc" }, select: { startTime: true, service: { select: { name: true } } } }),
  ]);
  return {
    id: client.id, name: client.name, email: client.email, visits,
    lastVisit: client.appointments[0]?.startTime.toISOString() ?? null, nextAppointment: nextAppointment ? { startTime: nextAppointment.startTime.toISOString(), serviceName: nextAppointment.service.name } : null, noShowCount: client.noShowCount,
    currentStamps: client.currentStamps, totalSpent: hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS) ? client.totalSpent : undefined,
    recurring: client.recurringBookings.map((item) => ({ status: item.status, serviceName: item.service.name })),
  };
}

async function revenue(context: PuriContext, period: PuriPeriod) {
  requirePermission(context, context.ownAgenda ? (hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS) ? DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS : DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN) : DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS);
  const window = periodWindow(period, context.location?.timezone ?? context.business.timezone);
  const rows = await prisma.appointment.findMany({
    where: { ...appointmentWhere(context, window.start, window.end), status: { in: ACTIVE as never[] } },
    select: { status: true, paymentStatus: true, depositAmount: true, totalPrice: true, settledAt: true, giftCardPaidAmount: true, service: { select: { price: true } }, posPayments: { where: { status: "APPROVED" }, select: { amount: true } } },
  });
  const totals = rows.reduce((sum, row) => {
    const money = appointmentMoney({ status: row.status, paymentStatus: row.paymentStatus, depositAmount: row.depositAmount, totalPrice: row.totalPrice, servicePrice: row.service.price, posPaidAmount: row.posPayments.reduce((value, payment) => value + payment.amount, 0), giftCardPaidAmount: row.giftCardPaidAmount, settledAt: row.settledAt });
    return { due: sum.due + money.due, collected: sum.collected + money.collected, pending: sum.pending + money.pending };
  }, { due: 0, collected: 0, pending: 0 });
  return { period, currencyCode: context.business.currencyCode, ...totals, appointments: rows.length, completed: rows.filter((row) => COMPLETED.includes(row.status)).length, averageTicket: rows.length ? totals.due / rows.length : 0 };
}

export async function getRevenueSummary(context: PuriContext, args: { period: PuriPeriod }) {
  return revenue(context, args.period);
}

export async function comparePeriods(context: PuriContext, args: { current: PuriPeriod; previous: PuriPeriod }) {
  const [current, previous] = await Promise.all([revenue(context, args.current), revenue(context, args.previous)]);
  const change = (a: number, b: number) => b === 0 ? null : ((a - b) / b) * 100;
  return { current, previous, changes: { collectedPercent: change(current.collected, previous.collected), appointmentsPercent: change(current.appointments, previous.appointments), completedPercent: change(current.completed, previous.completed) } };
}

export async function getServicesSummary(context: PuriContext, args: { period: PuriPeriod }) {
  requireAgenda(context);
  const window = periodWindow(args.period, context.location?.timezone ?? context.business.timezone);
  const rows = await prisma.appointment.findMany({ where: { ...appointmentWhere(context, window.start, window.end), status: { in: ACTIVE as never[] } }, select: { totalPrice: true, service: { select: { name: true, price: true } } }, take: 1001 });
  if (rows.length > 1000) throw new PuriAccessError("RESULT_TOO_LARGE");
  const byService = new Map<string, { appointments: number; bookedValue: number }>();
  for (const row of rows) { const item = byService.get(row.service.name) ?? { appointments: 0, bookedValue: 0 }; item.appointments++; item.bookedValue += Number(row.totalPrice ?? row.service.price ?? 0); byService.set(row.service.name, item); }
  const canSeeMoney = context.ownAgenda
    ? hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN) || hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS)
    : hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS);
  return { period: args.period, services: [...byService.entries()].map(([name, value]) => ({ name, appointments: value.appointments, bookedValue: canSeeMoney ? value.bookedValue : undefined, averageBookedValue: canSeeMoney && value.appointments ? value.bookedValue / value.appointments : undefined })).sort((a, b) => b.appointments - a.appointments).slice(0, 10) };
}

export async function getStaffSummary(context: PuriContext, args: { period: PuriPeriod }) {
  requirePermission(context, DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL);
  requirePermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS);
  const window = periodWindow(args.period, context.location?.timezone ?? context.business.timezone);
  const rows = await prisma.appointment.findMany({ where: { ...appointmentWhere({ ...context, ownAgenda: false }, window.start, window.end), status: { in: ACTIVE as never[] } }, select: { staff: { select: { id: true, name: true } }, totalPrice: true, service: { select: { price: true } } }, take: 1001 });
  if (rows.length > 1000) throw new PuriAccessError("RESULT_TOO_LARGE");
  const byStaff = new Map<string, { name: string; appointments: number; bookedValue: number }>();
  for (const row of rows) { const key = row.staff?.id ?? "unassigned"; const item = byStaff.get(key) ?? { name: row.staff?.name ?? "unassigned", appointments: 0, bookedValue: 0 }; item.appointments++; item.bookedValue += Number(row.totalPrice ?? row.service.price ?? 0); byStaff.set(key, item); }
  return { period: args.period, staff: [...byStaff.values()].sort((a, b) => b.appointments - a.appointments).slice(0, 20) };
}

export async function getLoyaltySummary(context: PuriContext) {
  requirePermission(context, DASHBOARD_PERMISSIONS.LOYALTY_MANAGE);
  const [participants, stamps, rewards, business] = await Promise.all([
    prisma.client.count({ where: { businessId: context.business.id, OR: [{ currentStamps: { gt: 0 } }, { loyaltyStampEvents: { some: {} } }, { loyaltyCodes: { some: {} } }] } }),
    prisma.loyaltyStampEvent.aggregate({ where: { businessId: context.business.id, delta: { gt: 0 } }, _sum: { delta: true } }),
    prisma.loyaltyCode.count({ where: { businessId: context.business.id } }),
    prisma.business.findUnique({ where: { id: context.business.id }, select: { stampsRequired: true } }),
  ]);
  const nearWhere = business ? { businessId: context.business.id, currentStamps: { gte: Math.max(1, business.stampsRequired - 1), lt: business.stampsRequired } } : null;
  const [nearRewardCount, near] = nearWhere ? await Promise.all([
    prisma.client.count({ where: nearWhere }),
    prisma.client.findMany({ where: nearWhere, orderBy: { currentStamps: "desc" }, take: 10, select: { name: true, currentStamps: true } }),
  ]) : [0, []];
  return { participants, stampsDelivered: stamps._sum.delta ?? 0, rewardsGenerated: rewards, stampsRequired: business?.stampsRequired ?? null, nearRewardCount, nearReward: near };
}

export async function getGiftCardsSummary(context: PuriContext) {
  requirePermission(context, DASHBOARD_PERMISSIONS.GIFT_CARDS_MANAGE);
  const [issued, active, used, balances] = await Promise.all([
    prisma.giftCard.count({ where: { businessId: context.business.id } }),
    prisma.giftCard.count({ where: { businessId: context.business.id, status: "ACTIVE" } }),
    prisma.giftCard.count({ where: { businessId: context.business.id, status: "DEPLETED" } }),
    prisma.giftCard.groupBy({ by: ["currencyCode"], where: { businessId: context.business.id, status: "ACTIVE" }, _sum: { remainingBalance: true } }),
  ]);
  return { issued, active, used, balances: balances.map((row) => ({ currencyCode: row.currencyCode, remainingBalance: row._sum.remainingBalance ?? 0 })) };
}

export async function getRecurringSummary(context: PuriContext) {
  requirePermission(context, DASHBOARD_PERMISSIONS.RECURRING_MANAGE);
  const rows = await prisma.recurringBooking.groupBy({ by: ["status"], where: { businessId: context.business.id, ...appointmentScope(context) }, _count: { _all: true } });
  return { statuses: rows.map((row) => ({ status: row.status, count: row._count._all })) };
}

export async function getStoryInsights(context: PuriContext) {
  requirePermission(context, DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL);
  requirePermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS);
  const result = await getAvailabilityStoryInsights(context.user, context.business);
  return result ? { totals: result.totals, recent: result.recent.slice(0, 10).map((item) => ({ headline: item.headline, status: item.status, createdAt: item.createdAt, bookings: item.bookings, visits: item.visits, revenue: item.revenue })) } : { totals: null, recent: [] };
}

export type PuriToolName = "getTodayOverview" | "getAppointments" | "getAvailability" | "searchClients" | "getClientSummary" | "getClientActivity" | "getRevenueSummary" | "comparePeriods" | "getServicesSummary" | "getStaffSummary" | "getLoyaltySummary" | "getGiftCardsSummary" | "getRecurringSummary" | "getStoryInsights";
export const puriToolNames: PuriToolName[] = ["getTodayOverview", "getAppointments", "getAvailability", "searchClients", "getClientSummary", "getClientActivity", "getRevenueSummary", "comparePeriods", "getServicesSummary", "getStaffSummary", "getLoyaltySummary", "getGiftCardsSummary", "getRecurringSummary", "getStoryInsights"];

export async function executePuriTool(name: string, args: unknown, context: PuriContext) {
  switch (name as PuriToolName) {
    case "getTodayOverview": return getTodayOverview(context);
    case "getAppointments": return getAppointments(context, z.object({ period: periodSchema, status: statusSchema.nullish() }).parse(args) as { period: PuriPeriod; status?: string });
    case "getAvailability": return getAvailability(context, z.object({ date: z.string(), serviceId: z.string().nullish(), staffId: z.string().nullish() }).parse(args) as { date: string; serviceId?: string; staffId?: string });
    case "searchClients": return searchClients(context, z.object({ query: z.string().max(100) }).parse(args));
    case "getClientSummary": return getClientSummary(context, z.object({ clientId: z.string().min(1).max(100) }).parse(args));
    case "getClientActivity": return getClientActivity(context, z.object({ sort: z.enum(["frequent", "inactive", "no_show"]) }).parse(args));
    case "getRevenueSummary": return getRevenueSummary(context, z.object({ period: periodSchema }).parse(args));
    case "comparePeriods": return comparePeriods(context, z.object({ current: periodSchema, previous: periodSchema }).parse(args));
    case "getServicesSummary": return getServicesSummary(context, z.object({ period: periodSchema }).parse(args));
    case "getStaffSummary": return getStaffSummary(context, z.object({ period: periodSchema }).parse(args));
    case "getLoyaltySummary": return getLoyaltySummary(context);
    case "getGiftCardsSummary": return getGiftCardsSummary(context);
    case "getRecurringSummary": return getRecurringSummary(context);
    case "getStoryInsights": return getStoryInsights(context);
    default: throw new PuriAccessError("UNKNOWN_TOOL");
  }
}
