import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import pg from "pg";
import { prisma } from "@/server/db/prisma";
import { registerUser } from "@/server/services/auth.service";
import { createStaff } from "@/server/services/staff.service";
import { defaultSetupHours } from "@/core/onboarding";
import { loadSetup, mutateSetup, setupContext, type SetupCommand } from "@/server/onboarding/service";
import { learningContext, saveLearning } from "@/server/onboarding/tutorial-service";
import { answerLearningQuestion } from "@/server/puri/learning";
import { createPuriContext } from "@/server/puri/context";
import { answerSetupWithPuri } from "@/server/puri/setup";
import { createService, deleteService } from "@/server/services/service.service";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/server/auth/session";
import { POST as setupPost, GET as setupGet } from "@/app/api/dashboard/setup/route";

const local = process.env.ONBOARDING_TEST_DATABASE_URL;
const fixtures: { userId: string; businessId: string }[] = [];
async function fixture(total = 1) {
  const result = await registerUser({ email: `setup-test-${randomUUID()}@example.invalid`, password: "FixtureOnly2026!", name: "Prueba Local", businessName: `Prueba ${randomUUID()}`, countryCode: "CL", currencyCode: "CLP", timezone: "America/Santiago", ip: "127.0.0.1", commercialPlanIntent: "PURAGENDA", professionalTotal: total, marketplaceCategorySlug: "puri-demo", marketplaceLocalityNotFound: true, marketplaceCityName: "Ciudad ficticia", marketplaceAuthorized: false });
  if (!result.success) throw new Error(result.error);
  fixtures.push({ userId: result.user.id, businessId: result.business.id });
  const user = result.user;
  const context = await setupContext(user);
  return { user, context, snapshot: await loadSetup(context) };
}
async function command(context: Awaited<ReturnType<typeof setupContext>>, value: SetupCommand, key = randomUUID()) {
  const state = await loadSetup(context);
  return mutateSetup(context, { key, revision: state.revision, command: value });
}
async function whileBusinessLock<T>(businessId: string, start: () => Promise<T>, revoke: (client: pg.Client) => Promise<void>) {
  const client = new pg.Client({ connectionString: local });
  await client.connect(); await client.query("BEGIN");
  await client.query('SELECT "id" FROM "Business" WHERE "id" = $1 FOR NO KEY UPDATE', [businessId]);
  const pending = start().then(value => ({ value }), error => ({ error }));
  let observed = false;
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const waiting = await client.query("SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND pid <> pg_backend_pid()");
      if (waiting.rowCount) { observed = true; break; }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (!observed) throw new Error("BUSINESS_LOCK_WAIT_NOT_OBSERVED");
    await revoke(client);
    await client.query("COMMIT");
    const result = await pending;
    return result;
  } finally { await client.query("ROLLBACK").catch(() => undefined); await client.end(); }
}
async function whileLearningLock<T>(businessId: string, userId: string, tutorialId: string, start: () => Promise<T>, revoke: (client: pg.Client) => Promise<void>) {
  const client = new pg.Client({ connectionString: local });
  await client.connect(); await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`learning:${businessId}:${userId}:${tutorialId}`]);
  const pending = start().then(value => ({ value }), error => ({ error }));
  let observed = false;
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const waiting = await client.query("SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND pid <> pg_backend_pid()");
      if (waiting.rowCount) { observed = true; break; }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (!observed) throw new Error("LEARNING_LOCK_WAIT_NOT_OBSERVED");
    await revoke(client); await client.query("COMMIT"); return await pending;
  } finally { await client.query("ROLLBACK").catch(() => undefined); await client.end(); }
}
describe.runIf(!!local)("Puri Setup against real PostgreSQL and booking services", () => {
  beforeAll(() => {
    const url = new URL(local!);
    if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/puragenda_commercial_test_onboarding" || process.env.DATABASE_URL !== local) throw new Error("LOCAL_DATABASE_ONLY");
  });
  afterEach(async () => {
    for (const f of fixtures.splice(0)) {
      await prisma.business.deleteMany({ where: { id: f.businessId } });
      await prisma.user.deleteMany({ where: { id: f.userId } });
    }
  });
  afterAll(async () => { await prisma.$disconnect(); });
  it("registers with durable progress, reuses the owner's professional and grants the real catalog limit", async () => {
    const { context, snapshot } = await fixture();
    expect(snapshot.started).toBe(true);
    expect(snapshot.staff).toHaveLength(1);
    expect(snapshot.capacity.total).toBe(1);
    await command(context, { type: "profile", mode: "solo", industry: "Salud" });
    const resumed = await loadSetup(await setupContext(context.user));
    expect(resumed.currentStep).toBe("hours");
    expect(resumed.staff).toHaveLength(1);
    expect(resumed.optional.website).toBe(false);
  });
  it("persists drafts across pause, fresh contexts and resume without changing actual catalog data", async () => {
    const { context } = await fixture();
    await command(context, { type: "draft", step: "services", value: { name: "Servicio sin terminar", description: "", duration: "30", price: "", staffIds: [] } });
    await command(context, { type: "pause" });
    const fresh = await loadSetup(await setupContext(context.user));
    expect(fresh.paused).toBe(true);
    expect(fresh.draft.services).toMatchObject({ name: "Servicio sin terminar" });
    expect(fresh.catalog.services).toHaveLength(0);
    expect((await command(context, { type: "resume" })).currentStep).toBe("services");
  });
  it("creates a service atomically, replays a lost response safely and rejects duplicate names", async () => {
    const { context, snapshot } = await fixture();
    const key = randomUUID();
    const value: SetupCommand = { type: "service", name: "Atención local", description: "", duration: 30, price: 10000, staffIds: [snapshot.staff[0].id] };
    const result = await mutateSetup(context, { key, revision: snapshot.revision, command: value });
    const replay = await mutateSetup(context, { key, revision: snapshot.revision, command: value });
    expect(replay.revision).toBe(result.revision);
    expect(replay.catalog.services).toHaveLength(1);
    await expect(command(context, value)).rejects.toThrow("Ya existe un servicio");
    await expect(mutateSetup(context, { key, revision: 0, command: { ...value, price: 20000 } })).rejects.toThrow("otros datos");
    expect(await prisma.appointment.count({ where: { businessId: context.business.id } })).toBe(0);
  });
  it("does not return an idempotent replay after the session was revoked", async () => {
    const { context, snapshot } = await fixture();
    const key = randomUUID();
    const commandValue: SetupCommand = { type: "pause" };
    await mutateSetup(context, { key, revision: snapshot.revision, command: commandValue });
    await prisma.user.update({ where: { id: context.user.id }, data: { tokenVersion: { increment: 1 } } });
    await expect(mutateSetup(context, { key, revision: snapshot.revision, command: commandValue })).rejects.toMatchObject({ status: 403 });
  });
  it("enforces catalog capacity and serializes two devices without duplicate professionals", async () => {
    const { context, snapshot } = await fixture(2);
    const requests = ["Ana", "Bea"].map(name => mutateSetup(context, { key: randomUUID(), revision: snapshot.revision, command: { type: "staff", name } }));
    const results = await Promise.allSettled(requests);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((await loadSetup(context)).staff).toHaveLength(2);
    await expect(createStaff({ businessId: context.business.id, name: "Sobre el límite" })).rejects.toThrow("límite");
    const current = await loadSetup(context);
    await command(context, { type: "staff", name: current.staff[1].name });
    expect((await loadSetup(context)).staff).toHaveLength(2);
  });
  it("revalidates authorization after a real business lock for session, membership, owner and plan changes", async () => {
    const cases = [
      { name: "revoked session", revoke: async (client: pg.Client, f: Awaited<ReturnType<typeof fixture>>) => { await client.query('UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1 WHERE id = $1', [f.context.user.id]); } },
      { name: "removed membership", revoke: async (client: pg.Client, f: Awaited<ReturnType<typeof fixture>>) => { await client.query('UPDATE "Business" SET "ownerId" = NULL WHERE id = $1', [f.context.business.id]); await client.query('UPDATE "Staff" SET "isActive" = false WHERE "businessId" = $1 AND "userId" = $2', [f.context.business.id, f.context.user.id]); } },
      { name: "changed owner", revoke: async (client: pg.Client, f: Awaited<ReturnType<typeof fixture>>) => { const ownerId = randomUUID(); const other = await client.query('INSERT INTO "User" (id,email,password,name,role,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING id', [ownerId, `owner-${randomUUID()}@example.invalid`, "fixture", "Nuevo propietario", "ADMIN"]); await client.query('UPDATE "Business" SET "ownerId" = $1 WHERE id = $2', [other.rows[0].id, f.context.business.id]); await client.query('UPDATE "Staff" SET "isActive" = false WHERE "businessId" = $1 AND "userId" = $2', [f.context.business.id, f.context.user.id]); } },
      { name: "plan expired", revoke: async (client: pg.Client, f: Awaited<ReturnType<typeof fixture>>) => { await client.query('UPDATE "CommercialSubscription" SET status = \'INACTIVE\', "periodStart" = NOW() - INTERVAL \'3 days\', "periodEnd" = NOW() - INTERVAL \'1 day\', "gracePeriodEndsAt" = NULL, "lastPaymentStatus" = NULL, "lastPaymentAt" = NULL, "lastPaymentEventId" = NULL WHERE "businessId" = $1', [f.context.business.id]); } },
    ];
    for (const testCase of cases) {
      const f = await fixture();
      const result = await whileBusinessLock(f.context.business.id, () => command(f.context, { type: "pause" }), client => testCase.revoke(client, f));
      console.log(`[onboarding-lock] ${testCase.name}: ${"error" in result ? (result.error instanceof Error ? result.error.message : "error") : "committed"}`);
      expect(result).toMatchObject({ error: expect.objectContaining({ status: 403 }) });
      expect((await loadSetup(f.context)).paused).toBe(false);
    }
  });
  it("saves business and professional hours and checks public availability without writing appointments or payments", async () => {
    const { context, snapshot } = await fixture();
    await command(context, { type: "profile", mode: "solo", industry: "" });
    const hours = defaultSetupHours().map(h => ({ ...h, isOpen: true, breakStart: "13:00", breakEnd: "14:00" }));
    const locationId = snapshot.catalog.locations[0].id;
    await command(context, { type: "hours", hours, locationId });
    await command(context, { type: "staff-hours", hours, locationId, staffId: snapshot.staff[0].id });
    const withService = await command(context, { type: "service", name: "Consulta", description: "", duration: 30, price: 10000, staffIds: [snapshot.staff[0].id] });
    const checked = await command(context, { type: "check", serviceId: withService.catalog.services[0].id, locationId, optionIds: [] });
    expect(checked.verified).toBe(true);
    expect(checked.verification?.slots.length).toBeGreaterThan(0);
    expect(checked.progress.percent).toBe(100);
    expect((await command(context, { type: "finish" })).completed).toBe(true);
    expect(await prisma.appointment.count({ where: { businessId: context.business.id } })).toBe(0);
    const changed = await command(context, { type: "hours", hours: hours.map(h => ({ ...h, isOpen: false })), locationId });
    expect(changed.verified).toBe(false);
    await expect(command(context, { type: "finish" })).rejects.toThrow("Comprueba");
    expect((await loadSetup(context)).activation).toBe("incomplete");
  });
  it("does not call a new structurally valid setup ready before a live availability check", async () => {
    const { context, snapshot } = await fixture();
    const hours = defaultSetupHours().map(h => ({ ...h, isOpen: true }));
    await command(context, { type: "hours", hours, locationId: snapshot.catalog.locations[0].id });
    await command(context, { type: "staff-hours", hours, locationId: snapshot.catalog.locations[0].id, staffId: snapshot.staff[0].id });
    await command(context, { type: "service", name: "Servicio estructural", description: "", duration: 30, price: 0, staffIds: [snapshot.staff[0].id] });
    expect((await loadSetup(context)).activation).toBe("incomplete");
  });
  it("recognizes a legacy existing business without forcing first-run setup", async () => {
    const { context, snapshot } = await fixture();
    await command(context, { type: "service", name: "Servicio existente", description: "", duration: 30, price: 0, staffIds: [snapshot.staff[0].id] });
    await prisma.businessSetup.delete({ where: { businessId: context.business.id } });
    expect((await loadSetup(context)).activation).toBe("habitual");
  });
  it("expires readiness when a completed verification becomes stale", async () => {
    const { context, snapshot } = await fixture();
    const hours = defaultSetupHours().map(h => ({ ...h, isOpen: true }));
    await command(context, { type: "hours", hours, locationId: snapshot.catalog.locations[0].id });
    await command(context, { type: "staff-hours", hours, locationId: snapshot.catalog.locations[0].id, staffId: snapshot.staff[0].id });
    const withService = await command(context, { type: "service", name: "Servicio con verificación", description: "", duration: 30, price: 0, staffIds: [snapshot.staff[0].id] });
    await command(context, { type: "check", serviceId: withService.catalog.services[0].id, locationId: snapshot.catalog.locations[0].id, optionIds: [] });
    await command(context, { type: "finish" });
    await prisma.businessSetup.update({ where: { businessId: context.business.id }, data: { verifiedAt: new Date(Date.now() - 2 * 86400000) } });
    const stale = await loadSetup(context);
    expect(stale.verified).toBe(false); expect(stale.activation).toBe("incomplete");
  });
  it("rejects foreign professional, service and location references and read access by limited users", async () => {
    const a = await fixture(); const b = await fixture();
    await expect(command(a.context, { type: "staff-hours", hours: defaultSetupHours(), staffId: b.snapshot.staff[0].id, locationId: a.snapshot.catalog.locations[0].id })).rejects.toThrow("sucursal");
    await expect(command(a.context, { type: "hours", hours: defaultSetupHours(), locationId: b.snapshot.catalog.locations[0].id })).rejects.toThrow("Sucursal");
    await expect(command(a.context, { type: "service", name: "Ajeno", description: "", duration: 30, price: 0, staffIds: [b.snapshot.staff[0].id] })).rejects.toThrow("este negocio");
    await expect(command(a.context, { type: "check", serviceId: "foreign-service", locationId: a.snapshot.catalog.locations[0].id, optionIds: [] })).rejects.toThrow("este negocio");
    const limited = await prisma.user.create({ data: { email: `limited-${randomUUID()}@example.invalid`, name: "Limitado", password: "not-a-login-password", role: "STAFF" } });
    fixtures.push({ userId: limited.id, businessId: "__none__" });
    await prisma.staff.create({ data: { businessId: a.context.business.id, userId: limited.id, name: "Limitado" } });
    await expect(setupContext(limited)).rejects.toMatchObject({ status: 403 });
    const help = await learningContext(limited);
    expect(help.tutorials.some(t => t.id === "hours" || t.id === "staff")).toBe(false);
    expect(help.tutorials.some(t => t.id === "today")).toBe(true);
    const savedPartialGuide = await saveLearning(help, { tutorialId: "today", version: 2, step: 0, revision: 0, status: "active" });
    expect(savedPartialGuide.status).toBe("active");
    await expect(saveLearning(help, { tutorialId: "staff", version: 2, step: 0, revision: 0, status: "active" })).rejects.toMatchObject({ status: 403 });
    const scopedAdmin = await prisma.user.create({ data: { email: `scoped-admin-${randomUUID()}@example.invalid`, name: "Administrador de agenda", password: "fixture", role: "ADMIN" } });
    fixtures.push({ userId: scopedAdmin.id, businessId: "__none__" });
    const profile = await prisma.accessProfile.create({ data: { businessId: a.context.business.id, name: `Agenda-${randomUUID()}`, permissions: ["appointments.view_all"] } });
    await prisma.staff.create({ data: { businessId: a.context.business.id, userId: scopedAdmin.id, name: "Administrador de agenda", accessProfileId: profile.id, isActive: true } });
    const adminLearning = await learningContext(scopedAdmin);
    expect(adminLearning.tutorials.some(t => t.id === "today")).toBe(true);
    expect(await saveLearning(adminLearning, { tutorialId: "today", version: 2, step: 0, revision: 0, status: "active" })).toMatchObject({ status: "active" });
  });
  it("rechecks busy dates at completion even when the catalog fingerprint has not changed", async () => {
    const { context, snapshot } = await fixture();
    const withService = await command(context, { type: "service", name: "Verificación final", description: "", duration: 30, price: 0, staffIds: [snapshot.staff[0].id] });
    const checked = await command(context, { type: "check", serviceId: withService.catalog.services[0].id, locationId: snapshot.catalog.locations[0].id, optionIds: [] });
    expect(checked.verified).toBe(true);
    await prisma.blockedDate.create({ data: { businessId: context.business.id, date: new Date(`${checked.verification!.date}T00:00:00Z`) } });
    await expect(command(context, { type: "finish" })).rejects.toThrow("hora disponible cambió");
    expect((await loadSetup(context)).completed).toBe(false);
  });
  it("rejects malformed drafts without persisting a client-controlled shape", async () => {
    const { context } = await fixture();
    await expect(command(context, { type: "draft", step: "services", value: { staffIds: "another-business-id" } })).rejects.toThrow("formato inválido");
    expect((await loadSetup(context)).draft).toEqual({});
  });
  it("creates a professional in the explicitly selected branch when several branches exist", async () => {
    const { context } = await fixture(2);
    const location = await prisma.businessLocation.create({ data: { businessId: context.business.id, name: "Segunda sucursal", slug: "segunda", timezone: "America/Santiago", isActive: true } });
    const result = await command(context, { type: "staff", name: "Segunda persona", locationIds: [location.id] });
    const staff = result.staff.find(s => s.name === "Segunda persona");
    expect(staff?.locationIds).toEqual([location.id]);
    await command(context, { type: "staff-hours", staffId: staff!.id, locationId: location.id, hours: defaultSetupHours() });
    expect((await loadSetup(context)).staff.find(s => s.id === staff!.id)?.hasHours).toBe(true);
  });
  it("does not silently reactivate or duplicate an inactive professional", async () => {
    const { context } = await fixture();
    await prisma.staff.create({ data: { businessId: context.business.id, name: "Archivada", email: "archived@example.invalid", isActive: false } });
    await expect(command(context, { type: "staff", name: "Archivada", email: "archived@example.invalid" })).rejects.toThrow("ficha inactiva");
    expect(await prisma.staff.count({ where: { businessId: context.business.id } })).toBe(2);
    expect((await loadSetup(context)).capacity.current).toBe(1);
  });
  it("keeps learning progress per user and version, closes without completion, and allows explicit restart", async () => {
    const { context } = await fixture(); const learning = await learningContext(context.user);
    const active = await saveLearning(learning, { tutorialId: "services", version: 2, step: 0, revision: 0, status: "active" });
    const paused = await saveLearning(learning, { tutorialId: "services", version: 2, step: 1, revision: active.revision, status: "paused" });
    expect(paused.status).toBe("paused");
    const done = await saveLearning(learning, { tutorialId: "services", version: 2, step: 2, revision: paused.revision, status: "completed" });
    expect(done.status).toBe("completed");
    await expect(saveLearning(learning, { tutorialId: "services", version: 1, step: 0, revision: 0, status: "active" })).rejects.toMatchObject({ status: 403 });
    await expect(saveLearning(learning, { tutorialId: "services", version: 2, step: 0, revision: done.revision, status: "active" })).rejects.toMatchObject({ status: 409 });
    expect((await saveLearning(learning, { tutorialId: "services", version: 2, step: 0, revision: done.revision, status: "active", reset: true })).step).toBe(0);
  });
  it("revalidates learning authorization after its advisory lock", async () => {
    const { context } = await fixture();
    const learning = await learningContext(context.user);
    const result = await whileLearningLock(context.business.id, context.user.id, "services", () => saveLearning(learning, { tutorialId: "services", version: 2, step: 0, revision: 0, status: "active" }), async client => {
      await client.query('UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1 WHERE id = $1', [context.user.id]);
    });
    expect(result).toMatchObject({ error: expect.objectContaining({ status: 403 }) });
    expect(await prisma.tutorialProgress.count({ where: { businessId: context.business.id, userId: context.user.id } })).toBe(0);
  });
  it("revokes a partial professional's authorized tutorial after the advisory lock", async () => {
    const f = await fixture();
    const partial = await prisma.user.create({ data: { email: `partial-${randomUUID()}@example.invalid`, name: "Profesional parcial", password: "fixture", role: "STAFF" } });
    fixtures.push({ userId: partial.id, businessId: "__none__" });
    await prisma.staff.create({ data: { businessId: f.context.business.id, userId: partial.id, name: "Profesional parcial", isActive: true } });
    const learning = await learningContext(partial);
    expect(learning.tutorials.some(t => t.id === "today")).toBe(true);
    const result = await whileLearningLock(f.context.business.id, partial.id, "today", () => saveLearning(learning, { tutorialId: "today", version: 2, step: 0, revision: 0, status: "active" }), async client => {
      await client.query('UPDATE "Staff" SET "isActive" = false WHERE "businessId" = $1 AND "userId" = $2', [f.context.business.id, partial.id]);
    });
    expect(result).toMatchObject({ error: expect.objectContaining({ status: 403 }) });
    expect(await prisma.tutorialProgress.count({ where: { businessId: f.context.business.id, userId: partial.id } })).toBe(0);
  });
  it("serves authenticated uncached setup and rejects CSRF and a tampered session", async () => {
    const { user, context, snapshot } = await fixture();
    const token = createSessionToken(user);
    const headers = { origin: "http://localhost", cookie: `${AUTH_COOKIE_NAME}=${token}` };
    const read = await setupGet(new NextRequest("http://localhost/api/dashboard/setup", { headers }));
    expect(read.status).toBe(200); expect(read.headers.get("cache-control")).toBe("private, no-store");
    const response = await setupPost(new NextRequest("http://localhost/api/dashboard/setup", { method: "POST", headers: { ...headers, origin: "https://evil.example" }, body: JSON.stringify({ key: randomUUID(), revision: snapshot.revision, command: { type: "pause" } }) }));
    expect(response.status).toBe(403);
    expect((await loadSetup(context)).paused).toBe(false);
    expect((await setupGet(new NextRequest("http://localhost/api/dashboard/setup", { headers: { cookie: `${AUTH_COOKIE_NAME}=tampered` } }))).status).toBe(401);
  });
  it("connects Puri to the same authorized guides without calling OpenAI", async () => {
    const { context } = await fixture();
    const puri = await createPuriContext(context.user, { pathname: "/dashboard", locale: "es" });
    const result = await answerLearningQuestion(puri, "¿Cómo agrego un profesional?");
    expect(result?.guides?.[0].href).toBe("/dashboard/staff?learn=staff");
    expect(result?.toolsUsed).toEqual(["recommendTutorial"]);
    expect(await answerLearningQuestion(puri, "Cuántas citas tengo hoy")).toBeNull();
  });
  it("prepares natural-language hours without domain writes, then saves the reviewed proposal through the real mutation", async () => {
    const { context, snapshot } = await fixture();
    const puri = await createPuriContext(context.user, { pathname: "/dashboard/setup", locale: "es" });
    const result = await answerSetupWithPuri({ context: puri, setup: { step: "hours", locationId: snapshot.locations[0].id, revision: snapshot.revision }, message: "Lunes a viernes de 10 a 19 con pausa de 13 a 14. Sábados hasta las 14", history: [] });
    expect(result.setup?.mode).toBe("rules");
    const proposal = result.setup?.proposal;
    expect(proposal?.kind).toBe("hours"); if (proposal?.kind !== "hours") throw new Error("Expected structured hours proposal");
    expect((await loadSetup(context)).revision).toBe(snapshot.revision);
    expect(await prisma.appointment.count({ where: { businessId: context.business.id } })).toBe(0);
    const confirmed = await command(context, { type: "hours", locationId: snapshot.locations[0].id, hours: proposal.hours });
    expect(confirmed.locations[0].hours.find(h => h.dayOfWeek === 1)).toMatchObject({ startTime: "10:00", endTime: "19:00", breakStart: "13:00", breakEnd: "14:00" });
  });
  it("explains a genuine service/professional mismatch and repairs only the confirmed association", async () => {
    const { context, snapshot } = await fixture();
    await command(context, { type: "service", name: "Servicio asignado", description: "", duration: 30, price: 0, staffIds: [snapshot.staff[0].id] });
    const other = await createService({ businessId: context.business.id, name: "Servicio por asociar", description: "", duration: 30, price: 0 });
    const checked = await command(context, { type: "check", locationId: snapshot.locations[0].id, serviceId: other.id, optionIds: [] });
    expect(checked.verified).toBe(false); expect(checked.verification?.error).toContain("profesional habilitado");
    const puri = await createPuriContext(context.user, { pathname: "/dashboard/setup", locale: "es" });
    const response = await answerSetupWithPuri({ context: puri, setup: { step: "check", locationId: snapshot.locations[0].id, revision: checked.revision }, message: "¿Puedes preparar la corrección?", history: [] });
    expect(response.setup?.proposal).toEqual({ kind: "assign-service", staffId: snapshot.staff[0].id, serviceId: other.id });
    expect((await loadSetup(context)).staff[0].serviceIds).not.toContain(other.id);
    await command(context, { type: "assign-service", staffId: snapshot.staff[0].id, serviceId: other.id });
    expect((await command(context, { type: "check", locationId: snapshot.locations[0].id, serviceId: other.id, optionIds: [] })).verified).toBe(true);
    await expect(command(context, { type: "assign-service", staffId: "foreign-staff", serviceId: other.id })).rejects.toMatchObject({ status: 403 });
  });
  it("invalidates activation after services are archived and strips unrecognized draft fields", async () => {
    const { context, snapshot } = await fixture();
    await command(context, { type: "profile", mode: "solo", industry: "" });
    const withService = await command(context, { type: "service", name: "Servicio temporal", description: "", duration: 30, price: 0, staffIds: [snapshot.staff[0].id] });
    const service = withService.catalog.services[0];
    await command(context, { type: "check", locationId: snapshot.locations[0].id, serviceId: service.id, optionIds: [] });
    expect((await command(context, { type: "finish" })).completed).toBe(true);
    await deleteService(service.id, context.business.id);
    const removed = await loadSetup(context);
    expect(removed.verified).toBe(false); expect(removed.activation).toBe("incomplete"); expect(removed.issues[0].code).toBe("NO_SERVICE");
    await command(context, { type: "draft", step: "staff", value: { name: "Borrador", email: "", type: "assign-service", foreignBusinessId: "foreign" } });
    expect((await loadSetup(context)).draft.staff).toEqual({ name: "Borrador", email: "" });
  });
  it("enables RLS and revokes public Data API access to all onboarding tables", async () => {
    const tables = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('BusinessSetup','SetupOperation','TutorialProgress') AND relnamespace='public'::regnamespace`;
    expect(tables).toHaveLength(3); expect(tables.every(t => t.relrowsecurity)).toBe(true);
    const grants = await prisma.$queryRaw<Array<{ table_name: string }>>`SELECT table_name FROM information_schema.role_table_grants WHERE table_name IN ('BusinessSetup','SetupOperation','TutorialProgress') AND grantee IN ('PUBLIC','anon','authenticated')`;
    expect(grants).toHaveLength(0);
  });
});
