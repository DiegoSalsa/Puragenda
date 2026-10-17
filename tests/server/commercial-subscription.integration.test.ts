import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({ business: { id: "", ownerId: "", name: "Cinnamon Nails fixture", slug: "fixture", locale: "es" } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: vi.fn(async () => ({ id: context.business.ownerId, role: "ADMIN" })) }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn(async () => context.business), getStaffAgendaScope: vi.fn() }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: vi.fn(async () => true) }));
vi.mock("@/server/email/send", () => ({ sendStaffInviteEmail: vi.fn(async () => true), sendTrialExpiredEmail: vi.fn(async () => true), sendTrialExpiringEmail: vi.fn(async () => true) }));
vi.mock("@/server/services/subscription-dunning.service", () => ({ runBillingReconciliation: vi.fn(async () => ({})) }));

const databaseUrl = process.env.COMMERCIAL_SUBSCRIPTION_TEST_DATABASE_URL;
const localSuite = describe.skipIf(!databaseUrl);
let db: typeof import("@/server/db/prisma").prisma;
let actions: typeof import("@/server/actions/dashboard.actions");
let capacity: typeof import("@/server/services/staff-capacity.service");
let commercial: typeof import("@/server/services/commercial-subscription.service");
let staffService: typeof import("@/server/services/staff.service");
let expiry: typeof import("@/app/api/cron/trial-expiry/route");
let prefix = "";
let ownerId = "";
let initialStaffId = "";
let initialServiceId = "";
const paidThrough = new Date("2099-11-17T03:00:00.000Z");

localSuite("commercial subscriptions with real local PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !url.pathname.includes("cinnamon_qa")) {
      throw new Error("Integration tests require a disposable local cinnamon_qa database");
    }
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("CRON_SECRET", "commercial-local-test-only");
    db = (await import("@/server/db/prisma")).prisma;
    actions = await import("@/server/actions/dashboard.actions");
    capacity = await import("@/server/services/staff-capacity.service");
    commercial = await import("@/server/services/commercial-subscription.service");
    staffService = await import("@/server/services/staff.service");
    expiry = await import("@/app/api/cron/trial-expiry/route");
  });

  beforeEach(async () => {
    prefix = `commercial-${randomUUID()}`;
    const owner = await db.user.create({ data: { email: `owner@${prefix}.invalid`, name: "Owner", password: "local-fixture-only", role: "ADMIN" } });
    ownerId = owner.id;
    const business = await db.business.create({ data: { id: prefix, name: "Cinnamon Nails fixture", slug: prefix, apiKey: prefix, ownerId, countryCode: "CL", currencyCode: "CLP", timezone: "America/Santiago" } });
    context.business = { ...context.business, id: business.id, ownerId, slug: business.slug };
    await db.subscription.create({ data: { businessId: business.id, plan: "INDIVIDUAL", status: "ACTIVE", billingCycle: "MONTHLY", isTrial: false, currentPeriodEnd: paidThrough } });
    const service = await db.service.create({ data: { businessId: business.id, name: "Manicure", duration: 60, price: 20000 } });
    initialServiceId = service.id;
    const professional = await db.staff.create({ data: { businessId: business.id, name: "Owner professional", userId: ownerId, services: { connect: { id: service.id } } } });
    initialStaffId = professional.id;
    await db.businessHours.create({ data: { businessId: business.id, dayOfWeek: 1, startTime: "09:00", endTime: "18:00" } });
    await db.staffSchedule.create({ data: { staffId: professional.id, dayOfWeek: 1, startTime: "10:00", endTime: "17:00" } });
    const client = await db.client.create({ data: { businessId: business.id, name: "Existing client", email: `client@${prefix}.invalid` } });
    await db.appointment.create({ data: { businessId: business.id, serviceId: service.id, staffId: professional.id, clientId: client.id, customerName: client.name, customerEmail: client.email, startTime: new Date("2099-10-20T12:00:00Z"), endTime: new Date("2099-10-20T13:00:00Z"), status: "CONFIRMED" } });
  });

  afterEach(async () => {
    if (!db || !ownerId) return;
    await db.business.deleteMany({ where: { ownerId } });
    await db.user.deleteMany({ where: { email: { endsWith: `@${prefix}.invalid` } } });
  });
  afterAll(async () => { if (db) await db.$disconnect(); vi.unstubAllEnvs(); });

  function configure(apply = true) {
    return commercial.configureManualTeamSubscription({ businessId: prefix, staffLimit: 2, monthlyPriceClp: 17990 }, apply);
  }
  function createInput(label: string) { return { name: label, email: `${label}@${prefix}.invalid`, serviceIds: [initialServiceId] }; }
  async function snapshotOperations() {
    return {
      business: await db.business.findUnique({ where: { id: prefix } }),
      staff: await db.staff.findMany({ where: { businessId: prefix }, include: { schedule: true, services: true } }),
      clients: await db.client.findMany({ where: { businessId: prefix } }),
      appointments: await db.appointment.findMany({ where: { businessId: prefix } }),
      hours: await db.businessHours.findMany({ where: { businessId: prefix } }),
    };
  }

  it("previews without writes and applies only the four commercial fields", async () => {
    const operational = await snapshotOperations();
    const before = await db.subscription.findUniqueOrThrow({ where: { businessId: prefix } });
    expect(await configure(false)).toMatchObject({ applied: false, blockers: [] });
    expect(await db.subscription.findUnique({ where: { businessId: prefix } })).toEqual(before);
    await configure();
    const after = await db.subscription.findUniqueOrThrow({ where: { businessId: prefix } });
    expect(after).toEqual({ ...before, plan: "EQUIPO", staffLimitOverride: 2, paymentMethod: "BANK_TRANSFER", customMonthlyPriceClp: 17990, updatedAt: after.updatedAt });
    expect(await snapshotOperations()).toEqual(operational);
  });

  it("keeps an undated paid period undated", async () => {
    await db.subscription.update({ where: { businessId: prefix }, data: { currentPeriodEnd: null } });
    await configure();
    expect((await db.subscription.findUniqueOrThrow({ where: { businessId: prefix } })).currentPeriodEnd).toBeNull();
  });

  it("retains Equipo schedules and permits exactly the second active professional through the server action", async () => {
    await configure();
    expect(await actions.saveStaffScheduleAction(initialStaffId, [{ dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isWorking: true }])).toEqual({ success: true });
    expect(await capacity.getStaffLimitInfo(prefix)).toMatchObject({ plan: "EQUIPO", maxAllowed: 2, currentCount: 1, canAdd: true });
    expect(await actions.createStaffAction(createInput("second"))).toEqual({ success: true });
    expect(await actions.createStaffAction(Object.assign(createInput("third"), { staffLimitOverride: 100, extraStaffCount: 99, plan: "EQUIPO" }))).toMatchObject({ error: expect.stringContaining("2 profesional") });
    expect(await db.staff.count({ where: { businessId: prefix, isActive: true } })).toBe(2);
    expect(await db.user.findUnique({ where: { email: createInput("third").email } })).toBeNull();
  });

  it("ignores inactive professionals, enforces reactivation, and lets deactivation free a slot", async () => {
    await configure();
    const inactive = await db.staff.create({ data: { businessId: prefix, name: "Inactive", isActive: false } });
    expect(await actions.createStaffAction(createInput("second"))).toEqual({ success: true });
    expect(await actions.toggleStaffActiveAction(inactive.id)).toMatchObject({ error: expect.stringContaining("2 profesional") });
    expect(await actions.toggleStaffActiveAction(initialStaffId)).toEqual({ success: true });
    expect(await actions.toggleStaffActiveAction(inactive.id)).toEqual({ success: true });
    expect(await db.staff.count({ where: { businessId: prefix, isActive: true } })).toBe(2);
    expect(await db.appointment.count({ where: { businessId: prefix, staffId: initialStaffId } })).toBe(1);
  });

  it("serializes simultaneous server creations for the last slot", async () => {
    await configure();
    const results = await Promise.all([actions.createStaffAction(createInput("race-a")), actions.createStaffAction(createInput("race-b"))]);
    expect(results.filter(result => "success" in result)).toHaveLength(1);
    expect(results.filter(result => "error" in result)).toHaveLength(1);
    expect(await db.staff.count({ where: { businessId: prefix, isActive: true } })).toBe(2);
  });

  it("serializes creation against reactivation and protects the lower-level creation service", async () => {
    await configure();
    const inactive = await db.staff.create({ data: { businessId: prefix, name: "Inactive", isActive: false } });
    const results = await Promise.allSettled([staffService.createStaff({ businessId: prefix, name: "Concurrent" }), actions.toggleStaffActiveAction(inactive.id)]);
    expect(results).toHaveLength(2);
    expect(await db.staff.count({ where: { businessId: prefix, isActive: true } })).toBe(2);
    await expect(staffService.createStaff({ businessId: prefix, name: "Too many" })).rejects.toThrow("2 profesional");
  });

  it("keeps standard Equipo at five and Individual at one", async () => {
    await expect(staffService.createStaff({ businessId: prefix, name: "Individual blocked" })).rejects.toThrow("1 profesional");
    await db.subscription.update({ where: { businessId: prefix }, data: { plan: "EQUIPO" } });
    for (let index = 0; index < 4; index++) await staffService.createStaff({ businessId: prefix, name: `Team ${index}` });
    expect(await capacity.getStaffLimitInfo(prefix)).toMatchObject({ maxAllowed: 5, currentCount: 5, canAdd: false });
    await expect(staffService.createStaff({ businessId: prefix, name: "Sixth blocked" })).rejects.toThrow("5 profesional");
  });

  it("persists terms across a new client, expiry and a manual renewal", async () => {
    await configure();
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const freshClient = new PrismaClient({ adapter: new PrismaPg(pool) });
    try {
      expect(await freshClient.subscription.findUnique({ where: { businessId: prefix } })).toMatchObject({ plan: "EQUIPO", staffLimitOverride: 2, paymentMethod: "BANK_TRANSFER", customMonthlyPriceClp: 17990 });
    } finally { await freshClient.$disconnect(); }
    const response = await expiry.GET(new Request("http://localhost/api/cron/trial-expiry", { headers: { authorization: "Bearer commercial-local-test-only" } }));
    expect(response.status).toBe(200);
    expect((await db.subscription.findUniqueOrThrow({ where: { businessId: prefix } })).status).toBe("ACTIVE");
    await db.subscription.update({ where: { businessId: prefix }, data: { currentPeriodEnd: new Date("2000-01-01T00:00:00Z") } });
    await expiry.GET(new Request("http://localhost/api/cron/trial-expiry", { headers: { authorization: "Bearer commercial-local-test-only" } }));
    expect(await db.subscription.findUnique({ where: { businessId: prefix } })).toMatchObject({ status: "INACTIVE", staffLimitOverride: 2, currentPeriodEnd: new Date("2000-01-01T00:00:00Z") });
    await db.subscription.update({ where: { businessId: prefix }, data: { status: "ACTIVE", currentPeriodEnd: paidThrough } });
    expect(await db.subscription.findUnique({ where: { businessId: prefix } })).toMatchObject({ status: "ACTIVE", plan: "EQUIPO", staffLimitOverride: 2, paymentMethod: "BANK_TRANSFER", customMonthlyPriceClp: 17990, mpSubscriptionId: null });
    expect(await capacity.getStaffLimitInfo(prefix)).toMatchObject({ maxAllowed: 2 });
  });

  it("refuses provider-linked accounts without modifying them", async () => {
    await db.subscription.update({ where: { businessId: prefix }, data: { mpSubscriptionId: "unresolved-provider-id" } });
    const before = await db.subscription.findUnique({ where: { businessId: prefix } });
    expect((await configure(false)).blockers).toHaveLength(1);
    await expect(configure()).rejects.toThrow("vínculo existente");
    expect(await db.subscription.findUnique({ where: { businessId: prefix } })).toEqual(before);
  });

  it("refuses to reduce capacity below existing active staff without deleting or deactivating them", async () => {
    await db.staff.createMany({ data: [{ businessId: prefix, name: "Second" }, { businessId: prefix, name: "Third" }] });
    await expect(configure()).rejects.toThrow("más profesionales activos");
    expect(await db.staff.count({ where: { businessId: prefix, isActive: true } })).toBe(3);
  });

  it("applies the migration additively to legacy data and rejects invalid limits", async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query("BEGIN");
      const schema = `commercial_migration_${randomUUID().replaceAll("-", "")}`;
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      await client.query(`CREATE TABLE "Subscription" (id TEXT PRIMARY KEY, "billingCycle" TEXT DEFAULT 'MONTHLY', "currentPeriodEnd" TIMESTAMP, plan TEXT DEFAULT 'INDIVIDUAL')`);
      await client.query(`INSERT INTO "Subscription" (id, "currentPeriodEnd") VALUES ('legacy', '2099-11-17')`);
      await client.query(readFileSync("prisma/migrations/20261017163250_subscription_commercial_terms/migration.sql", "utf8"));
      expect((await client.query(`SELECT * FROM "Subscription"`)).rows).toMatchObject([{ id: "legacy", plan: "INDIVIDUAL", staffLimitOverride: null, paymentMethod: "AUTOMATIC", customMonthlyPriceClp: null }]);
      await client.query("SAVEPOINT invalid_limit");
      await expect(client.query(`UPDATE "Subscription" SET "staffLimitOverride"=0`)).rejects.toMatchObject({ code: "23514" });
      await client.query("ROLLBACK TO SAVEPOINT invalid_limit");
      await expect(client.query(`UPDATE "Subscription" SET "customMonthlyPriceClp"=17990`)).rejects.toMatchObject({ code: "23514" });
    } finally { await client.query("ROLLBACK"); await client.end(); }
  });
});
