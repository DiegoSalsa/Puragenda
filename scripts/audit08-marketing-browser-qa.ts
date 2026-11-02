// 08-C1: HTTP y Chrome reales; sólo PostgreSQL desechable y tráfico loopback.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/server/db/prisma";
import { growthFixture, deleteGrowthFixture } from "../tests/fixtures/puri-growth";
import { createSessionToken, AUTH_COOKIE_NAME } from "../src/server/auth/session";
import { ANALYTICS_POLICY_VERSION } from "../src/lib/analytics/policy";
import { CHANGELOG_DATA } from "../src/config/changelog";

async function main() {
  assert.equal(process.env.NEXT_STAGING_NETWORK_GUARD, "1");
  assert.ok(!process.env.RESEND_API_KEY && !process.env.CONTACT_FLOW_PRODUCTION_RESEND_API_KEY);
  const reproduce = process.argv.includes("--reproduce");
  const disabled = process.argv.includes("--contact-flow-disabled");
  const require = createRequire(resolve(process.env.PURI_QA_NODE_MODULES ?? ".", "package.json"));
  const { chromium } = require("playwright");
  const dir = "scratch/audit08/marketing-c1";
  mkdirSync(dir, { recursive: true });
  const legacy = await growthFixture({ team: true, history: false });
  const basic = await growthFixture({ history: false });
  const plus = await growthFixture({ history: false });
  const fixtures = [legacy, basic, plus];
  await prisma.commercialSubscription.delete({ where: { businessId: legacy.businessId } });
  await prisma.commercialSubscription.update({ where: { businessId: basic.businessId }, data: { planCode: "PURAGENDA", basePriceClp: 12990, totalPriceClp: 12990 } });
  for (const [f, plan] of [[basic, "PURAGENDA"], [plus, "PURAGENDA_PLUS"]] as const)
    await prisma.subscription.update({ where: { businessId: f.businessId }, data: { plan } });
  const sentAt = new Date(); sentAt.setUTCMonth(sentAt.getUTCMonth() - 1);
  await prisma.marketingCampaign.create({ data: { businessId: legacy.businessId, subject: "Historial sintético 08-C1", body: "Contenido sintético", audienceSize: 2, sentAt } });
  const log = createWriteStream(`${dir}/next-dev.log`);
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3119"], { env: process.env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  child.stdout.pipe(log); child.stderr.pipe(log);
  const origin = "http://127.0.0.1:3119";
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const checks: string[] = [], responses: unknown[] = [], errors: string[] = [];
  let restrictedUserId: string | undefined;
  let visitNumber = 0;
  function check(name: string, condition: unknown) { assert.ok(condition, name); checks.push(name); }
  try {
    const deadline = Date.now() + 90000;
    while (true) {
      try { if ((await fetch(origin + "/api/marketing/status")).status === 401) break; } catch {}
      if (Date.now() > deadline) throw Error("QA_SERVER_START_TIMEOUT");
      await new Promise(r => setTimeout(r, 300));
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.PURI_QA_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
    async function visit(f: typeof legacy, user = f.user) {
      // Separate synthetic clients preserve the real 3/hour sending limiter.
      const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, extraHTTPHeaders: { "x-forwarded-for": `198.18.0.${++visitNumber}` } });
      await context.route("**/*", (route: { request: () => { url: () => string }; continue: () => Promise<void>; abort: () => Promise<void> }) => route.request().url().startsWith(origin + "/") ? route.continue() : route.abort());
      await context.addCookies([
        { name: "puragenda_changelog_seen", value: CHANGELOG_DATA[0].version, url: origin },
        { name: AUTH_COOKIE_NAME, value: createSessionToken({ ...user, tokenVersion: user.tokenVersion }), url: origin },
      ]);
      await context.addInitScript((version: string) => {
        localStorage.setItem("puragenda_cookie_consent", "rejected");
        localStorage.setItem("puragenda_cookie_consent_version", version);
      }, ANALYTICS_POLICY_VERSION);
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(120000);
      page.on("pageerror", (e: Error) => errors.push(e.message));
      await page.goto(origin + "/dashboard/marketing", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some(b => Object.keys(b).some(k => k.startsWith("__reactProps$"))));
      return { context, page };
    }
    for (const [name, f, code] of [["legacy", legacy, "LEGACY_MARKETING_REVIEW_REQUIRED"], ["basic", basic, "CONTACT_FLOW_REQUIRED"], ["plus", plus, "CONTACT_FLOW_REQUIRED"]] as const) {
      const { context, page } = await visit(f);
      const statusResponse = await context.request.get(origin + "/api/marketing/status");
      const status = await statusResponse.json();
      check(`${name}: status HTTP 200`, statusResponse.status() === 200);
      for (const key of ["campaignsSentThisMonth", "maxCampaignsPerMonth", "maxAudienceSize", "plan", "lastCampaign"])
        check(`${name}: lector anterior conserva ${key}`, key in status);
      const send = () => context.request.post(origin + "/api/marketing/send", { headers: { Origin: origin }, data: { subject: "Prueba sintética", message: "No entregar", sendingEnabled: true, legacySendingPaused: false } });
      if (reproduce) {
        check(`${name}: formulario legacy visible antes de corregir`, await page.locator("#campaign-subject").count() === 1);
        if (name === "legacy") {
          check("legacy: API presenta cupos utilizables antes de corregir", status.maxCampaignsPerMonth > status.campaignsSentThisMonth && status.maxAudienceSize > 0);
          await page.locator("#campaign-subject").fill("Prueba sintética");
          await page.locator("#campaign-message").fill("No entregar");
          check("legacy: botón de envío habilitado antes de corregir", await page.locator("#btn-nueva-campana").isEnabled());
          const response = page.waitForResponse((r: { url: () => string }) => r.url().endsWith("/api/marketing/send"));
          await page.locator("#btn-nueva-campana").click();
          const actual = await response;
          check("legacy: envío desde navegador rechazado 409", actual.status() === 409 && (await actual.json()).code === code);
        }
      } else {
        check(`${name}: sin formulario legacy ni CTA de envío`, await page.locator("#campaign-subject, #campaign-message, #btn-nueva-campana").count() === 0);
        check(`${name}: API pausa explícita sin capacidad`, status.legacySendingPaused === true && status.sendingEnabled === false && status.maxCampaignsPerMonth === 0 && status.maxAudienceSize === 0);
        check(`${name}: lectura no cacheable`, (statusResponse.headers()["cache-control"] ?? "").includes("no-store"));
        if (name === "legacy") {
          check("legacy: historial conservado", await page.getByText("Historial sintético 08-C1", { exact: true }).count() === 1);
          check("legacy: explicación de pausa y condiciones históricas", (await page.locator("#marketing-status").innerText()).includes("revisión de seguridad") && (await page.locator("#marketing-status").innerText()).includes("condiciones históricas"));
          check("legacy: sin compra forzada", await page.locator('#tutorial-main a[href="/pricing"]').count() === 0);
        }
        if (name === "basic") check("básico: explica falta de derecho sin enlace", status.availability.state === "CONTACT_FLOW_NOT_INCLUDED" && !status.availability.contactFlowHref && await page.locator('a[href="/dashboard/puri-plus"]').filter({ hasText: "Revisar Contact Flow" }).count() === 0);
        if (name === "plus") {
          if (disabled) {
            check("plus: módulo desactivado sin enlace ni anuncio operativo", status.availability.state === "CONTACT_FLOW_DISABLED" && !status.availability.contactFlowHref && await page.getByRole("link", { name: "Revisar Contact Flow" }).count() === 0);
            check("plus: explica función desactivada", (await page.locator("#marketing-status").innerText()).includes("función está desactivada"));
          } else {
            check("plus: acceso autorizado sin afirmar entregas activas", status.availability.state === "CONTACT_FLOW_REVIEW" && status.availability.contactFlowHref === "/dashboard/puri-plus" && status.availability.contactFlowDeliveryEnabled === false);
            check("plus: enlace al espacio autorizado", await page.getByRole("link", { name: "Revisar Contact Flow" }).count() === 1);
            check("plus: avisa envíos desactivados", (await page.locator("#marketing-status").innerText()).includes("envíos comerciales están desactivados"));
          }
        }
      }
      const response = await send(); const body = await response.json();
      check(`${name}: backend 409 inalterable por parámetros`, response.status() === 409 && body.code === code);
      responses.push({ name, status, sendStatus: response.status(), sendCode: body.code });
      await page.setViewportSize({ width: 390, height: 844 });
      if (!reproduce) {
        check(`${name}: móvil sin desbordamiento`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
        if (name === "legacy") {
          // El recorrido se abre sólo mediante el sistema de ayuda contextual existente.
          await page.locator('[data-tour="contextual-help"]:visible').last().click();
          await page.locator(".driver-popover").waitFor();
          const tutorial = await page.locator(".driver-popover").innerText();
          check("legacy: tutorial móvil explica consulta sin invitar a enviar", tutorial.includes("Consulta") && !tutorial.includes("Prepara campañas"));
          await page.locator(".driver-popover-close-btn").click();
        }
      }
      await page.screenshot({ path: `${dir}/${reproduce ? "antes" : "despues"}-${name}-mobile.png`, fullPage: true });
      await context.close();
    }
    if (!reproduce) {
      for (const suspended of [true, false]) {
        await prisma.commercialSubscription.update({ where: { businessId: plus.businessId }, data: suspended ? { status: "PAST_DUE_BLOCKED" } : { status: "ACTIVE", periodEnd: new Date(Date.now() - 10 * 86400000), gracePeriodEndsAt: null } });
        const { context, page } = await visit(plus);
        const s = await (await context.request.get(origin + "/api/marketing/status")).json();
        check(`plus ${suspended ? "suspendido" : "vencido"}: sin acceso Contact Flow`, s.availability.state === "SUBSCRIPTION_INACTIVE" && !s.availability.contactFlowHref && await page.getByRole("link", { name: "Revisar Contact Flow" }).count() === 0);
        check("plus sin acceso: backend 403", (await context.request.post(origin + "/api/marketing/send", { headers: { Origin: origin }, data: {} })).status() === 403);
        await context.close();
      }
      const staff = await prisma.user.create({ data: { name: "Profesional sintético", email: `staff-${legacy.businessId}@example.invalid`, password: "synthetic-no-login", role: "STAFF" } });
      restrictedUserId = staff.id;
      await prisma.staff.update({ where: { id: legacy.staff!.id }, data: { userId: staff.id } });
      const { context, page } = await visit(legacy, staff);
      check("sin permiso: API 403", (await context.request.get(origin + "/api/marketing/status")).status() === 403);
      check("sin permiso: sin historial ni formulario", await page.getByText("Historial sintético 08-C1", { exact: true }).count() === 0 && await page.locator("#campaign-subject").count() === 0);
      check("sin permiso: envío 403", (await context.request.post(origin + "/api/marketing/send", { headers: { Origin: origin }, data: {} })).status() === 403);
      await context.close();
      check("sin errores del navegador", errors.length === 0);
    }
    const report = { mode: reproduce ? "reproduccion-previa" : disabled ? "contact-flow-desactivado" : "correccion", checks, responses, pageErrors: errors, externalServerIO: "blocked", providerCredentials: "absent" };
    writeFileSync(`${dir}/${reproduce ? "before" : disabled ? "disabled" : "after"}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally {
    await browser?.close();
    if (child.exitCode === null) {
      const exited = new Promise<void>(r => child.once("exit", () => r()));
      child.kill(); await exited;
    }
    log.end();
    for (const f of fixtures) await deleteGrowthFixture(f);
    if (restrictedUserId) await prisma.user.delete({ where: { id: restrictedUserId } });
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
