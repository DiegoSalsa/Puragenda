import { describe, expect, it } from "vitest";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import {
  appointmentMoney,
  buildStoryStudioHref,
  buildTodayModel,
  canSeeTodayMoney,
  isOnLocationDay,
  locationDayWindow,
  resolveAgendaStaffFilter,
  resolveLocationFilter,
  shouldShowProfessional,
  type TodayAppointmentInput,
  type TodayOpportunityInput,
} from "@/lib/today-dashboard";

const NOW = new Date("2026-09-25T15:00:00.000Z");

function appointment(overrides: Partial<TodayAppointmentInput> = {}): TodayAppointmentInput {
  return {
    id: "apt-1",
    status: "CONFIRMED",
    paymentStatus: "NONE",
    depositAmount: null,
    totalPrice: 20000,
    servicePrice: 20000,
    posPaidAmount: 0,
    giftCardPaidAmount: 0,
    settledAt: null,
    startTime: new Date("2026-09-25T16:00:00.000Z"),
    endTime: new Date("2026-09-25T17:00:00.000Z"),
    staffId: "staff-1",
    ...overrides,
  };
}

function opportunity(overrides: Partial<TodayOpportunityInput> = {}): TodayOpportunityInput {
  return {
    locationId: "loc-1",
    staffId: "staff-1",
    serviceId: "svc-1",
    date: "2026-09-25",
    slotCount: 3,
    times: ["15:00", "16:00", "17:30"],
    ...overrides,
  };
}

describe("location day boundaries", () => {
  it("keeps Chile on the previous local day when UTC has already rolled over", () => {
    const now = new Date("2026-09-26T00:30:00.000Z");
    const visit = new Date("2026-09-25T23:30:00.000Z");

    expect(locationDayWindow(now, "UTC").dateKey).toBe("2026-09-26");
    expect(locationDayWindow(now, "America/Santiago").dateKey).toBe("2026-09-25");
    expect(isOnLocationDay(visit, now, "UTC")).toBe(false);
    expect(isOnLocationDay(visit, now, "America/Santiago")).toBe(true);
  });

  it("moves to the next Santiago day exactly at local midnight", () => {
    const beforeMidnight = new Date("2026-09-25T02:30:00.000Z");
    const afterMidnight = new Date("2026-09-25T03:30:00.000Z");

    expect(locationDayWindow(beforeMidnight, "America/Santiago").dateKey).toBe("2026-09-24");
    expect(locationDayWindow(afterMidnight, "America/Santiago").dateKey).toBe("2026-09-25");
    expect(locationDayWindow(afterMidnight, "America/Santiago").start.toISOString()).toBe("2026-09-25T03:00:00.000Z");
    expect(locationDayWindow(afterMidnight, "America/Santiago").end.toISOString()).toBe("2026-09-26T03:00:00.000Z");
  });

  it("uses the location offset in standard time, not the server clock", () => {
    const now = new Date("2026-08-04T02:30:00.000Z");
    const window = locationDayWindow(now, "America/Santiago");

    expect(window.dateKey).toBe("2026-08-03");
    expect(window.start.toISOString()).toBe("2026-08-03T04:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-04T04:00:00.000Z");
    expect(isOnLocationDay(new Date("2026-08-04T03:30:00.000Z"), now, "America/Santiago")).toBe(true);
    expect(isOnLocationDay(new Date("2026-08-04T04:30:00.000Z"), now, "America/Santiago")).toBe(false);
  });
});

describe("agenda scope", () => {
  const team = { canSeeAllAgendas: true, staffId: null, ownStaffId: "staff-own" };
  const ownOnly = { canSeeAllAgendas: false, staffId: "staff-own", ownStaffId: "staff-own" };

  it("separates a team member's own agenda from the whole business", () => {
    expect(resolveAgendaStaffFilter(team, false)).toEqual({});
    expect(resolveAgendaStaffFilter(team, true)).toEqual({ staffId: "staff-own" });
    expect(resolveAgendaStaffFilter(ownOnly, false)).toEqual({ staffId: "staff-own" });
  });

  it("does not grant another professional's agenda when the user has no staff id", () => {
    expect(resolveAgendaStaffFilter({ canSeeAllAgendas: false, staffId: null, ownStaffId: null }, false))
      .toEqual({ staffId: "__no_staff_access__" });
  });

  it("keeps the primary location compatible with unassigned appointments and isolates the others", () => {
    expect(resolveLocationFilter({ id: "primary", isPrimary: true }, 2)).toEqual({
      OR: [{ locationId: "primary" }, { locationId: null }],
    });
    expect(resolveLocationFilter({ id: "secondary", isPrimary: false }, 2)).toEqual({ locationId: "secondary" });
    expect(resolveLocationFilter({ id: "only", isPrimary: false }, 1)).toEqual({
      OR: [{ locationId: "only" }, { locationId: null }],
    });
  });

  it("hides business-wide money from someone who can only see their own analytics", () => {
    const own = [DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN, DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL];
    expect(canSeeTodayMoney({ canSeeAllAgendas: true, showingOwnAgenda: false, permissions: own })).toBe(false);
    expect(canSeeTodayMoney({ canSeeAllAgendas: true, showingOwnAgenda: true, permissions: own })).toBe(true);
    expect(canSeeTodayMoney({
      canSeeAllAgendas: false,
      showingOwnAgenda: false,
      permissions: [DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN],
    })).toBe(false);
    expect(canSeeTodayMoney({
      canSeeAllAgendas: true,
      showingOwnAgenda: false,
      permissions: [DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS],
    })).toBe(true);
  });

  it("shows the professional only on a team-wide agenda", () => {
    expect(shouldShowProfessional({ individual: true, canSeeAllAgendas: true, showingOwnAgenda: false })).toBe(false);
    expect(shouldShowProfessional({ individual: false, canSeeAllAgendas: true, showingOwnAgenda: false })).toBe(true);
    expect(shouldShowProfessional({ individual: false, canSeeAllAgendas: true, showingOwnAgenda: true })).toBe(false);
    expect(shouldShowProfessional({ individual: false, canSeeAllAgendas: false, showingOwnAgenda: false })).toBe(false);
  });
});

describe("appointment money", () => {
  it("does not treat a projected price as collected", () => {
    expect(appointmentMoney(appointment())).toMatchObject({ collected: 0, pending: 20000, due: 20000, label: "due" });
  });

  it("counts an approved deposit, POS payment and gift card without exceeding the amount due", () => {
    expect(appointmentMoney(appointment({
      paymentStatus: "APPROVED",
      depositAmount: 5000,
      posPaidAmount: 7000,
      giftCardPaidAmount: 2000,
    }))).toMatchObject({ collected: 14000, pending: 6000, label: "partial" });
  });

  it("ignores a deposit that is still pending", () => {
    expect(appointmentMoney(appointment({
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      depositAmount: 5000,
    }))).toMatchObject({ collected: 0, pending: 20000, label: "pending" });
  });

  it("treats a settlement as the recorded collection, not as a second payment", () => {
    expect(appointmentMoney(appointment({
      status: "COMPLETED",
      paymentStatus: "APPROVED",
      depositAmount: 5000,
      totalPrice: 22000,
      settledAt: NOW,
    }))).toMatchObject({ collected: 22000, pending: 0, label: "collected" });
  });

  it("drops cancelled and no-show visits from revenue", () => {
    expect(appointmentMoney(appointment({
      status: "CANCELLED",
      paymentStatus: "APPROVED",
      depositAmount: 5000,
    }))).toEqual({ due: 0, collected: 0, pending: 0, label: "none" });
    expect(appointmentMoney(appointment({ status: "NO_SHOW", totalPrice: 18000 }))).toMatchObject({
      collected: 0,
      pending: 0,
    });
  });
});

describe("today model", () => {
  it("describes an empty day without attention noise", () => {
    const model = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [],
      pendingRecurring: 0,
      canReviewRecurring: true,
      opportunities: [],
      allowSameDayBookings: true,
    });

    expect(model.dayState).toBe("empty");
    expect(model.attention).toEqual([]);
    expect(model.story).toBeNull();
    expect(model.counts.appointments).toBe(0);
  });

  it("orders several visits and distinguishes the current one from the next", () => {
    const model = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [
        appointment({ id: "later", startTime: new Date("2026-09-25T18:00:00.000Z"), endTime: new Date("2026-09-25T19:00:00.000Z") }),
        appointment({ id: "current", startTime: new Date("2026-09-25T14:30:00.000Z"), endTime: new Date("2026-09-25T15:30:00.000Z") }),
        appointment({ id: "past", status: "COMPLETED", startTime: new Date("2026-09-25T12:00:00.000Z"), endTime: new Date("2026-09-25T13:00:00.000Z"), settledAt: NOW }),
        appointment({ id: "next", startTime: new Date("2026-09-25T16:00:00.000Z"), endTime: new Date("2026-09-25T17:00:00.000Z") }),
      ],
      pendingRecurring: 0,
      canReviewRecurring: false,
      opportunities: [],
      allowSameDayBookings: true,
    });

    expect(model.rows.map((row) => row.id)).toEqual(["past", "current", "next", "later"]);
    expect(model.rows.map((row) => row.phase)).toEqual(["past", "current", "upcoming", "upcoming"]);
    expect(model.dayState).toBe("active");
  });

  it("marks the earliest upcoming visit as next when nothing is in progress", () => {
    const model = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [
        appointment({ id: "second", startTime: new Date("2026-09-25T18:00:00.000Z"), endTime: new Date("2026-09-25T19:00:00.000Z") }),
        appointment({ id: "first", startTime: new Date("2026-09-25T16:00:00.000Z"), endTime: new Date("2026-09-25T17:00:00.000Z") }),
      ],
      pendingRecurring: 0,
      canReviewRecurring: false,
      opportunities: [],
      allowSameDayBookings: false,
    });

    expect(model.rows.find((row) => row.id === "first")?.phase).toBe("next");
    expect(model.rows.find((row) => row.id === "second")?.phase).toBe("upcoming");
  });

  it("summarises a finished day without turning cancelled visits into revenue", () => {
    const model = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [
        appointment({ id: "done", status: "COMPLETED", settledAt: NOW, startTime: new Date("2026-09-25T12:00:00.000Z"), endTime: new Date("2026-09-25T13:00:00.000Z"), totalPrice: 10000 }),
        appointment({ id: "missed", status: "NO_SHOW", startTime: new Date("2026-09-25T13:00:00.000Z"), endTime: new Date("2026-09-25T14:00:00.000Z"), totalPrice: 8000 }),
        appointment({ id: "cancelled", status: "CANCELLED", startTime: new Date("2026-09-25T14:00:00.000Z"), endTime: new Date("2026-09-25T14:30:00.000Z"), paymentStatus: "APPROVED", depositAmount: 3000 }),
      ],
      pendingRecurring: 0,
      canReviewRecurring: true,
      opportunities: [],
      allowSameDayBookings: true,
    });

    expect(model.dayState).toBe("finished");
    expect(model.counts).toMatchObject({ completed: 1, cancelled: 1, noShow: 1 });
    expect(model.totals).toMatchObject({ collected: 10000, pending: 0, projected: 10000 });
  });

  it("groups pending collections, open visits and recurring requests", () => {
    const model = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [
        appointment({ id: "deposit", status: "AWAITING_PAYMENT", paymentStatus: "PENDING", depositAmount: 4000 }),
        appointment({ id: "deposit-2", status: "AWAITING_PAYMENT", paymentStatus: "PENDING", depositAmount: 4000, startTime: new Date("2026-09-25T19:00:00.000Z"), endTime: new Date("2026-09-25T20:00:00.000Z") }),
        appointment({ id: "unclosed", status: "CONFIRMED", startTime: new Date("2026-09-25T12:00:00.000Z"), endTime: new Date("2026-09-25T13:00:00.000Z") }),
        appointment({ id: "checked", status: "CHECKED_IN", startTime: new Date("2026-09-25T13:00:00.000Z"), endTime: new Date("2026-09-25T14:00:00.000Z") }),
      ],
      pendingRecurring: 1,
      canReviewRecurring: true,
      opportunities: [],
      allowSameDayBookings: true,
    });

    expect(model.attention.map((item) => [item.id, item.count])).toEqual([
      ["pending-payments", 3],
      ["pending-recurring", 1],
      ["needs-close", 2],
    ]);
    expect(model.attention.find((item) => item.id === "pending-payments")?.appointmentId).toBe("checked");
    expect(model.attention.find((item) => item.id === "needs-close")?.appointmentId).toBe("unclosed");
  });

  it("does not surface recurring approvals without permission", () => {
    const model = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [],
      pendingRecurring: 4,
      canReviewRecurring: false,
      opportunities: [opportunity()],
      allowSameDayBookings: true,
    });

    expect(model.attention.some((item) => item.id === "pending-recurring")).toBe(false);
  });

  it("offers a story only when same-day bookable slots exist", () => {
    const withSlots = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [appointment()],
      pendingRecurring: 0,
      canReviewRecurring: false,
      opportunities: [opportunity({ times: ["16:30"] })],
      allowSameDayBookings: true,
    });
    const hidden = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [appointment()],
      pendingRecurring: 0,
      canReviewRecurring: false,
      opportunities: [opportunity()],
      allowSameDayBookings: false,
    });

    expect(withSlots.story).toMatchObject({ objective: "LAST_MINUTE", when: "afternoon", slotCount: 3 });
    expect(withSlots.openSlots).toBe(3);
    expect(hidden.story).toBeNull();
    expect(hidden.openSlots).toBe(0);
    expect(buildStoryStudioHref({
      locationId: withSlots.story!.locationId,
      staffId: withSlots.story!.staffId,
      serviceId: withSlots.story!.serviceId,
      date: withSlots.story!.date,
      objective: withSlots.story!.objective,
    })).toBe("/dashboard/stories?locationId=loc-1&serviceId=svc-1&date=2026-09-25&range=CUSTOM&objective=LAST_MINUTE&staffId=staff-1");
  });

  it("does not count the same professional twice across services", () => {
    const model = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [],
      pendingRecurring: 0,
      canReviewRecurring: false,
      opportunities: [
        opportunity({ serviceId: "cut", slotCount: 2, times: ["10:00"] }),
        opportunity({ serviceId: "color", slotCount: 4, times: ["10:00"] }),
        opportunity({ staffId: "staff-2", slotCount: 1, times: ["18:00"] }),
      ],
      allowSameDayBookings: true,
    });

    expect(model.openSlots).toBe(5);
    expect(model.story?.when).toBe("today");
  });

  it("links a future cancellation to availability only for that professional", () => {
    const matched = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [appointment({
        id: "cancelled",
        status: "CANCELLED",
        staffId: "staff-1",
        startTime: new Date("2026-09-25T18:00:00.000Z"),
        endTime: new Date("2026-09-25T19:00:00.000Z"),
      })],
      pendingRecurring: 0,
      canReviewRecurring: false,
      opportunities: [opportunity({ times: ["18:00"] })],
      allowSameDayBookings: true,
    });
    const otherProfessional = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [appointment({ id: "cancelled", status: "CANCELLED", staffId: "staff-9", endTime: new Date("2026-09-25T19:00:00.000Z") })],
      pendingRecurring: 0,
      canReviewRecurring: false,
      opportunities: [opportunity()],
      allowSameDayBookings: true,
    });
    const alreadyPassed = buildTodayModel({
      now: NOW,
      dateKey: "2026-09-25",
      appointments: [appointment({
        id: "cancelled",
        status: "CANCELLED",
        startTime: new Date("2026-09-25T12:00:00.000Z"),
        endTime: new Date("2026-09-25T13:00:00.000Z"),
      })],
      pendingRecurring: 0,
      canReviewRecurring: false,
      opportunities: [opportunity()],
      allowSameDayBookings: true,
    });

    expect(matched.attention.find((item) => item.id === "freed-availability")?.href).toContain("staffId=staff-1");
    expect(matched.attention.find((item) => item.id === "freed-availability")?.href).toContain("objective=CANCELLATION");
    expect(matched.story?.objective).toBe("CANCELLATION");
    expect(otherProfessional.attention.some((item) => item.id === "freed-availability")).toBe(false);
    expect(alreadyPassed.attention.some((item) => item.id === "freed-availability")).toBe(false);
  });
});
