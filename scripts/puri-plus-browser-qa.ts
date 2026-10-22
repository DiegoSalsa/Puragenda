import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/server/db/prisma";
import {
  growthFixture,
  deleteGrowthFixture,
} from "../tests/fixtures/puri-growth";
import {
  createSessionToken,
  AUTH_COOKIE_NAME,
} from "../src/server/auth/session";
import { ANALYTICS_POLICY_VERSION } from "../src/lib/analytics/policy";
import { CHANGELOG_DATA } from "../src/config/changelog";
import { configureContactPolicy } from "../src/server/contact-flow/quotas";
import { recordConsent } from "../src/server/contact-flow/consent";
import { digest } from "../src/server/contact-flow/policy";
import { syntheticContactPolicy } from "../tests/fixtures/contact-flow";
import { createClientPortalAccountSession, CLIENT_PORTAL_COOKIE_NAME } from "../src/server/services/client-portal.service";

async function main() {
  const require = createRequire(
    process.env.PURI_QA_NODE_MODULES
      ? resolve(process.env.PURI_QA_NODE_MODULES, "package.json")
      : resolve("package.json"),
  );
  // Optional QA dependency; no runtime browser dependency is added to the product.
  const { chromium } = require("playwright");
  mkdirSync("scratch/puri-plus-qa", { recursive: true });
  const log = createWriteStream("scratch/puri-plus-qa/next-dev.log");
  const f = await growthFixture(),
    standard = await growthFixture({ history: false });
  await configureContactPolicy("GLOBAL", syntheticContactPolicy);
  await configureContactPolicy(f.businessId, syntheticContactPolicy);
  const syntheticClients = await prisma.client.findMany({
    where: { businessId: f.businessId },
    orderBy: { email: "asc" },
    take: 4,
  });
  for (const c of syntheticClients)
    await recordConsent(f.scope, {
      clientId: c.id,
      source: "SYNTHETIC_FORM",
      accepted: true,
      textVersion: "cf-commercial-email-v1",
      evidenceRef: `synthetic:browser:${c.id}`,
      evidenceHash: digest(`synthetic-accept:${c.id}`),
      grantedAt: new Date(Date.now() - 60000).toISOString(),
    });
  await prisma.commercialSubscription.update({
    where: { businessId: standard.businessId },
    data: { planCode: "PURAGENDA", basePriceClp: 12990, totalPriceClp: 12990 },
  });
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3119",
    ],
    { env: process.env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  const origin = "http://127.0.0.1:3119";
  let browser;
  let portalAccountId: string | undefined;
  try {
    const deadline = Date.now() + 90000;
    while (true) {
      try {
        const r = await fetch(origin + "/api/internal/puri-plus", {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: '{"action":"LOAD"}',
        });
        if (r.status === 401) break;
      } catch {}
      if (Date.now() > deadline) throw new Error("QA_SERVER_START_TIMEOUT");
      await new Promise((r) => setTimeout(r, 300));
    }
    browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.PURI_QA_CHROME ??
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    });
    await context.route(
      "**/*",
      (route: {
        request: () => { url: () => string };
        abort: () => Promise<void>;
        continue: () => Promise<void>;
      }) =>
        route.request().url().startsWith(origin)
          ? route.continue()
          : route.abort(),
    );
    await context.addCookies([
      { name: "puragenda_changelog_seen", value: CHANGELOG_DATA[0].version, url: origin },
      {
        name: AUTH_COOKIE_NAME,
        value: createSessionToken({
          ...f.user,
          tokenVersion: f.user.tokenVersion,
        }),
        url: origin,
      },
    ]);
    await context.addInitScript((version: string) => {
      localStorage.setItem("puragenda_cookie_consent", "rejected");
      localStorage.setItem("puragenda_cookie_consent_version", version);
    }, ANALYTICS_POLICY_VERSION);
    const page = await context.newPage(),
      errors: string[] = [];
    page.on("pageerror", (e: Error) => errors.push(e.message));
    await page.goto(origin + "/internal/puri-plus", {
      waitUntil: "networkidle",
    });
    assert.match(await page.title(), /Puri/);
    assert.equal(
      await page.locator('meta[name="robots"]').getAttribute("content"),
      "noindex, nofollow",
    );
    async function click(name: string, container = page) {
      const done = page.waitForResponse(
        (r: { url: () => string; request: () => { method: () => string } }) =>
          r.url().endsWith("/api/internal/puri-plus") &&
          r.request().method() === "POST",
      );
      await container.getByRole("button", { name, exact: true }).click();
      const r = await done;
      assert.equal(r.status(), 200, await r.text());
      await page
        .getByText("Puri está verificando los datos…", { exact: true })
        .waitFor({ state: "hidden" });
    }
    await click("Analizar oportunidades");
    const card = page.locator("article").filter({
      has: page.getByRole("heading", {
        name: "Clientes que podrían volver",
        exact: true,
      }),
    });
    await click("Ver recomendación", card);
    await click("Ver evidencia y propuesta");
    await click("Preparar estrategia");
    await click("Revisar evidencia actual");
    const approve = page.getByRole("button", {
      name: "Aprobar propuesta",
      exact: true,
    });
    assert.equal(await approve.isDisabled(), true);
    await page
      .getByRole("checkbox", { name: /He revisado esta versión/ })
      .check();
    await click("Aprobar propuesta");
    await page.getByText("Aprobada · sin ejecución", { exact: true }).waitFor();
    const r = await prisma.puriGrowthRecommendation.findFirstOrThrow({
      where: { businessId: f.businessId, status: "APPROVED" },
    });
    assert.equal(r.executable, false);
    assert.equal(
      await prisma.puriGrowthAudit.count({
        where: { recommendationId: r.id, event: "APPROVED" },
      }),
      1,
    );
    await page
      .getByLabel("Pregunta sobre las oportunidades")
      .fill("Explícame la oportunidad principal");
    await click("Consultar");
    await page
      .getByText(/Explicación determinista; IA no disponible/)
      .waitFor();
    page.on(
      "dialog",
      (dialog: { accept: () => Promise<void> }) => void dialog.accept(),
    );
    async function contactClick(name: string) {
      const done = page.waitForResponse(
        (r: { url: () => string; request: () => { method: () => string } }) =>
          r.url().endsWith("/api/internal/contact-flow") &&
          r.request().method() === "POST",
      );
      await page.getByRole("button", { name, exact: true }).click();
      const response = await done;
      assert.equal(response.status(), 200, await response.text());
      await page
        .getByText("Verificando Contact Flow…", { exact: true })
        .waitFor({ state: "hidden" });
    }
    await contactClick("Preparar campaña");
    await page.getByText(/4 destinatarios elegibles · 1 excluidos/).waitFor();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Autorizar ejecución simulada",
          exact: true,
        })
        .isDisabled(),
      true,
    );
    await page.getByText("Vista previa del correo", { exact: true }).click();
    await page
      .getByText("Darme de baja comercial (sin iniciar sesión)", {
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("checkbox", {
        name: "Autorizo ejecución simulada",
        exact: true,
      })
      .check();
    await contactClick("Autorizar ejecución simulada");
    assert.equal(
      await prisma.cfAuthorization.count({
        where: { businessId: f.businessId },
      }),
      1,
    );
    assert.equal(
      await prisma.cfOutbox.count({ where: { businessId: f.businessId } }),
      4,
    );
    await contactClick("Pausar campaña");
    await page.getByText("Pausada", { exact: true }).waitFor();
    await contactClick("Reanudar campaña");
    await contactClick("Bloquear simulación del negocio");
    assert.equal(
      (
        await prisma.cfPolicy.findUniqueOrThrow({
          where: { key: f.businessId },
        })
      ).killed,
      true,
    );
    await contactClick("Desbloquear simulación del negocio");
    await contactClick("Ejecutar laboratorio");
    assert.equal(
      await prisma.cfMessage.count({
        where: { businessId: f.businessId, state: "ACCEPTED" },
      }),
      4,
    );
    await page
      .getByText("Aceptados por simulador: 4", { exact: true })
      .waitFor();
    await contactClick("Reconciliar entregas simuladas");
    await page
      .getByText("Entregas simuladas confirmadas: 4", { exact: true })
      .waitFor();
    const bookingToken = await prisma.cfToken.findFirstOrThrow({
      where: { businessId: f.businessId, kind: "BOOKING" },
      include: { enrollment: { include: { client: true } } },
    });
    const { signature } = await import("../src/server/contact-flow/policy");
    const bookingValue = `${bookingToken.id}.${signature(`BOOKING:${bookingToken.id}:${bookingToken.expiresAt.toISOString()}`)}`;
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: f.businessId },
      select: { apiKey: true, slug: true },
    });
    const bookingStart = f.day(-10);
    const booked = await context.request.post(
      `${origin}/api/business/${business.slug}/book`,
      {
        headers: { Origin: origin, "x-api-key": business.apiKey },
        data: {
          serviceId: f.service.id,
          serviceIds: [f.service.id],
          locationId: f.location.id,
          customerName: "Synthetic Contact Flow booking",
          customerEmail: bookingToken.enrollment.client.email,
          customerPhone: "+56000000000",
          startTime: bookingStart.toISOString(),
          endTime: new Date(+bookingStart + 3600000).toISOString(),
          contactFlowToken: bookingValue,
        },
      },
    );
    assert.equal(booked.status(), 201, await booked.text());
    const attributed = await prisma.cfAttribution.findFirstOrThrow({
      where: { businessId: f.businessId },
    });
    await prisma.appointment.update({
      where: { id: attributed.appointmentId },
      data: { status: "COMPLETED", settledAt: new Date() },
    });
    await contactClick("Ver resultados verificables");
    await page
      .getByText("Atribución técnica verificable", { exact: true })
      .waitFor();
    await page.getByText(/Reservas asociadas: 1 · completadas: 1/).waitFor();
    assert.equal(
      (await page.content()).includes("private-0@example.invalid"),
      false,
    );
    const unsubscribeToken = await prisma.cfToken.findFirstOrThrow({
      where: { businessId: f.businessId, kind: "UNSUBSCRIBE" },
    });
    const value = `${unsubscribeToken.id}.${signature(`UNSUBSCRIBE:${unsubscribeToken.id}:${unsubscribeToken.expiresAt.toISOString()}`)}`;
    const anonymous = await browser.newContext(),
      optout = await anonymous.newPage();
    await optout.goto(
      `${origin}/contact-flow/unsubscribe?token=${encodeURIComponent(value)}`,
    );
    assert.equal((await optout.content()).includes("@example.invalid"), false);
    await optout
      .getByRole("button", { name: "Confirmar baja comercial" })
      .click();
    await optout.getByText(/La baja comercial quedó registrada/).waitFor();
    assert.equal(
      await prisma.cfSuppression.count({
        where: { businessId: f.businessId, reason: "UNSUBSCRIBE" },
      }),
      1,
    );
    await anonymous.close();
    await page.screenshot({
      path: "scratch/puri-plus-qa/desktop.png",
      fullPage: true,
    });
    await page.locator('section[aria-labelledby="contact-flow-title"]').screenshot({path:"scratch/puri-plus-qa/contact-flow-desktop.png"});
    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    assert.equal(desktopOverflow, false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "scratch/puri-plus-qa/mobile.png",
      fullPage: true,
    });
    await page.locator('section[aria-labelledby="contact-flow-title"]').screenshot({path:"scratch/puri-plus-qa/contact-flow-mobile.png"});
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
    );
    const unlabeled = await page
      .locator("button")
      .evaluateAll(
        (buttons: HTMLButtonElement[]) =>
          buttons.filter(
            (b) => !b.textContent?.trim() && !b.getAttribute("aria-label"),
          ).length,
      );
    assert.equal(unlabeled, 0);
    // The commercial workspace is now part of the existing dashboard shell.
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.goto(origin + "/dashboard/puri-plus", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Puri+ y Contact Flow", exact: true }).waitFor();
    await page.getByText("$22.990 CLP · IVA incluido", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ path: "scratch/puri-plus-qa/dashboard-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ path: "scratch/puri-plus-qa/dashboard-mobile.png", fullPage: true });
    await page.getByRole("link", { name: "Configuración y límites", exact: true }).click();
    await page.getByRole("heading", { name: "Configuración comercial", exact: true }).waitFor();
    await page.getByText("Envíos productivos: desactivados.", { exact: false }).waitFor();
    const bookingPage = await context.newPage();
    bookingPage.on("pageerror", (e: Error) => errors.push(e.message));
    const widgetDate = f.day(-11).toISOString().slice(0, 10);
    await bookingPage.goto(`${origin}/widget/${business.slug}?service=${f.service.id}&location=${f.location.slug}&date=${widgetDate}`, { waitUntil: "networkidle" });
    await bookingPage.getByRole("button", { name: /^\d{2}:\d{2}$/ }).filter({ visible: true }).first().click();
    await bookingPage.getByRole("button", { name: "Continuar con mis datos", exact: true }).click();
    const optin = bookingPage.getByRole("checkbox", { name: /Acepto recibir comunicaciones comerciales/ });
    assert.equal(await optin.isChecked(), false);
    const portalEmail = `browser-consent-${f.businessId}@example.invalid`;
    await bookingPage.getByPlaceholder("Alex Morgan", { exact: true }).fill("Synthetic consenting customer");
    await bookingPage.locator('input[type="email"]').fill(portalEmail);
    await bookingPage.locator('input[type="tel"]').fill("+56911111111");
    const submit = bookingPage.getByRole("button", { name: "Confirmar reserva", exact: true });
    assert.equal(await submit.isEnabled(), true); // Optional means unchecked can book.
    await optin.check();
    const created = bookingPage.waitForResponse((r: { url: () => string }) => r.url().endsWith(`/api/business/${business.slug}/book`));
    await submit.click(); const bookingResponse = await created; assert.equal(bookingResponse.status(), 201, await bookingResponse.text());
    const client = await prisma.client.findUniqueOrThrow({ where: { businessId_email: { businessId: f.businessId, email: portalEmail } } });
    assert.equal((await prisma.cfConsent.findFirstOrThrow({ where: { businessId: f.businessId, clientId: client.id } })).state, "PENDING_VERIFICATION");
    const portalAccount = await prisma.clientPortalAccount.create({ data: { name: "Synthetic verified account", email: portalEmail, passwordHash: "synthetic-no-login", emailVerifiedAt: new Date() } });
    portalAccountId = portalAccount.id;
    await context.addCookies([{ name: CLIENT_PORTAL_COOKIE_NAME, value: await createClientPortalAccountSession(portalEmail), url: origin }]);
    await bookingPage.goto(origin + "/mi-agenda", { waitUntil: "domcontentloaded" });
    await bookingPage.getByRole("button", { name: "Acepto recibir correos", exact: true }).click();
    await bookingPage.getByText("Consentimiento registrado", { exact: true }).waitFor();
    await bookingPage.getByRole("button", { name: "Retirar consentimiento", exact: true }).click();
    await bookingPage.getByText("Baja o supresión vigente", { exact: true }).waitFor();
    assert.equal(await prisma.cfSuppression.count({ where: { businessId: f.businessId, clientId: client.id } }), 1);
    await bookingPage.screenshot({ path: "scratch/puri-plus-qa/portal-consent-mobile.png", fullPage: true });
    const standardContext = await browser.newContext();
    await standardContext.addCookies([
      {
        name: AUTH_COOKIE_NAME,
        value: createSessionToken({
          ...standard.user,
          tokenVersion: standard.user.tokenVersion,
        }),
        url: origin,
      },
    ]);
    const denied = await standardContext.request.post(
      origin + "/api/internal/puri-plus",
      { headers: { Origin: origin }, data: { action: "ANALYZE" } },
    );
    assert.equal(denied.status(), 403);
    assert.equal(
      await prisma.puriGrowthRun.count({
        where: { businessId: standard.businessId },
      }),
      0,
    );
    assert.deepEqual(errors, []);
    const report = {
      flow: "SQL → signal → recommendation → proposal approval → campaign → exclusions → execution authorization → durable outbox → simulated acceptance → authenticated reconciliation → results → anonymous unsubscribe",
      approved: 1,
      executable: false,
      standardDenied: true,
      realProviderCalls: 0,
      simulatedAccepted:4,
      simulatedDelivered:4,
      attributedBookings:1,
      completedBookings:1,
      incrementalBookings:null,
      viewports: [
        { width: 1440, height: 1050 },
        { width: 390, height: 844 },
      ],
      horizontalOverflow: false,
      pageErrors: errors,
      checks: [
        "CONTACT_PREVIEW_AND_CONSENT_EXCLUSIONS",
        "SEPARATE_EXECUTION_AUTHORIZATION",
        "PAUSE_RESUME_AND_BUSINESS_KILL_SWITCH",
        "DURABLE_SIMULATED_ACCEPTANCE",
        "AUTHENTICATED_DELIVERY_RECONCILIATION",
        "TECHNICAL_ATTRIBUTION_RESULTS",
        "SIGNED_ATTRIBUTION_THROUGH_REAL_BOOKING_HTTP",
        "ANONYMOUS_SIGNED_UNSUBSCRIBE_NO_PII",
        "APPROVED_SQL_FLOW_AND_AUDIT",
        "EXPLICIT_APPROVAL_CHECKBOX",
        "STANDARD_API_403_AND_ZERO_RUNS",
        "DESKTOP_NO_OVERFLOW",
        "MOBILE_NO_OVERFLOW",
        "NOINDEX_METADATA",
        "BUTTON_ACCESSIBLE_NAMES",
        "DETERMINISTIC_CHAT_FALLBACK",
        "ZERO_PAGE_ERRORS",
        "DASHBOARD_DESKTOP_AND_MOBILE",
        "VAT_INCLUDED_PLAN_OFFER",
        "OWNER_CONFIGURATION_AND_USAGE",
        "REAL_WIDGET_OPTIONAL_UNCHECKED_CONSENT",
        "BROWSER_BOOKING_PENDING_EMAIL_VERIFICATION",
        "VERIFIED_PORTAL_OPTIN_AND_REVOCATION",
      ],
    };
    writeFileSync(
      "scratch/puri-plus-qa/result.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } finally {
    await browser?.close();
    child.kill();
    await new Promise<void>((r) => child.once("exit", () => r()));
    log.end();
    await prisma.cfAttribution.deleteMany({
      where: { businessId: f.businessId },
    });
    await prisma.cfCampaign.deleteMany({ where: { businessId: f.businessId } });
    await prisma.cfConsent.deleteMany({ where: { businessId: f.businessId } });
    await prisma.cfSuppression.deleteMany({
      where: { businessId: f.businessId },
    });
    await deleteGrowthFixture(f);
    await deleteGrowthFixture(standard);
    if (portalAccountId) await prisma.clientPortalAccount.delete({ where: { id: portalAccountId } });
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
