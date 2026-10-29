import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { localCommercialDatabase } from "./commercial-migrations.mjs";

// Run after prepare, run-next-staging and bootstrap-next-staging-http. Only the
// generated loopback database is allowed; fixture writes never reach a provider.
const state = JSON.parse(fs.readFileSync("scratch/next-staging/current.json", "utf8"));
const target = path.resolve(state.target);
assert(target.startsWith(path.resolve("scratch/next-staging") + path.sep));
const env = JSON.parse(fs.readFileSync(path.join(target, "staging-runtime.private.json"), "utf8"));
const database = localCommercialDatabase(env.DATABASE_URL);
assert(new URL(database).hostname === "127.0.0.1" && new URL(database).pathname.startsWith("/puragenda_commercial_test_rc"));
assert.equal(env.NEXT_STAGING_NETWORK_GUARD, "1");
assert.equal(env.CONTACT_FLOW_PRODUCTION_ENABLED, "0");
assert.equal(env.CONTACT_FLOW_EXTERNAL_RELEASE, "false");
assert(!env.RESEND_API_KEY && !env.GOOGLE_CLIENT_SECRET && !env.MERCADOPAGO_ACCESS_TOKEN);
const origin = state.httpOrigin;
assert.equal(origin, "http://127.0.0.1:3128");
const accounts = JSON.parse(fs.readFileSync(path.join(target, "staging-accounts.private.json"), "utf8"));
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: database }) });
const checks = [];
function check(name, value) { assert(value, name); checks.push(name); console.log("PASS " + name); }
let cookie = "";
async function call(route, body, method = body === undefined ? "GET" : "POST", headers = {}) {
  const response = await fetch(origin + route, { method, redirect: "manual", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  return { response, text, body: response.headers.get("Content-Type")?.includes("application/json") ? JSON.parse(text) : null };
}
try {
  const login = await call("/api/auth/login", { email: "registro-plus-20261028@rc.example.invalid", password: accounts.accounts[0].password });
  assert.equal(login.response.status, 200);
  cookie = login.response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const business = await db.business.findFirstOrThrow({ where: { owner: { email: "registro-plus-20261028@rc.example.invalid" } } });
  const service = await db.service.findFirstOrThrow({ where: { businessId: business.id, name: "Consulta integral RC" } });
  const staff = await db.staff.findFirstOrThrow({ where: { businessId: business.id, name: "Profesional Integral RC" } });
  // Fixture-only secondary branch has different hours/timezone from the primary.
  const location = await db.businessLocation.create({ data: { businessId: business.id, name: "Sucursal auditoría Agenda", slug: "agenda-" + randomUUID(), timezone: "UTC", isActive: true,
    hours: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: true, startTime: "08:00", endTime: "11:00" })) },
    services: { create: { serviceId: service.id } }, staff: { create: { staffId: staff.id, schedule: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isWorking: true, startTime: "08:00", endTime: "11:00" })) } } } } });
  const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const data = { mode: "services", locationId: location.id, serviceIds: [service.id], staffId: staff.id, selectedOptionAlternativeIds: [], fromDate: date, days: 1 };
  const available = await call("/api/dashboard/availability", data);
  check("Authenticated internal availability uses branch timezone", available.response.status === 200 && available.body.timezone === "UTC" && available.body.days[0].slots[0].time === "08:00");
  const publicQuery = new URLSearchParams({ date, serviceId: service.id, staffId: staff.id, locationId: location.id });
  const publicSlots = await call(`/api/business/${business.slug}/availability?${publicQuery}`, undefined, "GET", { "x-api-key": business.apiKey });
  check("Public and internal HTTP engines return identical branch slots", JSON.stringify(available.body.days[0].slots.map(s => s.startTime)) === JSON.stringify(publicSlots.body.slots.map(s => s.startTime)));
  const slot = available.body.days[0].slots[0];
  const payload = { locationId: location.id, serviceId: service.id, staffId: staff.id, customerName: "Agenda HTTP Fixture", customerEmail: "agenda-http@example.invalid", startTime: slot.startTime, sendConfirmation: false };
  const created = await call("/api/dashboard/appointments", payload);
  check("Dashboard HTTP creation persists branch and its UTC start", created.response.status === 201 && created.body.locationId === location.id && created.body.startTime === slot.startTime);
  const id = created.body.id;
  const changed = await Promise.all(["first", "second"].map(internalNotes => call(`/api/dashboard/appointments/${id}`, { ...payload, expectedUpdatedAt: created.body.updatedAt, internalNotes }, "PUT")));
  check("Concurrent real HTTP edits have one winner and one 409", JSON.stringify(changed.map(r => r.response.status).sort()) === "[200,409]");
  const stale = await call(`/api/dashboard/appointments/${id}`, { ...payload, expectedUpdatedAt: created.body.updatedAt }, "PUT");
  check("A stale HTTP edit cannot overwrite the winner", stale.response.status === 409 && stale.body.code === "APPOINTMENT_CHANGED");
  const wrongBranch = await call("/api/dashboard/appointments", { ...payload, locationId: "foreign-branch" });
  check("Foreign branch rejected through HTTP", wrongBranch.response.status === 409);
  const outside = await call("/api/dashboard/appointments", { ...payload, startTime: date + "T12:00:00.000Z" });
  check("Branch hours enforced on direct HTTP creation", outside.response.status === 409);
  await db.blockedDate.create({ data: { businessId: business.id, date: new Date(date + "T00:00:00Z") } });
  const blocked = await call("/api/dashboard/availability", data);
  check("Business blocked date removes internal HTTP slots", blocked.response.status === 200 && blocked.body.days[0].slots.length === 0);
  const blockedCreate = await call("/api/dashboard/appointments", { ...payload, startTime: available.body.days[0].slots[1].startTime });
  check("Blocked day also rejects manual creation", blockedCreate.response.status === 409);
  const limit = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const horizon = await call("/api/dashboard/availability", { ...data, fromDate: limit, days: 7 });
  check("HTTP range stops on the ninetieth day", horizon.response.status === 200 && horizon.body.days.length === 1 && horizon.body.days[0].date === limit);
  const page = await call(`/dashboard/agenda?location=${location.slug}&date=${date}`);
  check("Agenda renders the selected branch and appointment version", page.response.status === 200 && page.text.includes(location.id) && page.text.includes("updatedAt"));
  await db.business.update({ where: { id: business.id }, data: { depositRequired: true, depositPaymentMode: "MERCADOPAGO", mpAccessToken: null, mpRefreshToken: null } });
  await db.service.update({ where: { id: service.id }, data: { depositAmount: 5000 } });
  const catalog = await call(`/api/business/${business.slug}/booking-catalog`, undefined, "GET", { "x-api-key": business.apiKey });
  check("Public HTTP catalog keeps the mandatory deposit while reporting unavailable payment", catalog.response.status === 200 && catalog.body.rules.depositEnabled === true && catalog.body.rules.depositPaymentStatus === "UNAVAILABLE" && !/mpAccessToken|mpRefreshToken|mpTokenExpiresAt/.test(catalog.text));
  const before = { clients: await db.client.findMany({ where: { businessId: business.id } }), appointments: await db.appointment.findMany({ where: { businessId: business.id } }), consent: await db.cfConsent.findMany({ where: { businessId: business.id } }) };
  const future = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
  const rejected = await call(`/api/business/${business.slug}/book`, { ...payload, customerName: "Rejected change", customerPhone: "+56911111111", startTime: future + "T08:00:00.000Z", endTime: future + "T08:30:00.000Z" }, "POST", { "x-api-key": business.apiKey, "Idempotency-Key": "deposit-rejection-" + randomUUID(), "Puragenda-Booking-Version": "1" });
  check(`Unavailable mandatory deposit returns an explicit HTTP 503 (received ${rejected.response.status})`, rejected.response.status === 503 && rejected.body.code === "DEPOSIT_UNAVAILABLE");
  const after = { clients: await db.client.findMany({ where: { businessId: business.id } }), appointments: await db.appointment.findMany({ where: { businessId: business.id } }), consent: await db.cfConsent.findMany({ where: { businessId: business.id } }) };
  check("Rejected HTTP booking preserves existing CRM, appointments and consent", JSON.stringify(after) === JSON.stringify(before));
  fs.writeFileSync(path.join(target, "agenda-http-results.json"), JSON.stringify({ passed: true, checks, syntheticOnly: true, providerCredentialsPresent: false }, null, 2));
} finally { await db.$disconnect(); }
