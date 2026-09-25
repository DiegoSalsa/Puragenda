import { addDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { dateKeyInTimezone } from "@/lib/date";

const REVENUE_EXCLUDED = new Set(["CANCELLED", "NO_SHOW"]);
const OPEN_STATUSES = new Set(["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN"]);
const CLOSE_STATUSES = new Set(["PENDING", "CONFIRMED", "CHECKED_IN"]);

export type TodayPaymentLabel = "collected" | "partial" | "pending" | "due" | "none";
export type TodayPhase = "current" | "next" | "upcoming" | "past" | "inactive";
export type TodayDayState = "empty" | "active" | "finished";

export type TodayMoneyInput = {
  status: string;
  paymentStatus: string;
  depositAmount: number | null;
  totalPrice: number | null;
  servicePrice: number;
  posPaidAmount: number;
  giftCardPaidAmount: number;
  settledAt: Date | string | null;
};

export type TodayMoney = {
  due: number;
  collected: number;
  pending: number;
  label: TodayPaymentLabel;
};

export type TodayAppointmentInput = TodayMoneyInput & {
  id: string;
  startTime: Date;
  endTime: Date;
  staffId: string | null;
};

export type TodayOpportunityInput = {
  locationId: string;
  staffId: string;
  serviceId: string;
  date: string;
  slotCount: number;
  times: string[];
};

export type TodayAttentionKind = "pending-payments" | "pending-recurring" | "needs-close" | "freed-availability";

export type TodayAttentionItem = {
  id: TodayAttentionKind;
  count: number;
  appointmentId?: string;
  when?: "afternoon" | "today";
  href?: string;
  amount?: number;
};

export type TodayStoryCue = {
  locationId: string;
  staffId: string;
  serviceId: string;
  date: string;
  slotCount: number;
  opportunityCount: number;
  times: string[];
  when: "afternoon" | "today";
  objective: "LAST_MINUTE" | "CANCELLATION";
};

export type AgendaScope = {
  canSeeAllAgendas: boolean;
  staffId: string | null;
  ownStaffId: string | null;
};

export function locationDayWindow(now: Date, timeZone: string) {
  const dateKey = dateKeyInTimezone(now, timeZone);
  const zonedNow = toZonedTime(now, timeZone);
  const nextKey = format(addDays(zonedNow, 1), "yyyy-MM-dd");
  return {
    dateKey,
    start: fromZonedTime(`${dateKey}T00:00:00`, timeZone),
    end: fromZonedTime(`${nextKey}T00:00:00`, timeZone),
  };
}

export function isOnLocationDay(instant: Date, now: Date, timeZone: string) {
  const window = locationDayWindow(now, timeZone);
  return instant >= window.start && instant < window.end;
}

export function resolveAgendaStaffFilter(scope: AgendaScope, showingOwnAgenda: boolean) {
  if (scope.canSeeAllAgendas) {
    return showingOwnAgenda ? { staffId: scope.ownStaffId ?? "__no_staff_access__" } : {};
  }
  return { staffId: scope.staffId ?? "__no_staff_access__" };
}

export function resolveLocationFilter(
  selected: { id: string; isPrimary: boolean } | null,
  locationCount: number,
) {
  if (!selected) return {};
  if (selected.isPrimary || locationCount === 1) {
    return { OR: [{ locationId: selected.id }, { locationId: null }] };
  }
  return { locationId: selected.id };
}

export function canSeeTodayMoney(input: {
  canSeeAllAgendas: boolean;
  showingOwnAgenda: boolean;
  permissions: readonly string[];
}) {
  const own = input.permissions.includes(DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN);
  const business = input.permissions.includes(DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS);
  if (!input.canSeeAllAgendas || input.showingOwnAgenda) return own || business;
  return business;
}

export function shouldShowProfessional(input: {
  individual: boolean;
  canSeeAllAgendas: boolean;
  showingOwnAgenda: boolean;
}) {
  return !input.individual && input.canSeeAllAgendas && !input.showingOwnAgenda;
}

export function appointmentMoney(input: TodayMoneyInput): TodayMoney {
  if (REVENUE_EXCLUDED.has(input.status)) {
    return { due: 0, collected: 0, pending: 0, label: "none" };
  }

  const due = Math.max(0, Number(input.totalPrice ?? input.servicePrice ?? 0));
  const depositPaid = input.paymentStatus === "APPROVED" ? Math.max(0, input.depositAmount ?? 0) : 0;
  const recorded = depositPaid + Math.max(0, input.posPaidAmount) + Math.max(0, input.giftCardPaidAmount);

  if (input.settledAt) {
    return { due, collected: due, pending: 0, label: due > 0 ? "collected" : "none" };
  }

  const collected = Math.min(due, recorded);
  const pending = Math.max(0, due - collected);
  return { due, collected, pending, label: paymentLabel(input, due, collected) };
}

function paymentLabel(input: TodayMoneyInput, due: number, collected: number): TodayPaymentLabel {
  if (due <= 0) return "none";
  if (collected >= due) return "collected";
  if (input.status === "AWAITING_PAYMENT" || input.paymentStatus === "PENDING") {
    return collected > 0 ? "partial" : "pending";
  }
  if (collected > 0) return "partial";
  return "due";
}

export function countOpenSlots(opportunities: Pick<TodayOpportunityInput, "staffId" | "slotCount">[]) {
  const byStaff = new Map<string, number>();
  for (const opportunity of opportunities) {
    if (opportunity.slotCount <= 0) continue;
    byStaff.set(
      opportunity.staffId,
      Math.max(byStaff.get(opportunity.staffId) ?? 0, opportunity.slotCount),
    );
  }
  let total = 0;
  for (const count of byStaff.values()) total += count;
  return total;
}

export function buildStoryStudioHref(input: {
  locationId: string;
  staffId?: string | null;
  serviceId: string;
  date: string;
  objective: "LAST_MINUTE" | "CANCELLATION" | "FILL_SLOTS" | "PROMOTE_SERVICE";
}) {
  const query = new URLSearchParams();
  query.set("locationId", input.locationId);
  query.set("serviceId", input.serviceId);
  query.set("date", input.date);
  query.set("range", "CUSTOM");
  query.set("objective", input.objective);
  if (input.staffId) query.set("staffId", input.staffId);
  return `/dashboard/stories?${query.toString()}`;
}

function availabilityWhen(times: string[]): "afternoon" | "today" {
  const earliest = [...times].sort()[0];
  return earliest && earliest >= "12:00" ? "afternoon" : "today";
}

function needsPaymentAttention(appointment: TodayAppointmentInput, pending: number) {
  if (pending <= 0) return false;
  if (appointment.status === "AWAITING_PAYMENT" || appointment.paymentStatus === "PENDING") return true;
  return appointment.status === "CHECKED_IN" || appointment.status === "COMPLETED";
}

export function buildTodayModel(input: {
  now: Date;
  dateKey: string;
  appointments: TodayAppointmentInput[];
  pendingRecurring: number;
  canReviewRecurring: boolean;
  opportunities: TodayOpportunityInput[];
  allowSameDayBookings: boolean;
}) {
  const ordered = [...input.appointments].sort(
    (left, right) => left.startTime.getTime() - right.startTime.getTime() || left.id.localeCompare(right.id),
  );
  const current = ordered.find((appointment) => (
    OPEN_STATUSES.has(appointment.status) &&
    appointment.startTime.getTime() <= input.now.getTime() &&
    appointment.endTime.getTime() > input.now.getTime()
  ));
  const next = current ? undefined : ordered.find((appointment) => (
    OPEN_STATUSES.has(appointment.status) && appointment.startTime.getTime() > input.now.getTime()
  ));

  const rows = ordered.map((appointment) => {
    const money = appointmentMoney(appointment);
    let phase: TodayPhase = "past";
    if (REVENUE_EXCLUDED.has(appointment.status)) phase = "inactive";
    else if (current?.id === appointment.id) phase = "current";
    else if (next?.id === appointment.id) phase = "next";
    else if (OPEN_STATUSES.has(appointment.status) && appointment.startTime.getTime() > input.now.getTime()) phase = "upcoming";
    else if (appointment.endTime.getTime() > input.now.getTime() && OPEN_STATUSES.has(appointment.status)) phase = "upcoming";
    return { ...appointment, ...money, phase };
  });

  const totals = rows.reduce((sum, row) => ({
    collected: sum.collected + row.collected,
    pending: sum.pending + row.pending,
    projected: sum.projected + row.due,
  }), { collected: 0, pending: 0, projected: 0 });

  const todayOpportunities = input.allowSameDayBookings
    ? input.opportunities.filter((opportunity) => opportunity.date === input.dateKey && opportunity.slotCount > 0)
    : [];
  const openSlots = countOpenSlots(todayOpportunities);
  const best = todayOpportunities[0] ?? null;

  const paymentRows = rows.filter((row) => needsPaymentAttention(row, row.pending));
  const closeRows = ordered.filter((appointment) => (
    appointment.endTime.getTime() <= input.now.getTime() && CLOSE_STATUSES.has(appointment.status)
  ));
  const freedStaff = new Set(
    ordered
      .filter((appointment) => appointment.status === "CANCELLED" && appointment.endTime.getTime() > input.now.getTime() && appointment.staffId)
      .map((appointment) => appointment.staffId as string),
  );
  const freedOpportunity = todayOpportunities.find((opportunity) => freedStaff.has(opportunity.staffId));

  const attention: TodayAttentionItem[] = [];
  if (paymentRows.length > 0) {
    attention.push({
      id: "pending-payments",
      count: paymentRows.length,
      appointmentId: paymentRows[0].id,
      amount: paymentRows.reduce((sum, row) => sum + row.pending, 0),
    });
  }
  if (input.canReviewRecurring && input.pendingRecurring > 0) {
    attention.push({ id: "pending-recurring", count: input.pendingRecurring, href: "/dashboard/recurring" });
  }
  if (closeRows.length > 0) {
    attention.push({ id: "needs-close", count: closeRows.length, appointmentId: closeRows[0].id });
  }
  if (freedOpportunity) {
    attention.push({
      id: "freed-availability",
      count: freedStaff.size,
      when: availabilityWhen(freedOpportunity.times),
      href: buildStoryStudioHref({
        locationId: freedOpportunity.locationId,
        staffId: freedOpportunity.staffId,
        serviceId: freedOpportunity.serviceId,
        date: freedOpportunity.date,
        objective: "CANCELLATION",
      }),
    });
  }

  const story: TodayStoryCue | null = best ? {
    locationId: best.locationId,
    staffId: best.staffId,
    serviceId: best.serviceId,
    date: best.date,
    slotCount: openSlots,
    opportunityCount: best.slotCount,
    times: best.times.slice(0, 4),
    when: availabilityWhen(best.times),
    objective: freedOpportunity ? "CANCELLATION" : "LAST_MINUTE",
  } : null;

  const hasUpcoming = Boolean(current || next);
  const dayState: TodayDayState = ordered.length === 0 ? "empty" : hasUpcoming ? "active" : "finished";

  return {
    rows,
    totals,
    openSlots,
    attention,
    story,
    dayState,
    counts: {
      appointments: ordered.length,
      cancelled: ordered.filter((appointment) => appointment.status === "CANCELLED").length,
      completed: ordered.filter((appointment) => appointment.status === "COMPLETED").length,
      noShow: ordered.filter((appointment) => appointment.status === "NO_SHOW").length,
      pendingActions: new Set([...paymentRows.map((row) => row.id), ...closeRows.map((row) => row.id)]).size,
    },
  };
}
