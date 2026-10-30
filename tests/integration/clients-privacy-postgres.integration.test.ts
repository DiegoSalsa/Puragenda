import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: async () => ({ id: "audit04-owner", role: "ADMIN" }) }));
vi.mock("@/server/email/send", () => ({ sendRecurringBookingCancelledClient: vi.fn(), sendRecurringBookingCreatedClient: vi.fn(), sendRecurringBookingPendingApprovalBusiness: vi.fn(), sendRecurringBookingApprovedClient: vi.fn(), sendRecurringBookingRejectedClient: vi.fn(), sendCancellationEmail: vi.fn(), sendAppointmentActionNotification: vi.fn(), sendAppointmentActionStaffNotification: vi.fn(), sendClientPortalAccessEmail: vi.fn(async () => true), sendClientPortalPasswordResetEmail: vi.fn(async () => true) }));
import { prisma } from "@/server/db/prisma";
import * as portal from "@/server/services/client-portal.service";
import { listClients } from "@/server/services/client.service";
import { GET as readPlan } from "@/app/api/mi-plan/[token]/route";
import { POST as planAction } from "@/app/api/mi-plan/[token]/actions/route";
import { POST as cancelAppointment } from "@/app/api/client-portal/appointments/[appointmentId]/cancel/route";
import { POST as rescheduleAppointment } from "@/app/api/client-portal/appointments/[appointmentId]/reschedule/route";
import { GET as profile } from "@/app/api/client-portal/profile/route";
import { POST as login } from "@/app/api/client-portal/login/route";
import { POST as logout } from "@/app/api/client-portal/logout/route";
import { createRecurringBookingAction } from "@/server/actions/recurring.actions";
import { dateOnlyInTimezone } from "@/server/services/recurring.service";
import { HEALTH_CONSENT_VERSION, HEALTH_CONSENT_TEXT } from "@/core/health-consent";
import { healthFormRevision } from "@/server/services/health-consent";
import { distributedRateLimit } from "@/server/lib/distributed-rate-limit";
import { updateClientNotesAction, updateClientRutAction } from "@/server/actions/client.actions";

const raw = process.env.COMMERCIAL_V2_TEST_DATABASE_URL;
const enabled = !!raw && ["127.0.0.1", "localhost"].includes(new URL(raw).hostname) && /^\/puragenda_commercial_test_[a-z0-9]+$/.test(new URL(raw).pathname);
const alice = "alice@audit04.invalid", bob = "bob@audit04.invalid";
let appointmentSequence = 0;
async function account(email = alice) {
  return prisma.clientPortalAccount.create({ data: { email, name: "Synthetic", passwordHash: await bcrypt.hash("Synthetic-Password-123", 4), emailVerifiedAt: new Date() } });
}
async function appointment(email = alice, clientId?: string, businessId = "audit04-a", status: "COMPLETED" | "PENDING" | "CHECKED_IN" | "CANCELLED" | "NO_SHOW" = "COMPLETED") {
  const startTime = new Date(Date.UTC(2026, 0, 1, appointmentSequence++));
  return prisma.appointment.create({ data: { businessId, serviceId: `${businessId}-service`, clientId, customerName: "Synthetic", customerEmail: email, startTime, endTime: new Date(startTime.getTime() + 1800000), status } });
}
async function plan() {
  const p = await prisma.recurringPlan.create({ data: { serviceId: "audit04-a-service" } });
  return prisma.recurringBooking.create({ data: { businessId: "audit04-a", serviceId: p.serviceId, recurringPlanId: p.id, customerName: "Synthetic", customerEmail: alice, selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: new Date("2026-01-01"), endDate: new Date("2027-12-01"), durationMonths: 1, status: "ACTIVE", managementToken: "synthetic-legacy-plan-token" } });
}
function request(path: string, token?: string, body?: object) {
  return new NextRequest(`http://localhost${path}`, { method: body ? "POST" : "GET", headers: { ...(token ? { cookie: `${portal.CLIENT_PORTAL_COOKIE_NAME}=${token}` } : {}), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
describe.skipIf(!enabled)("audit 04 clients and privacy PostgreSQL", () => {
  beforeEach(async () => {
    appointmentSequence = 0;
    await prisma.business.deleteMany({ where: { id: { in: ["audit04-a", "audit04-b"] } } });
    await prisma.clientPortalAccount.deleteMany({ where: { email: { endsWith: "@audit04.invalid" } } });
    await prisma.clientPortalToken.deleteMany({ where: { email: { endsWith: "@audit04.invalid" } } });
    await prisma.clientPortalSession.deleteMany({ where: { email: { endsWith: "@audit04.invalid" } } });
    await prisma.clientPortalIdentity.deleteMany({ where: { email: { endsWith: "@audit04.invalid" } } });
    await prisma.clientPortalRevocation.deleteMany({});
    await prisma.apiRateLimitBucket.deleteMany({});
    await prisma.user.upsert({ where: { id: "audit04-owner" }, update: {}, create: { id: "audit04-owner", email: "owner@audit04.invalid", name: "Synthetic", password: "disabled", role: "ADMIN" } });
    for (const id of ["audit04-a", "audit04-b"]) {
      await prisma.business.create({ data: { id, ...(id === "audit04-a" ? { ownerId: "audit04-owner" } : {}), name: "Synthetic", slug: id, apiKey: `synthetic-${id}`, timezone: "America/Santiago", subscription: { create: { plan: "EQUIPO", status: "ACTIVE", isTrial: false, currentPeriodEnd: new Date("2028-01-01") } }, services: { create: { id: `${id}-service`, name: "Synthetic", price: 1, duration: 30 } }, locations: { create: { id: `${id}-location`, slug: "principal", name: "Synthetic", timezone: "America/Santiago", isPrimary: true, isActive: true } } } });
      await prisma.locationService.create({ data: { locationId: `${id}-location`, serviceId: `${id}-service` } });
    }
  });
  afterAll(async () => { await prisma.$disconnect(); });
  it("04-01 revokes the actual legacy credential on logout", async () => {
    const token = portal.createClientPortalSessionToken(alice);
    expect(await portal.resolveClientPortalSessionToken(token)).toBe(alice);
    await portal.revokeClientPortalSessionToken(token);
    expect(await portal.resolveClientPortalSessionToken(token)).toBeNull();
  });
  it("04-01 creates opaque revocable sessions for legacy magic-link customers too", async () => {
    const token = await portal.createClientPortalAccountSession(alice);
    expect(token).toMatch(/^cps_/);
    expect(await portal.resolveClientPortalSessionToken(token)).toBe(alice);
    await portal.revokeClientPortalSessionToken(token);
    expect(await portal.resolveClientPortalSessionToken(token)).toBeNull();
  });
  it("04-01 changes the password and invalidates both session generations", async () => {
    await account(); const legacy = portal.createClientPortalSessionToken(alice), modern = await portal.createClientPortalAccountSession(alice);
    expect(await portal.changeClientPortalPassword(alice, "Synthetic-Password-123", "New-Synthetic-Password-123")).toBe(true);
    expect(await portal.resolveClientPortalSessionToken(legacy)).toBeNull();
    expect(await portal.resolveClientPortalSessionToken(modern)).toBeNull();
  });
  it("04-01 resets a password and invalidates the legacy session", async () => {
    await account(); const legacy = portal.createClientPortalSessionToken(alice);
    const reset = await portal.issueClientPortalPasswordResetToken(alice);
    expect(await portal.resetClientPortalPassword(reset.token, "New-Synthetic-Password-123")).toBe(alice);
    expect(await portal.resolveClientPortalSessionToken(legacy)).toBeNull();
    expect(await portal.resetClientPortalPassword(reset.token, "Another-Synthetic-123")).toBeNull();
  });
  it("04-01 concurrent renewal and logout never resurrect a token", async () => {
    await account(); const token = await portal.createClientPortalAccountSession(alice);
    await Promise.all([portal.renewClientPortalSessionToken(token), portal.revokeClientPortalSessionToken(token)]);
    expect(await portal.resolveClientPortalSessionToken(token)).toBeNull();
    expect(await portal.renewClientPortalSessionToken(token)).toBe(false);
  });
  it("invalidates an earlier activation link when pending credentials are replaced", async () => {
    await appointment();
    const first = await portal.registerClientPortalAccount({ email: alice, name: "Synthetic", phone: "123456789", password: "First-Synthetic-123" });
    const second = await portal.registerClientPortalAccount({ email: alice, name: "Synthetic", phone: "123456789", password: "Second-Synthetic-123" });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("Synthetic registration failed");
    expect(await portal.verifyClientPortalAccount(first.token)).toBeNull();
    expect(await portal.verifyClientPortalAccount(second.token)).toBe(alice);
  });
  it("04-02 CRM email changes do not transfer historical appointments", async () => {
    const client = await prisma.client.create({ data: { businessId: "audit04-a", name: "Synthetic", email: alice } });
    const a = await appointment(alice, client.id);
    await prisma.client.update({ where: { id: client.id }, data: { email: bob } });
    expect(await portal.getClientPortalAppointment(a.id, bob)).toBeNull();
    expect((await portal.getClientPortalAppointment(a.id, alice))?.id).toBe(a.id);
    expect((await portal.getClientPortalData(bob)).history).toHaveLength(0);
  });
  it("04-02 legacy snapshots without CRM and several businesses remain accessible only by their owner", async () => {
    const a = await appointment(), b = await appointment(alice, undefined, "audit04-b");
    expect((await portal.getClientPortalData(alice)).history.map(a => a.id).sort()).toEqual([a.id, b.id].sort());
    expect(await portal.getClientPortalAppointment(a.id, bob)).toBeNull();
  });
  it("04-07 counts COMPLETED independently from CHECKED_IN and all statuses", async () => {
    const client = await prisma.client.create({ data: { businessId: "audit04-a", name: "Synthetic", email: alice } });
    for (const status of ["PENDING", "CHECKED_IN", "COMPLETED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const) await appointment(alice, client.id, "audit04-a", status);
    const result = await listClients("audit04-a");
    expect(result.data[0]).toMatchObject({ totalAppointments: 6, completedAppointments: 2 });
    expect((await listClients("audit04-b")).data).toHaveLength(0);
  });
  it("04-08 a forwarded legacy link plus an email cannot read private plan data", async () => {
    const p = await plan();
    expect((await readPlan(request(`/api/mi-plan/${p.managementToken}?email=${alice}`), { params: Promise.resolve({ token: p.managementToken! }) })).status).toBe(401);
  });
  it.each(["pause", "resume", "cancel"])("04-08 %s requires authentication, even with the correct email", async action => {
    const p = await plan();
    const res = await planAction(request(`/api/mi-plan/${p.managementToken}/actions`, undefined, { email: alice, action, pauseUntil: "2027-01-01" }), { params: Promise.resolve({ token: p.managementToken! }) });
    expect(res.status).toBe(401);
    expect((await prisma.recurringBooking.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("ACTIVE");
  });
  it("login sets a secure cookie contract and logout rejects reuse", async () => {
    await account();
    const response = await login(request("/api/client-portal/login", undefined, { email: alice, password: "Synthetic-Password-123" }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/i); expect(cookie).toMatch(/SameSite=lax/i);
    const token = cookie.match(/puragenda_client_portal=([^;]+)/)![1];
    expect((await profile(request("/api/client-portal/profile", token))).status).toBe(200);
    await logout(request("/api/client-portal/logout", token, {}));
    expect((await profile(request("/api/client-portal/profile", token))).status).toBe(401);
  });
  it("a legacy profile read never upgrades or extends its credential", async () => {
    await account(); const token = portal.createClientPortalSessionToken(alice);
    const response = await profile(request("/api/client-portal/profile", token));
    expect(response.status).toBe(200); expect(response.headers.has("set-cookie")).toBe(false);
    expect(await prisma.clientPortalSession.count()).toBe(0);
    await logout(request("/api/client-portal/logout", token, {}));
    expect((await profile(request("/api/client-portal/profile", token))).status).toBe(401);
  });
  it.each(["expiresAt", "lastUsedAt", "createdAt"] as const)("never resolves or renews a session beyond its %s limit", async field => {
    const token = await portal.createClientPortalAccountSession(alice);
    const days = field === "createdAt" ? 91 : field === "lastUsedAt" ? 31 : 1;
    await prisma.clientPortalSession.update({ where: { tokenHash: portal.hashClientPortalToken(token) }, data: { [field]: new Date(Date.now() - days * 86400000) } });
    expect(await portal.resolveClientPortalSessionToken(token)).toBeNull();
    expect(await portal.renewClientPortalSessionToken(token)).toBe(false);
  });
  it("keeps the absolute session deadline unchanged during renewal", async () => {
    const token = await portal.createClientPortalAccountSession(alice);
    const before = await prisma.clientPortalSession.findUniqueOrThrow({ where: { tokenHash: portal.hashClientPortalToken(token) } });
    expect(await portal.renewClientPortalSessionToken(token)).toBe(true);
    const after = await prisma.clientPortalSession.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.expiresAt).toEqual(before.expiresAt); expect(after.tokenHash).not.toBe(token);
  });
  it("rejects credentials verified before a concurrent password change", async () => {
    const a = await account(); await portal.changeClientPortalPassword(alice, "Synthetic-Password-123", "Changed-Synthetic-123");
    await expect(portal.createClientPortalAccountSession(alice, undefined, a.passwordHash)).rejects.toThrow("PORTAL_CREDENTIAL_CHANGED");
  });
  it("consumes a requested magic link once and creates a revocable legacy-customer session atomically", async () => {
    const { token } = await portal.issueClientPortalMagicToken(alice);
    const results = await Promise.all([portal.consumeClientPortalAccessSession(token), portal.consumeClientPortalAccessSession(token)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await portal.resolveClientPortalSessionToken(results.find(Boolean)!)).toBe(alice);
    expect(await prisma.clientPortalSession.count({ where: { email: alice } })).toBe(1);
  });
  it("expired and historical promotional links cannot authenticate", async () => {
    const old = "e".repeat(64);
    await prisma.clientPortalToken.create({ data: { email: alice, tokenHash: portal.hashClientPortalToken(old), expiresAt: new Date(Date.now() + 86400000) } });
    expect(await portal.consumeClientPortalAccessSession(old)).toBeNull();
    const fresh = await portal.issueClientPortalMagicToken(alice);
    await prisma.clientPortalToken.update({ where: { tokenHash: portal.hashClientPortalToken(fresh.token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await portal.consumeClientPortalAccessSession(fresh.token)).toBeNull();
  });
  it("preserves a legitimate RC1 requested 15-minute magic link without extending its expiry", async () => {
    const token = "d".repeat(64);
    await prisma.clientPortalToken.create({ data: { email: alice, tokenHash: portal.hashClientPortalToken(token), expiresAt: new Date(Date.now() + 15 * 60000) } });
    expect(await portal.consumeClientPortalAccessSession(token)).toMatch(/^cps_/);
    expect(await portal.consumeClientPortalAccessSession(token)).toBeNull();
  });
  it("a magic-link/password-change race cannot leave a pre-change session alive", async () => {
    await account(); const magic = await portal.issueClientPortalMagicToken(alice);
    const [session] = await Promise.all([portal.consumeClientPortalAccessSession(magic.token), portal.changeClientPortalPassword(alice, "Synthetic-Password-123", "Changed-Synthetic-123")]);
    if (session) expect(await portal.resolveClientPortalSessionToken(session)).toBeNull();
  });
  it.each([cancelAppointment, rescheduleAppointment])("04-02 the same owner rule protects cancellation and rescheduling", async endpoint => {
    const client = await prisma.client.create({ data: { businessId: "audit04-a", name: "Synthetic", email: alice } });
    const a = await appointment(alice, client.id); await prisma.client.update({ where: { id: client.id }, data: { email: bob } });
    const token = await portal.createClientPortalAccountSession(bob);
    const response = await endpoint(request("/api/client-portal/appointments/foreign", token, {}), { params: Promise.resolve({ appointmentId: a.id }) });
    expect(response.status).toBe(404); expect(await response.json()).toEqual({ error: "Cita no encontrada" });
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("COMPLETED");
  });
  it("04-02 changing a reservation contact email also does not transfer ownership", async () => {
    const a = await appointment(); await prisma.appointment.update({ where: { id: a.id }, data: { customerEmail: bob } });
    expect(await portal.getClientPortalAppointment(a.id, bob)).toBeNull();
    expect((await portal.getClientPortalAppointment(a.id, alice))?.id).toBe(a.id);
  });
  it("04-02 database rejects client associations across businesses", async () => {
    const c = await prisma.client.create({ data: { businessId: "audit04-b", email: alice, name: "Synthetic" } });
    await expect(appointment(alice, c.id)).rejects.toThrow("CLIENT_BUSINESS_MISMATCH");
  });
  it("04-02 separates two CRM clients in two businesses while preserving a person's multi-business history", async () => {
    const ca = await prisma.client.create({ data: { businessId: "audit04-a", name: "Synthetic A", email: alice } });
    const cb = await prisma.client.create({ data: { businessId: "audit04-b", name: "Synthetic B", email: bob } });
    const a = await appointment(alice, ca.id), b = await appointment(bob, cb.id, "audit04-b"), multi = await appointment(alice, undefined, "audit04-b");
    expect((await portal.getClientPortalData(alice)).history.map(r => r.id).sort()).toEqual([a.id, multi.id].sort());
    expect((await portal.getClientPortalData(bob)).history.map(r => r.id)).toEqual([b.id]);
    expect(await portal.getClientPortalAppointment(b.id, alice)).toBeNull();
  });
  it("04-02 a legacy CRM association never overrides the reservation identity snapshot", async () => {
    const c = await prisma.client.create({ data: { businessId: "audit04-a", name: "Synthetic", email: alice } });
    const a = await appointment(bob, c.id);
    expect(await portal.getClientPortalAppointment(a.id, alice)).toBeNull();
    expect((await portal.getClientPortalAppointment(a.id, bob))?.id).toBe(a.id);
  });
  it("CRM partial writes preserve concurrent notes and Chilean tax ID updates, with business isolation", async () => {
    const c = await prisma.client.create({ data: { businessId: "audit04-a", name: "Synthetic", email: alice, phone: "123456789" } });
    const results = await Promise.all([updateClientNotesAction(c.id, "Synthetic concurrent note"), updateClientRutAction(c.id, "12.345.678-5")]);
    expect(results.every(r => "success" in r)).toBe(true);
    const stored = await prisma.client.findUniqueOrThrow({ where: { id: c.id } });
    expect(stored.privateNotes).toBe("Synthetic concurrent note"); expect(stored.phone).toBe("123456789"); expect(stored.rut).toBeTruthy();
    expect(await updateClientRutAction(c.id, "12.345.678-0")).toHaveProperty("error");
    const foreign = await prisma.client.create({ data: { businessId: "audit04-b", name: "Synthetic B", email: bob } });
    expect(await updateClientNotesAction(foreign.id, "unauthorized")).toHaveProperty("error");
    expect((await prisma.client.findUniqueOrThrow({ where: { id: foreign.id } })).privateNotes).toBeNull();
  });
  it("preserves international legacy identity documents when editing an unrelated CRM field", async () => {
    const c = await prisma.client.create({ data: { businessId: "audit04-a", name: "Synthetic", email: alice, rut: "INTL-SYNTHETIC-123" } });
    expect(await updateClientNotesAction(c.id, "Synthetic")).toHaveProperty("success");
    expect((await prisma.client.findUniqueOrThrow({ where: { id: c.id } })).rut).toBe("INTL-SYNTHETIC-123");
  });
  it.each(["pause", "resume", "cancel"])("04-08 another customer's authenticated session cannot %s a plan", async action => {
    const p = await plan(), session = await portal.createClientPortalAccountSession(bob);
    const response = await planAction(request("/api/mi-plan/foreign/actions", session, { email: alice, action }), { params: Promise.resolve({ token: p.managementToken! }) });
    expect(response.status).toBe(404); expect(JSON.stringify(await response.json())).not.toContain("Synthetic");
  });
  it("04-08 valid legacy locators require the owner; expiry, rotation and revocation reject old paths", async () => {
    const p = await plan(), session = await portal.createClientPortalAccountSession(alice);
    const read = (token: string) => readPlan(request(`/api/mi-plan/${token}`, session), { params: Promise.resolve({ token }) });
    expect((await read(p.managementToken!)).status).toBe(200);
    await prisma.recurringBooking.update({ where: { id: p.id }, data: { managementTokenExpiresAt: new Date(Date.now() - 1000) } });
    expect((await read(p.managementToken!)).status).toBe(404);
    const rotated = await planAction(request("/api/mi-plan/owner/actions", session, { action: "rotate-link" }), { params: Promise.resolve({ token: p.id }) });
    expect(rotated.status).toBe(200); const token = (await rotated.json()).url.split("/").at(-1);
    expect((await read(p.managementToken!)).status).toBe(404); expect((await read(token)).status).toBe(200);
    const stored = await prisma.recurringBooking.findUniqueOrThrow({ where: { id: p.id } });
    expect(stored.managementToken).toBeNull(); expect(stored.managementTokenHash).toBe(portal.hashClientPortalToken(token));
    await planAction(request("/api/mi-plan/owner/actions", session, { action: "revoke-link" }), { params: Promise.resolve({ token }) });
    expect((await read(token)).status).toBe(404); expect((await read(p.id)).status).toBe(200);
  });
  it("04-08 a plan's approved deposits survive attempted pause and cancellation", async () => {
    const p = await plan(), session = await portal.createClientPortalAccountSession(alice);
    const startTime = new Date(Date.now() + 86400000);
    const a = await prisma.appointment.create({ data: { businessId: p.businessId, serviceId: p.serviceId, recurringBookingId: p.id, customerName: "Synthetic", customerEmail: alice, startTime, endTime: new Date(startTime.getTime() + 1800000), status: "CONFIRMED", paymentStatus: "APPROVED", depositAmount: 1 } });
    for (const action of ["pause", "cancel"]) expect((await planAction(request("/api/mi-plan/owner/actions", session, { action, pauseUntil: "2027-01-01" }), { params: Promise.resolve({ token: p.id }) })).status).toBe(409);
    expect(await prisma.appointment.findUnique({ where: { id: a.id } })).toEqual(a);
    expect((await prisma.recurringBooking.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("ACTIVE");
  });
  it("04-08 concurrent pause and resume requests produce one transition without duplicate sessions", async () => {
    const p = await plan(), session = await portal.createClientPortalAccountSession(alice);
    const act = (action: string) => planAction(request("/api/mi-plan/owner/actions", session, { action, pauseUntil: "2027-01-01" }), { params: Promise.resolve({ token: p.id }) });
    const paused = await Promise.all([act("pause"), act("pause")]); expect(paused.filter(r => r.status === 200)).toHaveLength(1);
    const resumed = await Promise.all([act("resume"), act("resume")]); expect(resumed.filter(r => r.status === 200)).toHaveLength(1);
    const rows = await prisma.appointment.findMany({ where: { recurringBookingId: p.id, status: "CONFIRMED" }, select: { startTime: true } });
    expect(rows.length).toBeGreaterThan(0); expect(new Set(rows.map(r => r.startTime.toISOString())).size).toBe(rows.length);
  });
  it.each([undefined, false, true])("04-05 persists only explicit, current-version health consent: %s", async accepted => {
    await prisma.recurringPlan.create({ data: { serviceId: "audit04-a-service", requiresHealthForm: true, healthQuestions: ["Synthetic question"], requiresApproval: true, fixedDays: [1] } });
    const result = await createRecurringBookingAction({ businessSlug: "audit04-a", serviceId: "audit04-a-service", customerName: "Synthetic", customerEmail: alice, customerPhone: "123456789", selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: dateOnlyInTimezone(new Date(), "America/Santiago"), durationMonths: 1, healthAccepted: accepted, healthConsentVersion: HEALTH_CONSENT_VERSION, healthFormRevision: healthFormRevision(["Synthetic question"]), healthAnswers: { "0": "Synthetic answer" } });
    if (accepted !== true) { expect(result).toHaveProperty("error"); expect(await prisma.recurringBooking.count()).toBe(0); return; }
    expect(result).not.toHaveProperty("error");
    expect(result.success).toBe(true);
    const stored = await prisma.recurringBooking.findUniqueOrThrow({ where: { id: result.recurringBookingId } });
    expect(stored).toMatchObject({ healthAccepted: true, healthAcceptedAt: expect.any(Date), healthConsentVersion: HEALTH_CONSENT_VERSION, healthConsentSnapshot: { text: HEALTH_CONSENT_TEXT, questions: ["Synthetic question"] } });
  });
  it("04-05 a plan without a health form discards unsolicited health answers", async () => {
    await prisma.recurringPlan.create({ data: { serviceId: "audit04-a-service", requiresHealthForm: false, requiresApproval: true, fixedDays: [1] } });
    const result = await createRecurringBookingAction({ businessSlug: "audit04-a", serviceId: "audit04-a-service", customerName: "Synthetic", customerEmail: alice, customerPhone: "123456789", selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: dateOnlyInTimezone(new Date(), "America/Santiago"), durationMonths: 1, healthAccepted: true, healthAnswers: { "0": "UNNEEDED_SYNTHETIC_HEALTH" }, healthFreeText: "UNNEEDED_SYNTHETIC_HEALTH" });
    expect(result).not.toHaveProperty("error");
    expect(result.success).toBe(true);
    expect(await prisma.recurringBooking.findUniqueOrThrow({ where: { id: result.recurringBookingId } })).toMatchObject({ healthAccepted: false, healthAnswers: null, healthFreeText: null, healthAcceptedAt: null, healthConsentVersion: null });
  });
  it("rejects a health form whose questions changed after the customer opened it", async () => {
    await prisma.recurringPlan.create({ data: { serviceId: "audit04-a-service", requiresHealthForm: true, healthQuestions: ["Updated synthetic question"], requiresApproval: true, fixedDays: [1] } });
    const result = await createRecurringBookingAction({ businessSlug: "audit04-a", serviceId: "audit04-a-service", customerName: "Synthetic", customerEmail: alice, customerPhone: "123456789", selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: dateOnlyInTimezone(new Date(), "America/Santiago"), durationMonths: 1, healthAccepted: true, healthConsentVersion: HEALTH_CONSENT_VERSION, healthFormRevision: "stale-synthetic-form", healthAnswers: { "0": "Answer to original question" } });
    expect(result).toHaveProperty("error"); expect(await prisma.recurringBooking.count()).toBe(0);
  });
  it("records the actual localized health consent text without changing the acceptance version", async () => {
    await prisma.recurringPlan.create({ data: { serviceId: "audit04-a-service", requiresHealthForm: true, healthQuestions: ["Synthetic question"], requiresApproval: true, fixedDays: [1] } });
    const result = await createRecurringBookingAction({ businessSlug: "audit04-a", serviceId: "audit04-a-service", customerName: "Synthetic", customerEmail: alice, customerPhone: "123456789", selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: dateOnlyInTimezone(new Date(), "America/Santiago"), durationMonths: 1, healthAccepted: true, healthConsentVersion: HEALTH_CONSENT_VERSION, healthFormRevision: healthFormRevision(["Synthetic question"]), healthConsentLocale: "en" });
    expect(result.success).toBe(true);
    const record = await prisma.recurringBooking.findUniqueOrThrow({ where: { id: result.recurringBookingId } });
    expect(record.healthConsentSnapshot).toMatchObject({ locale: "en", text: expect.stringContaining("health information") });
    expect(record.healthConsentVersion).toBe(HEALTH_CONSENT_VERSION);
  });
  it("an unverified recurring booking cannot attach a new email to a CRM identity whose contact was edited", async () => {
    const c = await prisma.client.create({ data: { businessId: "audit04-a", email: alice, name: "Synthetic", phone: "111111111" } });
    await prisma.client.update({ where: { id: c.id }, data: { email: bob } });
    await prisma.recurringPlan.create({ data: { serviceId: "audit04-a-service", requiresApproval: true, fixedDays: [1] } });
    const result = await createRecurringBookingAction({ businessSlug: "audit04-a", serviceId: "audit04-a-service", customerName: "Synthetic visitor", customerEmail: bob, customerPhone: "222222222", selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: dateOnlyInTimezone(new Date(), "America/Santiago"), durationMonths: 1 });
    expect(result.success).toBe(true);
    expect((await prisma.recurringBooking.findUniqueOrThrow({ where: { id: result.recurringBookingId } })).clientId).toBeNull();
    expect((await prisma.client.findUniqueOrThrow({ where: { id: c.id } })).phone).toBe("111111111");
  });
  it("distributed rate limit shares a budget across instances and concurrent calls", async () => {
    const options = { namespace: "audit04-synthetic", windowMs: 60000, max: 2, message: "Synthetic", trustedProxyOnly: true };
    const a = distributedRateLimit(options), b = distributedRateLimit(options);
    const responses = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? a : b).check(request("/synthetic"))));
    expect(responses.filter(Boolean)).toHaveLength(6);
    expect(responses.filter(Boolean).every(r => r!.status === 429)).toBe(true);
  });
  it("concurrent normalized booking emails create only one CRM client without overwriting an existing identity", async () => {
    await prisma.recurringPlan.create({ data: { serviceId: "audit04-a-service", requiresApproval: true, fixedDays: [1] } });
    const results = await Promise.all([" ALICE@audit04.invalid ", alice].map(customerEmail => createRecurringBookingAction({ businessSlug: "audit04-a", serviceId: "audit04-a-service", customerName: "Synthetic", customerEmail, customerPhone: "123456789", selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: dateOnlyInTimezone(new Date(), "America/Santiago"), durationMonths: 1 })));
    expect(results.every(r => r.success)).toBe(true);
    expect(await prisma.client.count({ where: { businessId: "audit04-a", email: alice } })).toBe(1);
  });
});
