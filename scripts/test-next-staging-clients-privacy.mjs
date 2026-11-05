import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash, createHmac } from "node:crypto";
import { pathToFileURL } from "node:url";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { formatInTimeZone } from "date-fns-tz";
import { localCommercialDatabase } from "./commercial-migrations.mjs";

const state = JSON.parse(fs.readFileSync("scratch/next-staging/current.json", "utf8"));
const target = path.resolve(state.target);
assert(target.startsWith(path.resolve("scratch/next-staging") + path.sep));
const env = JSON.parse(fs.readFileSync(path.join(target, "staging-runtime.private.json"), "utf8"));
assert.equal(env.NEXT_STAGING_NETWORK_GUARD, "1"); assert.equal(env.CONTACT_FLOW_PRODUCTION_ENABLED, "0");
assert(!env.RESEND_API_KEY && !env.GOOGLE_CLIENT_SECRET && !env.MERCADOPAGO_ACCESS_TOKEN);
const database = localCommercialDatabase(env.DATABASE_URL);
assert(new URL(database).pathname.startsWith("/puragenda_commercial_test_rc"));
const origin = state.httpOrigin; assert.equal(origin, "http://127.0.0.1:3128");
process.env.AUTH_SECRET = env.AUTH_SECRET;
const { createSessionToken, AUTH_COOKIE_NAME } = await import("../src/server/auth/session.ts");
const { healthFormRevision } = await import("../src/server/services/health-consent.ts");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: database }) });
const checks = [], suffix = randomUUID().slice(0, 8), businessId = `audit04-http-${suffix}`;
const alice = `alice-${suffix}@audit04.invalid`, bob = `bob-${suffix}@audit04.invalid`;
const password = `Synthetic-${randomUUID()}`, changedPassword = `Changed-${randomUUID()}`, resetPassword = `Reset-${randomUUID()}`;
const hash = value => createHash("sha256").update(value).digest("hex");
const check = (name, value) => { assert(value, name); checks.push(name); console.log("PASS " + name); };
async function call(route, body, cookie = "", method = body === undefined ? "GET" : "POST", headers = {}) {
  const response = await fetch(origin + route, { method, redirect: "manual", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text(); return { response, text, body: response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : null };
}
const cookies = response => response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
const dashboardCookie = user => `${AUTH_COOKIE_NAME}=${createSessionToken({ id: user.id, email: user.email, name: user.name, role: user.role, tokenVersion: user.tokenVersion, isSuperAdmin: false })}`;
async function portalLogin(email, pass = password) { const r = await call("/api/client-portal/login", { email, password: pass }); assert.equal(r.response.status, 200); return cookies(r.response); }
async function tokenRecord(email, purpose = "MAGIC_ACCESS", minutes = 15, authenticationIntent = true) {
  const token = randomBytes(32).toString("hex");
  await db.clientPortalToken.create({ data: { email, tokenHash: hash(token), purpose, authenticationIntent, expiresAt: new Date(Date.now() + minutes * 60000) } }); return token;
}
let browser;
try {
  await db.apiRateLimitBucket.deleteMany({}); // Reset only this disposable synthetic staging fixture.
  const passwordHash = await bcrypt.hash(password, 4);
  const owner = await db.user.create({ data: { email: `owner-${suffix}@audit04.invalid`, name: "Synthetic owner", role: "ADMIN", password: passwordHash } });
  const professional = await db.user.create({ data: { email: `staff-${suffix}@audit04.invalid`, name: "Synthetic professional", role: "STAFF", password: passwordHash } });
  const reception = await db.user.create({ data: { email: `reception-${suffix}@audit04.invalid`, name: "Synthetic receptionist", role: "RECEPTIONIST", password: passwordHash } });
  const b = await db.business.create({ data: { id: businessId, name: "Synthetic audit 04", ownerId: owner.id, slug: businessId, apiKey: randomUUID(), address: "SYNTHETIC_HEAD_OFFICE", timezone: "America/Santiago", allowSameDayBookings: true, includeAppointmentActionsInConfirmationEmail: true, allowRescheduling: true, subscription: { create: { plan: "EQUIPO", status: "ACTIVE", isTrial: false, currentPeriodEnd: new Date("2028-01-01") } } } });
  const primary = await db.businessLocation.create({ data: { businessId, name: "Synthetic primary", slug: "principal", timezone: b.timezone, isPrimary: true, isActive: true, address: b.address, hours: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: true, startTime: "00:00", endTime: "23:59" })) } } });
  const island = await db.businessLocation.create({ data: { businessId, name: "Synthetic island", slug: "isla", timezone: "Pacific/Easter", isActive: true, address: "SYNTHETIC_ISLAND_ADDRESS" } });
  const service = await db.service.create({ data: { businessId, name: "OWN_APPOINTMENT_HTTP", price: 100, duration: 30, locations: { create: [{ locationId: primary.id }, { locationId: island.id }] } } });
  const staff = await db.staff.create({ data: { businessId, userId: professional.id, name: "Synthetic staff", isActive: true, services: { connect: { id: service.id } }, locations: { create: [{ locationId: primary.id }, { locationId: island.id }] } } });
  await db.staff.create({ data: { businessId, userId: reception.id, name: "Synthetic receptionist", isActive: true } });
  const client = await db.client.create({ data: { businessId, email: alice, name: "Synthetic Alice", phone: "123456789", rut: "12.345.678-5", privateNotes: "CRM_HTTP_SECRET" } });
  for (const email of [alice, bob]) await db.clientPortalAccount.create({ data: { email, name: "Synthetic account", phone: "123456789", passwordHash, emailVerifiedAt: new Date() } });
  const day = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const startTime = new Date(`${day}T12:00:00Z`), islandTime = new Date(`${day}T03:30:00Z`);
  const a = await db.appointment.create({ data: { businessId, locationId: primary.id, serviceId: service.id, staffId: staff.id, clientId: client.id, customerName: "Synthetic Alice", customerEmail: alice, startTime, endTime: new Date(+startTime + 1800000), status: "CONFIRMED", internalNotes: "NOTE_HTTP_SECRET" } });
  await db.appointment.create({ data: { businessId, locationId: island.id, serviceId: service.id, staffId: staff.id, clientId: client.id, customerName: "Synthetic Alice", customerEmail: alice, startTime: islandTime, endTime: new Date(+islandTime + 1800000), status: "CONFIRMED" } });
  const healthService = await db.service.create({ data: { businessId, name: "Synthetic health plan", price: 100, duration: 30, locations: { create: { locationId: primary.id } }, recurringPlan: { create: { requiresApproval: true, requiresHealthForm: true, healthQuestions: ["Synthetic question"], fixedDays: [1] } } }, include: { recurringPlan: true } });
  const healthPlan = await db.recurringBooking.create({ data: { businessId, locationId: primary.id, serviceId: healthService.id, recurringPlanId: healthService.recurringPlan.id, staffId: staff.id, clientId: client.id, customerName: "Synthetic Alice", customerEmail: alice, selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: new Date(day), endDate: new Date(+startTime + 30 * 86400000), durationMonths: 1, healthAccepted: true, healthAcceptedAt: new Date(), healthConsentVersion: "health-form-2026-10-30-v1", healthConsentSnapshot: { text: "Synthetic fixture" }, healthAnswers: { question: "HEALTH_HTTP_SECRET" }, healthFreeText: "HEALTH_COMMENT_HTTP_SECRET", managementToken: randomUUID() } });
  const ownerCookie = dashboardCookie(owner), staffCookie = dashboardCookie(professional);
  const agenda = `/dashboard/agenda?date=${day}`;
  let r = await call(agenda, undefined, ownerCookie);
  check("Owner Agenda receives authorized CRM, internal and health information", r.response.status === 200 && r.text.includes("CRM_HTTP_SECRET") && r.text.includes("NOTE_HTTP_SECRET") && r.text.includes("HEALTH_HTTP_SECRET"));
  r = await call(agenda, undefined, dashboardCookie(reception));
  check("Receptionist Agenda excludes health from HTML and RSC props", r.response.status === 200 && !r.text.includes("HEALTH_HTTP_SECRET") && !r.text.includes("HEALTH_COMMENT_HTTP_SECRET"));
  r = await call(agenda, undefined, staffCookie);
  check("Professional Agenda excludes CRM notes, internal notes and health from server output", r.response.status === 200 && !/CRM_HTTP_SECRET|NOTE_HTTP_SECRET|HEALTH_HTTP_SECRET/.test(r.text));
  const profile = await db.accessProfile.create({ data: { businessId, name: "Synthetic own health", permissions: ["appointments.view_own", "appointments.manage_own", "health.view_own", "appointments.notes.view"] } });
  await db.staff.update({ where: { id: staff.id }, data: { accessProfileId: profile.id } });
  r = await call(agenda, undefined, staffCookie);
  check("Explicit own-health permission restores only the professional's pertinent data", r.response.status === 200 && r.text.includes("HEALTH_HTTP_SECRET") && !r.text.includes("CRM_HTTP_SECRET"));
  await db.accessProfile.update({ where: { id: profile.id }, data: { permissions: ["appointments.view_all"] } });
  r = await call(agenda, undefined, staffCookie);
  check("Read-only Agenda permission never implies CRM or health permission", r.response.status === 200 && !/CRM_HTTP_SECRET|NOTE_HTTP_SECRET|HEALTH_HTTP_SECRET/.test(r.text));
  let aliceCookie = await portalLogin(alice), bobCookie = await portalLogin(bob);
  r = await call("/mi-agenda"); check("Anonymous portal HTML contains no private appointment information", r.response.status === 200 && !r.text.includes("OWN_APPOINTMENT_HTTP"));
  r = await call("/mi-agenda", undefined, aliceCookie);
  check("Authenticated portal uses the booked branch address and local time", r.response.status === 200 && r.text.includes("SYNTHETIC_ISLAND_ADDRESS") && r.text.includes(formatInTimeZone(islandTime, "Pacific/Easter", "HH:mm")));
  check("Portal never serializes clinical answers, private CRM notes or internal notes", !/CRM_HTTP_SECRET|NOTE_HTTP_SECRET|HEALTH_HTTP_SECRET/.test(r.text));
  await db.client.update({ where: { id: client.id }, data: { email: bob } });
  r = await call("/mi-agenda", undefined, bobCookie);
  check("Changing the CRM email does not transfer historical appointments", !r.text.includes("OWN_APPOINTMENT_HTTP"));
  for (const action of ["cancel", "reschedule"]) {
    r = await call(`/api/client-portal/appointments/${a.id}/${action}`, {}, bobCookie);
    check(`HTTP denies cross-client ${action} with a generic response`, r.response.status === 404 && r.text === '{"error":"Cita no encontrada"}');
  }
  for (const action of ["pause", "resume", "cancel"]) {
    r = await call(`/api/mi-plan/${healthPlan.managementToken}/actions`, { email: alice, action });
    check(`An old plan link plus the correct email cannot ${action} without authentication`, r.response.status === 401);
  }
  r = await call(`/api/mi-plan/${healthPlan.managementToken}?email=${alice}`, undefined, bobCookie);
  check("A different authenticated customer cannot read a plan", r.response.status === 404 && !r.text.includes("Synthetic Alice"));
  r = await call(`/api/mi-plan/${healthPlan.managementToken}`, undefined, aliceCookie);
  check("A legitimate owner can use an existing plan link without exposing health or credentials", r.response.status === 200 && !/HEALTH_HTTP_SECRET|managementToken|internalNotes/.test(r.text));
  r = await call(`/api/mi-plan/${healthPlan.id}/actions`, { action: "rotate-link" }, aliceCookie);
  assert.equal(r.response.status, 200); const rotatedPath = r.body.url;
  check("Rotating a plan link invalidates the historical link", (await call(`/api/mi-plan/${healthPlan.managementToken}`, undefined, aliceCookie)).response.status === 404);
  check("Rotated plan link remains usable by its owner", (await call(`/api${rotatedPath}`, undefined, aliceCookie)).response.status === 200);
  await call(`/api${rotatedPath}/actions`, { action: "revoke-link" }, aliceCookie);
  check("A revoked plan link cannot be reused", (await call(`/api${rotatedPath}`, undefined, aliceCookie)).response.status === 404);
  const healthBody = { serviceId: healthService.id, locationId: primary.id, selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: formatInTimeZone(new Date(), b.timezone, "yyyy-MM-dd"), durationMonths: 1, customerName: "Synthetic health", customerEmail: `health-${suffix}@audit04.invalid`, customerPhone: "123456789", healthAnswers: { "0": "Synthetic answer" }, healthConsentVersion: "health-form-2026-10-30-v1", healthFormRevision: healthFormRevision(["Synthetic question"]) };
  const count = await db.recurringBooking.count({ where: { businessId } });
  for (const accepted of [undefined, false, "true"]) {
    r = await call(`/api/widget/${b.slug}/book-recurring`, { ...healthBody, healthAccepted: accepted });
    check(`HTTP rejects missing, false or manipulated health consent (${String(accepted)})`, r.response.status === 400);
  }
  check("Rejected health requests persist no reservation or invented acceptance", await db.recurringBooking.count({ where: { businessId } }) === count);
  r = await call(`/api/widget/${b.slug}/book-recurring`, { ...healthBody, healthAccepted: true, healthFormRevision: "0".repeat(64) });
  check("HTTP rejects a stale health form revision", r.response.status === 400);
  r = await call(`/api/widget/${b.slug}/book-recurring`, { ...healthBody, healthAccepted: true });
  assert.equal(r.response.status, 201);
  const accepted = await db.recurringBooking.findUniqueOrThrow({ where: { id: r.body.recurringBookingId } });
  check("HTTP acceptance persists a server timestamp and the exact consent text version", accepted.healthAccepted && accepted.healthAcceptedAt && accepted.healthConsentVersion === healthBody.healthConsentVersion && accepted.healthConsentSnapshot.text.includes("salud"));
  const magic = await tokenRecord(alice);
  r = await call(`/mi-agenda/entrar/${magic}`); assert.equal(r.response.status, 303); const magicCookie = cookies(r.response);
  check("Requested magic login creates a random HttpOnly revocable cookie", magicCookie.includes("=cps_") && /HttpOnly/i.test(r.response.headers.get("set-cookie")));
  check("Magic login is single use", !(await call(`/mi-agenda/entrar/${magic}`)).response.headers.has("set-cookie"));
  await call("/api/client-portal/logout", {}, magicCookie);
  check("HTTP rejects reuse of the same cookie after logout", (await call("/api/client-portal/profile", undefined, magicCookie)).response.status === 401);
  const encoded = Buffer.from(JSON.stringify({ email: alice, exp: Math.floor(Date.now() / 1000) + 30 * 86400, v: 1, purpose: "client-portal" })).toString("base64url");
  const legacyCookie = `puragenda_client_portal=${encoded}.${createHmac("sha256", env.AUTH_SECRET).update(encoded).digest("base64url")}`;
  r = await call("/api/client-portal/profile", undefined, legacyCookie);
  check("A valid legacy cookie is accepted without conversion or extended expiry", r.response.status === 200 && !r.response.headers.has("set-cookie"));
  await call("/api/client-portal/logout", {}, legacyCookie);
  check("HTTP rejects a legacy cookie after logout", (await call("/api/client-portal/profile", undefined, legacyCookie)).response.status === 401);
  r = await call("/api/client-portal/profile/password", { currentPassword: password, newPassword: changedPassword }, aliceCookie, "PATCH");
  check("Password change closes previous sessions and requires a new login", r.response.status === 200 && (await call("/api/client-portal/profile", undefined, aliceCookie)).response.status === 401);
  check("Password change emits no replacement session or orphan row", !/=cps_/.test(r.response.headers.get("set-cookie") ?? "") && await db.clientPortalSession.count({ where: { email: alice } }) === 0);
  check("The previous password cannot log in after a change", (await call("/api/client-portal/login", { email: alice, password })).response.status === 401);
  aliceCookie = await portalLogin(alice, changedPassword);
  const reset = await tokenRecord(alice, "RESET_PASSWORD", 60);
  r = await call("/api/client-portal/reset-password", { token: reset, password: resetPassword });
  check("Password reset revokes prior sessions", r.response.status === 200 && (await call("/api/client-portal/profile", undefined, aliceCookie)).response.status === 401);
  check("Password reset emits no replacement session or orphan row", !/=cps_/.test(r.response.headers.get("set-cookie") ?? "") && await db.clientPortalSession.count({ where: { email: alice } }) === 0);
  check("The previous password cannot log in after a reset", (await call("/api/client-portal/login", { email: alice, password: changedPassword })).response.status === 401);
  check("Password reset token is single use", (await call("/api/client-portal/reset-password", { token: reset, password: changedPassword })).response.status === 400);
  aliceCookie = await portalLogin(alice, resetPassword);
  // A separate synthetic customer exercises registration/activation over TCP.
  // Email transport uses the existing no-key mock. Plain activation/reset
  // credentials are controlled fixtures, never recovered from private logs.
  await db.apiRateLimitBucket.deleteMany({});
  const pendingEmail = `pending-${suffix}@audit04.invalid`;
  await db.appointment.create({ data: { businessId, locationId: primary.id, serviceId: service.id, customerName: "Synthetic pending", customerEmail: pendingEmail, startTime: new Date("2026-01-01T08:00:00Z"), endTime: new Date("2026-01-01T08:30:00Z"), status: "COMPLETED" } });
  const beforeActivationMagic = await tokenRecord(pendingEmail);
  const beforeActivationResponse = await call(`/mi-agenda/entrar/${beforeActivationMagic}`);
  const beforeActivationCookie = cookies(beforeActivationResponse.response);
  check("Legacy magic login has portal access before account activation", beforeActivationCookie.includes("=cps_") && (await call("/api/client-portal/profile", undefined, beforeActivationCookie)).response.status === 404);
  r = await call("/api/client-portal/register", { email: pendingEmail, password, name: "Synthetic registered", phone: "123456789" });
  check("HTTP registration persists a pending account without exposing credentials", r.response.status === 200 && !/tokenHash|passwordHash|cps_/.test(r.text) && (await db.clientPortalAccount.findUniqueOrThrow({ where: { email: pendingEmail } })).emailVerifiedAt === null);
  check("HTTP registration issues a dedicated activation token", await db.clientPortalToken.count({ where: { email: pendingEmail, purpose: "VERIFY_ACCOUNT", authenticationIntent: true } }) === 1);
  check("A pending account cannot log in with its password", (await call("/api/client-portal/login", { email: pendingEmail, password })).response.status === 401);
  const activation = await tokenRecord(pendingEmail, "VERIFY_ACCOUNT", 60);
  const outstandingMagic = await tokenRecord(pendingEmail);
  r = await call(`/mi-agenda/activar/${activation}`, undefined, beforeActivationCookie);
  check("HTTP activation verifies the account and requires a fresh login", r.response.status === 303 && r.response.headers.get("location").includes("cuenta=activada") && !/=cps_/.test(r.response.headers.get("set-cookie") ?? "") && !!(await db.clientPortalAccount.findUniqueOrThrow({ where: { email: pendingEmail } })).emailVerifiedAt);
  check("A pre-activation cookie cannot gain verified-profile access", (await call("/api/client-portal/profile", undefined, beforeActivationCookie)).response.status === 401 && await db.clientPortalSession.count({ where: { email: pendingEmail } }) === 0);
  check("Activation also invalidates outstanding older magic links", !(await call(`/mi-agenda/entrar/${outstandingMagic}`)).response.headers.has("set-cookie"));
  check("HTTP activation is single use", (await call(`/mi-agenda/activar/${activation}`)).response.headers.get("location").includes("activacion-invalida"));
  const activatedCookie = await portalLogin(pendingEmail);
  check("Activated credentials can log in and read their own profile", (await call("/api/client-portal/profile", undefined, activatedCookie)).response.status === 200);
  r = await call("/api/client-portal/forgot-password", { email: pendingEmail });
  check("HTTP forgot-password preserves its generic response and reset purpose", r.response.status === 200 && await db.clientPortalToken.count({ where: { email: pendingEmail, purpose: "RESET_PASSWORD" } }) === 1);
  const pendingReset = await tokenRecord(pendingEmail, "RESET_PASSWORD", 60);
  r = await call("/api/client-portal/reset-password", { token: pendingReset, password: resetPassword });
  check("HTTP reset after activation revokes all previous access and pending tokens", r.response.status === 200 && (await call("/api/client-portal/profile", undefined, activatedCookie)).response.status === 401 && await db.clientPortalSession.count({ where: { email: pendingEmail } }) === 0 && await db.clientPortalToken.count({ where: { email: pendingEmail } }) === 0);
  check("Reset activated credentials can log in again", (await call("/api/client-portal/profile", undefined, await portalLogin(pendingEmail, resetPassword))).response.status === 200);
  await db.apiRateLimitBucket.deleteMany({});
  if (process.argv.includes("--browser")) {
    const playwrightModulePath = process.env.AUDIT04_PLAYWRIGHT_MODULE;
    const { chromium } = await import(playwrightModulePath ? pathToFileURL(path.resolve(playwrightModulePath)).href : "playwright");
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("**/*", route => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(origin + "/mi-agenda");
    await page.getByRole("button", { name: "Rechazar", exact: true }).click({ timeout: 10000 });
    await page.getByLabel("Correo", { exact: true }).fill(alice);
    await page.getByLabel("Contraseña", { exact: true }).fill(resetPassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByText("OWN_APPOINTMENT_HTTP", { exact: true }).first().waitFor();
    check("Graphical mobile E2E logs in and renders authorized appointments", !/CRM_HTTP_SECRET|NOTE_HTTP_SECRET|HEALTH_HTTP_SECRET/.test(await page.content()));
    check("Graphical mobile E2E has no horizontal overflow", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole("button", { name: /Salir|Cerrar sesión/ }).first().click();
    await page.getByRole("heading", { name: "Entra a Mi agenda", exact: true }).waitFor();
    check("Graphical E2E logout clears the portal cookie", !(await context.cookies()).some(c => c.name === "puragenda_client_portal" && c.value));
    await page.getByRole("button", { name: "Recibir un enlace sin contraseña" }).click();
    await page.getByRole("heading", { name: "Recibe un enlace de acceso", exact: true }).waitFor();
    check("Legacy customers can request a short access link without creating a password", await page.locator('input[type="password"]').count() === 0 && (await page.textContent("body")).includes("15 minutos"));
    await browser.close(); browser = null;
  }
  fs.writeFileSync("scratch/audit04/http-clients-privacy.json", JSON.stringify({ passed: checks.length, checks, graphical: process.argv.includes("--browser"), localOnly: true, providerCalls: 0 }, null, 2));
} finally { if (browser) await browser.close(); await db.$disconnect(); }
