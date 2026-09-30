import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import pg from "pg";

const mocks = vi.hoisted(() => ({ notify: vi.fn(), sync: vi.fn(), busy: vi.fn(), preference: vi.fn(), oauth: vi.fn() }));
vi.mock("@/server/email/send", () => ({ sendBookingNotifications: mocks.notify }));
vi.mock("@/server/services/google-calendar.service", () => ({ syncAppointmentToGoogle: mocks.sync, getGoogleCalendarBusySlots: mocks.busy }));
vi.mock("@/server/services/mercadopago-oauth.service", () => ({ getValidMercadoPagoAccessToken: mocks.oauth }));
vi.mock("mercadopago", () => ({ MercadoPagoConfig: class {}, Preference: class { create = mocks.preference; } }));
vi.mock("@/server/services/widget-promotion.service", () => ({ resolveWidgetPromotion: async () => ({ promotion: null, quote: null }) }));
vi.mock("@/server/services/client-portal.service", () => ({ getClientPortalAccountFromRequest: async () => null, getClientPortalEmailFromRequest: async () => null, updateClientPortalProfileFromBooking: async () => {} }));
vi.mock("@/server/lib/rate-limit", () => ({ bookingLimiter: { check: () => null }, rateLimit: () => ({ check: () => null }) }));

import { prisma } from "@/server/db/prisma";
import { POST } from "@/app/api/business/[slug]/book/route";
import { GET as catalog } from "@/app/api/business/[slug]/booking-catalog/route";
import { GET as availability } from "@/app/api/business/[slug]/availability/route";
import { GET as blocked } from "@/app/api/business/[slug]/appointments/route";
import { createAppointment } from "@/server/services/appointment.service";
import { bookingOperationContext, bookingPayloadHash, claimBookingOperation, BOOKING_LEASE_MS } from "@/server/booking/idempotency";
import { bookingSchema } from "@/server/validations/booking";

const url = process.env.PURAGENDA_BOOKING_TEST_DATABASE_URL;
const enabled = !!url && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)
  && new URL(url).pathname === "/puragenda_booking_api_test" && /^booking_api_test_\d+$/.test(new URL(url).searchParams.get("schema") ?? "");
const ctx = { params: Promise.resolve({ slug: "booking-fixture" }) };
const startTime = "2026-10-01T12:00:00.000Z";
const endTime = "2026-10-01T13:00:00.000Z";
const payload = { serviceId: "local-service", locationId: "local-location", staffId: "local-staff-a", selectedOptionAlternativeIds: ["local-option"],
  customerName: "Fixture Client", customerEmail: "fixture@example.invalid", customerPhone: "+56911111111", startTime, endTime };
function post(data: Record<string, unknown> = payload, key: string | null = "fixture-operation-key", apiKey = "fixture-api-key", v1 = true) {
  return new NextRequest("http://localhost/api/business/booking-fixture/book", { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey,
    ...(key ? { "Idempotency-Key": key } : {}), ...(v1 ? { "Puragenda-Booking-Version": "1" } : {}) }, body: JSON.stringify(data) });
}
function read(query = "") {
  return new NextRequest(`http://localhost/api/business/booking-fixture/availability${query}`, { headers: { "x-api-key": "fixture-api-key" } });
}

describe.skipIf(!enabled)("booking API with isolated local PostgreSQL", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date());
    mocks.notify.mockResolvedValue(undefined); mocks.sync.mockResolvedValue({ synced: true }); mocks.busy.mockResolvedValue([]);
    mocks.oauth.mockResolvedValue(null); mocks.preference.mockResolvedValue({ id: "preference-fixture", init_point: "https://payments.example.invalid/fixture" });
    await prisma.business.deleteMany({ where: { id: { in: ["local-business", "foreign-business"] } } });
    await prisma.business.create({ data: { id: "local-business", name: "Local Fixture", slug: "booking-fixture", apiKey: "fixture-api-key", slotInterval: 30, allowSameDayBookings: true,
      subscription: { create: { plan: "EQUIPO", status: "ACTIVE" } },
      locations: { create: { id: "local-location", slug: "principal", name: "Principal", timezone: "America/Santiago", isPrimary: true, isActive: true,
        hours: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "18:00", isOpen: true, breakStart: "13:00", breakEnd: "14:00" })) } } },
    } });
    await prisma.service.create({ data: { id: "local-service", businessId: "local-business", name: "Fixture Service", price: 20000, duration: 60, depositAmount: 5000, depositPaymentUrl: "https://payments.example.invalid/manual",
      locations: { create: { locationId: "local-location" } },
      optionCategories: { create: { id: "local-category", name: "Formato", isRequired: true, maxSelections: 1,
        alternatives: { create: [{ id: "local-option", name: "Local" }, { id: "local-home-option", name: "Domicilio", durationDelta: 30, priceDelta: 5000, isHomeService: true }] } } },
    } });
    for (const id of ["local-staff-a", "local-staff-b"]) await prisma.staff.create({ data: { id, name: id, businessId: "local-business", services: { connect: { id: "local-service" } }, locations: { create: { locationId: "local-location" } } } });
  });
  afterEach(() => vi.useRealTimers());
  afterAll(async () => { await prisma.$disconnect(); });

  it("reserves through the existing service and replays after a lost HTTP response without effects", async () => {
    const first = await POST(post(), ctx);
    expect(first.status).toBe(201);
    const result = await first.json();
    expect(result).toMatchObject({ status: "PENDING", depositRequired: false, booking: { state: "pending", price: 20000, duration: 60, currency: "CLP" } });
    expect(result).not.toHaveProperty("customerEmail"); expect(result).not.toHaveProperty("service");
    const replay = await POST(post({ ...payload, customerEmail: "FIXTURE@EXAMPLE.INVALID", startTime: "2026-10-01T12:00:00Z", serviceIds: ["local-service"] }), ctx);
    expect(replay.status).toBe(201); expect(await replay.json()).toEqual(result);
    expect(await prisma.appointment.count()).toBe(1); expect(mocks.notify).toHaveBeenCalledTimes(1); expect(mocks.sync).toHaveBeenCalledTimes(1);
  });
  it("rejects a changed payload on the same business key", async () => {
    expect((await POST(post(), ctx)).status).toBe(201);
    const response = await POST(post({ ...payload, customerName: "Changed Customer" }), ctx);
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ code: "IDEMPOTENCY_PAYLOAD_CONFLICT" });
    expect(await prisma.appointment.count()).toBe(1);
  });
  it("serializes concurrent identical keys and returns one operation", async () => {
    const responses = await Promise.all([POST(post(), ctx), POST(post(), ctx)]);
    expect(responses.some((response) => response.status === 201)).toBe(true);
    expect(responses.every((response) => [201, 409].includes(response.status))).toBe(true);
    expect(await prisma.appointment.count()).toBe(1); expect(mocks.notify).toHaveBeenCalledTimes(1);
  });
  it("has exactly one winner for concurrent capacity requests with different keys", async () => {
    const responses = await Promise.all([POST(post(payload, "different-key-one"), ctx), POST(post(payload, "different-key-two"), ctx)]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.appointment.count()).toBe(1);
    const loser = responses.find((response) => response.status === 409)!;
    expect(await loser.json()).toMatchObject({ code: "SLOT_CONFLICT" });
  });
  it("rechecks capacity when an advertised slot becomes occupied", async () => {
    const query = "?date=2026-10-01&serviceId=local-service&staffId=local-staff-a&selectedOptionAlternativeIds=local-option";
    const offered = await (await availability(read(query), ctx)).json();
    expect(offered.slots.some((slot: { startTime: string }) => slot.startTime === startTime)).toBe(true);
    await createAppointment({ ...payload, businessId: "local-business", startTime: new Date(startTime), endTime: new Date(endTime) }, { syncGoogle: false });
    const response = await POST(post(), ctx);
    expect(response.status).toBe(409); expect(JSON.stringify(await response.json())).not.toContain("Fixture Client");
  });
  it("protects even direct database writers and permits distinct staff capacity", async () => {
    const connection = new pg.Pool({ connectionString: url });
    const schema = new URL(url!).searchParams.get("schema")!;
    const sql = `INSERT INTO "${schema}"."Appointment" (id,"businessId","locationId","serviceId","staffId","customerName","customerEmail","customerPhone","startTime","endTime","updatedAt") VALUES ($1,'local-business','local-location','local-service',$2,'Fixture','fixture@example.invalid','12345678',$3,$4,CURRENT_TIMESTAMP)`;
    try {
      const results = await Promise.allSettled([connection.query(sql, ["direct-a", "local-staff-a", startTime, endTime]), connection.query(sql, ["direct-b", "local-staff-a", startTime, endTime])]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect((results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason.code).toBe("23P01");
      await expect(connection.query(sql, ["direct-c", "local-staff-b", startTime, endTime])).resolves.toMatchObject({ rowCount: 1 });
    } finally { await connection.end(); }
  });
  it("business plan capacity is shared even when legacy writers attach a staff ID", async () => {
    await prisma.subscription.update({ where: { businessId: "local-business" }, data: { plan: "INDIVIDUAL" } });
    const responses = await Promise.all([POST(post({ ...payload, staffId: undefined }, "business-plan-key"), ctx), createAppointment({ ...payload, businessId: "local-business", startTime: new Date(startTime), endTime: new Date(endTime) }, { syncGoogle: false })]);
    expect(await prisma.appointment.count()).toBe(1);
    const output = await (await catalog(read(), ctx)).json();
    expect(output.staff).toEqual([]); expect(output.rules.staffSelection).toBe("NONE");
    expect(responses).toHaveLength(2);
  });
  it("required options, maxima, unknown options, endTime and home address are validated server-side", async () => {
    for (const changes of [
      { selectedOptionAlternativeIds: [] }, { selectedOptionAlternativeIds: ["local-option", "local-home-option"] },
      { selectedOptionAlternativeIds: ["foreign-option"] }, { endTime: "2026-10-01T13:30:00.000Z" },
      { selectedOptionAlternativeIds: ["local-home-option"], endTime: "2026-10-01T13:30:00.000Z" },
    ]) expect((await POST(post({ ...payload, ...changes }, null), ctx)).status).toBe(400);
    expect(await prisma.appointment.count()).toBe(0);
    const response = await POST(post({ ...payload, selectedOptionAlternativeIds: ["local-home-option"], endTime: "2026-10-01T13:30:00.000Z", customerAddress: "Fixture address", price: 1, duration: 1 }), ctx);
    expect(response.status).toBe(201); expect(await response.json()).toMatchObject({ booking: { price: 25000, duration: 90 } });
  });
  it("isolates other business keys and foreign IDs before creation", async () => {
    await prisma.business.create({ data: { id: "foreign-business", slug: "foreign-fixture", name: "Foreign", apiKey: "foreign-key",
      locations: { create: { id: "foreign-location", slug: "foreign", name: "Foreign", timezone: "America/Santiago", isActive: true } },
      services: { create: { id: "foreign-service", name: "Foreign", duration: 60, price: 1 } },
      staff: { create: { id: "foreign-staff", name: "Foreign" } },
    } });
    expect((await POST(post(payload, "foreign-key-test", "foreign-key"), ctx)).status).toBe(401);
    for (const change of [{ serviceId: "foreign-service" }, { staffId: "foreign-staff" }, { locationId: "foreign-location" }]) {
      expect([400, 404]).toContain((await POST(post({ ...payload, ...change }, null), ctx)).status);
    }
    expect(await prisma.appointment.count()).toBe(0);
  });
  it("filters production and recurring services from the catalog", async () => {
    await prisma.service.create({ data: { businessId: "local-business", name: "Production", bookingMode: "PRODUCTION", price: 1, duration: 60, locations: { create: { locationId: "local-location" } } } });
    await prisma.service.create({ data: { businessId: "local-business", name: "Recurring", price: 1, duration: 60, recurringPlan: { create: {} }, locations: { create: { locationId: "local-location" } } } });
    const result = await (await catalog(read(), ctx)).json();
    expect(result.services.map((item: { id: string }) => item.id)).toEqual(["local-service"]);
  });
  it("legacy widget gets the same blocked day and its old unversioned response", async () => {
    const response = await POST(post(payload, null, "fixture-api-key", false), ctx);
    expect(response.status).toBe(201); expect(await response.json()).toHaveProperty("feedbackToken");
    const ranges = await (await blocked(read("?date=2026-10-01&staffId=local-staff-a"), ctx)).json();
    expect(ranges).toEqual([{ startTime, endTime }]);
    await prisma.blockedDate.create({ data: { businessId: "local-business", date: new Date("2026-10-02T00:00:00Z"), reason: "Private reason" } });
    const closed = await (await blocked(read("?date=2026-10-02"), ctx)).json();
    expect(closed).toHaveLength(1); expect(JSON.stringify(closed)).not.toContain("Private reason");
  });
  it("pending and awaiting-payment bookings block capacity until cancelled", async () => {
    await prisma.business.update({ where: { id: "local-business" }, data: { depositRequired: true, depositPaymentMode: "MANUAL_LINK" } });
    const response = await POST(post(), ctx);
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result).toMatchObject({ status: "AWAITING_PAYMENT", depositRequired: true, booking: { state: "awaiting_payment", depositAmount: 5000, currency: "CLP" } });
    expect(result.paymentUrl).toContain("/cita/"); expect(mocks.notify).not.toHaveBeenCalled();
    expect((await POST(post(payload, "other-deposit-key"), ctx)).status).toBe(409);
    await prisma.appointment.update({ where: { id: result.id }, data: { status: "CANCELLED" } });
    expect((await POST(post(payload, "cancelled-slot-new-key"), ctx)).status).toBe(201);
  });
  it("creates one simulated payment preference and no initial notifications for deposits", async () => {
    await prisma.business.update({ where: { id: "local-business" }, data: { depositRequired: true, depositPaymentMode: "MERCADOPAGO", mpAccessToken: "fixture-provider-token" } });
    mocks.oauth.mockResolvedValue("fixture-provider-token");
    const response = await POST(post(), ctx); expect(response.status).toBe(201);
    const result = await response.json(); expect(result.paymentUrl).toBe("https://payments.example.invalid/fixture");
    expect((await POST(post(), ctx)).status).toBe(201); expect(mocks.preference).toHaveBeenCalledTimes(1); expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("recovers an interrupted committed operation without another appointment, payment or email", async () => {
    mocks.notify.mockRejectedValueOnce(new Error("simulated process interruption"));
    expect((await POST(post(), ctx)).status).toBe(500);
    vi.setSystemTime(Date.now() + BOOKING_LEASE_MS + 1);
    const recovery = await POST(post(), ctx);
    expect(recovery.status).toBe(202);
    const result = await recovery.json(); expect(result).toMatchObject({ operationStatus: "RECOVERY_REQUIRED", booking: { state: "pending" } });
    expect(await prisma.appointment.count()).toBe(1); expect(mocks.notify).toHaveBeenCalledTimes(1); expect(mocks.sync).toHaveBeenCalledTimes(1);
  });
  it("stores a known payment failure and never creates its preference twice", async () => {
    await prisma.business.update({ where: { id: "local-business" }, data: { depositRequired: true, depositPaymentMode: "MERCADOPAGO" } });
    mocks.oauth.mockResolvedValue("fixture-provider-token"); mocks.preference.mockRejectedValueOnce(new Error("simulated provider failure"));
    const first = await POST(post(), ctx); expect(first.status).toBe(502);
    expect(await first.json()).toMatchObject({ code: "PAYMENT_LINK_FAILED" });
    const replay = await POST(post(), ctx); expect(replay.status).toBe(502);
    expect(await prisma.appointment.findFirst()).toMatchObject({ status: "CANCELLED", paymentStatus: "REJECTED" });
    expect(mocks.preference).toHaveBeenCalledTimes(1); expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("revalidates the canonical selection at transactional write time", async () => {
    mocks.busy.mockImplementationOnce(async () => [])
      .mockImplementationOnce(async () => { await prisma.service.update({ where: { id: "local-service" }, data: { price: 23000 } }); return []; });
    const result = await POST(post(), ctx);
    expect(result.status).toBe(409); expect(await result.json()).toMatchObject({ code: "SELECTION_CHANGED" });
    expect(await prisma.appointment.count()).toBe(0);
  });
  it("reclaims a pre-write crash, fences the old worker and keeps expiration tombstones", async () => {
    const parsed = bookingSchema.parse(payload);
    const original = await claimBookingOperation("local-business", "lease-reclaim-key", bookingPayloadHash(parsed));
    vi.setSystemTime(Date.now() + BOOKING_LEASE_MS + 1);
    const recovered = await claimBookingOperation("local-business", "lease-reclaim-key", bookingPayloadHash(parsed));
    expect(recovered.operation.ownerToken).not.toBe(original.operation.ownerToken);
    await expect(bookingOperationContext.run({ id: original.operation.id, ownerToken: original.operation.ownerToken, currency: "CLP" }, () => createAppointment({ ...payload, businessId: "local-business", startTime: new Date(startTime), endTime: new Date(endTime) }, { syncGoogle: false }))).rejects.toMatchObject({ code: "BOOKING_IN_PROGRESS" });
    await prisma.bookingOperation.update({ where: { id: recovered.operation.id }, data: { expiresAt: new Date(0) } });
    await expect(claimBookingOperation("local-business", "lease-reclaim-key", bookingPayloadHash(parsed))).rejects.toMatchObject({ code: "IDEMPOTENCY_EXPIRED" });
  });
  it("rejects malformed JSON and excessive streamed bodies", async () => {
    for (const [body, status] of [["{", 400], ["x".repeat(32769), 413]] as const) {
      const response = await POST(new NextRequest("http://localhost/api/business/booking-fixture/book", { method: "POST", headers: { "Puragenda-Booking-Version": "1" }, body }), ctx);
      expect(response.status).toBe(status);
    }
  });
  it("never reexecutes an interrupted operation after legacy physical appointment deletion", async () => {
    mocks.notify.mockRejectedValueOnce(new Error("simulated interruption"));
    expect((await POST(post(), ctx)).status).toBe(500);
    const appointment = await prisma.appointment.findFirstOrThrow();
    await prisma.appointment.delete({ where: { id: appointment.id } });
    vi.setSystemTime(Date.now() + BOOKING_LEASE_MS + 1);
    const replay = await POST(post(), ctx);
    expect(replay.status).toBe(202); expect(await replay.json()).toMatchObject({ id: appointment.id });
    expect(await prisma.appointment.count()).toBe(0); expect(mocks.notify).toHaveBeenCalledTimes(1);
  });
});
