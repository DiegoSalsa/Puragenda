import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// The local helper must run with the same public flag; never point this QA at Preview.
const off = process.argv.includes("--off");
const origin = "http://localhost:3010", output = "artifacts/website-commercial";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://websiteqa@127.0.0.1:55439/websiteqa" }) });
const { chromium } = await import(process.env.WEBSITE_QA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.WEBSITE_QA_PLAYWRIGHT_MODULE).href : "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const report = { mode: off ? "PUBLIC_OFF" : "PUBLIC_ON", externalPayments: false, checks: [] };
const fixtures = [], snapshots = [];
const changelogVersion = fs.readFileSync("src/config/changelog.ts", "utf8").match(/version:\s*"([^"]+)"/)?.[1];
assert.ok(changelogVersion);
fs.mkdirSync(output, { recursive: true });

async function fresh(width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await context.addCookies([{ name: "puragenda_locale", value: "es", url: origin }, { name: "puragenda_changelog_seen", value: changelogVersion, url: origin }]);
  return { context, page: await context.newPage() };
}
async function openPricing(page) {
  const hydrated = page.waitForResponse(r => r.url().endsWith("/api/auth/me"));
  await page.goto(origin + "/pricing"); await hydrated;
  const rejectCookies = page.getByRole("button", { name: "Rechazar", exact: true });
  if (await rejectCookies.isVisible()) { await rejectCookies.click(); await rejectCookies.waitFor({ state: "hidden" }); }
}
async function account(id) {
  return {
    base: await prisma.subscription.findUnique({ where: { businessId: id } }),
    intent: await prisma.websitePurchaseIntent.findUnique({ where: { businessId: id } }),
    addon: await prisma.websiteAddon.findUnique({ where: { businessId: id } }),
    offer: await prisma.websiteOfferEligibility.findUnique({ where: { businessId: id } }),
    operations: await prisma.websiteCheckoutOperation.findMany({ where: { addon: { businessId: id } }, orderBy: { createdAt: "asc" } }),
  };
}
async function owner(context, name) {
  const id = `public-access-${off ? "off" : "on"}-${name}-${Date.now()}`, userId = id + "-owner";
  const user = await prisma.user.create({ data: { id: userId, email: `${userId}@example.test`, name: "Local QA", password: "not-a-login", role: "ADMIN" } });
  await prisma.business.create({ data: { id, ownerId: userId, name: "Prueba local de acceso", slug: id, apiKey: id, countryCode: "CL" } });
  fixtures.push({ id, userId });
  await prisma.subscription.create({ data: { businessId: id, plan: "INDIVIDUAL", status: "ACTIVE", isTrial: false, currentPeriodEnd: new Date(Date.now() + 30 * 86400000) } });
  const payload = Buffer.from(JSON.stringify({ id: userId, email: user.email, name: user.name, role: user.role, isSuperAdmin: false, tokenVersion: user.tokenVersion, exp: Math.floor(Date.now() / 1000) + 3600, v: 3 })).toString("base64url");
  const token = `${payload}.${crypto.createHmac("sha256", "local-website-commercial-qa-secret-2026").update(payload).digest("base64url")}`;
  await context.addCookies([{ name: "puragenda_session", value: token, url: origin }]);
  return id;
}
try {
  for (const width of [1440, 390, 360]) {
    if (off) {
      const { context, page } = await fresh(width); const writes = [];
      page.on("request", r => { if (r.method() === "POST") writes.push(new URL(r.url()).pathname); });
      await openPricing(page); await page.getByRole("button", { name: /Añadir Sitio Web/ }).first().click();
      assert.equal(await page.getByRole("button", { name: "Sitio Web próximamente", exact: true }).isDisabled(), true);
      await page.getByRole("button", { name: /30/ }).first().click(); await page.waitForURL(/\/register/);
      assert.equal(new URL(page.url()).searchParams.get("trial"), "1");
      assert.equal(writes.some(p => /billing|purchase-intent|websites/.test(p)), false);
      report.checks.push({ width, state: "anonymous", baseTrialOnly: true, pass: true }); await context.close();
    }
    for (const state of off ? ["STANDARD", "FOUNDER", "ACTIVE", "PAST_DUE", "EXISTING_INTENT", "FOUNDER_INTENT", "ACTIVE_INTENT", "PAST_DUE_INTENT", "PENDING_INTENT", "AUTHORIZED_INTENT", "UNKNOWN_INTENT", "EMPTY_ADDON_INTENT"] : ["STANDARD"]) {
      const { context, page } = await fresh(width); const id = await owner(context, `${state}-${width}`);
      if (state.startsWith("FOUNDER")) {
        const snapshotId = id + "-snapshot"; snapshots.push(snapshotId);
        await prisma.websiteLaunchSnapshot.create({ data: { id: snapshotId, launchAt: new Date(), capturedAt: new Date(), memberCount: 1 } });
        await prisma.websiteOfferEligibility.create({ data: { businessId: id, snapshotId, eligibleAt: new Date(), offerCode: "BETA_FOUNDER" } });
      }
      if (state.startsWith("ACTIVE") || state.startsWith("PAST_DUE")) await prisma.websiteAddon.create({ data: { businessId: id, provider: "mercadopago", status: state.startsWith("ACTIVE") ? "ACTIVE" : "PAST_DUE", mpSubscriptionId: "local-existing-" + id, validUntil: new Date(Date.now() + 86400000) } });
      if (["PENDING_INTENT", "AUTHORIZED_INTENT", "UNKNOWN_INTENT"].includes(state)) {
        const operationId = id + "-operation", mpId = state === "UNKNOWN_INTENT" ? null : "MP-WEB-SIM-" + operationId;
        const addon = await prisma.websiteAddon.create({ data: { businessId: id, provider: "mercadopago", mpSubscriptionId: mpId } });
        await prisma.websiteCheckoutOperation.create({ data: { id: operationId, addonId: addon.id, priceTier: "STANDARD", amount: 9990, state: state.replace("_INTENT", ""), mpSubscriptionId: mpId, providerStatus: state === "AUTHORIZED_INTENT" ? "authorized" : mpId ? "pending" : null, checkoutUrl: mpId ? `${origin}/dashboard/website/payment-simulator?operation=${operationId}` : null, expiresAt: new Date(Date.now() + 86400000) } });
      }
      if (state === "EMPTY_ADDON_INTENT") await prisma.websiteAddon.create({ data: { businessId: id } });
      if (state.endsWith("_INTENT")) await prisma.websitePurchaseIntent.create({ data: { businessId: id } });
      const before = await account(id), requests = [];
      page.on("request", r => { if (r.method() === "POST" && r.url().includes("/api/websites/purchase-intent")) requests.push(r.url()); });
      await openPricing(page); await page.getByText("Se usará tu plan Puragenda actual.", { exact: false }).waitFor();
      await page.getByRole("button", { name: /Añadir Sitio Web/ }).nth(1).click();
      const cta = page.getByRole("button", { name: off ? "Ir a Sitio Web" : "Continuar con Sitio Web", exact: true });
      assert.equal(await cta.isEnabled(), true);
      const measure = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      assert.ok(measure.scroll <= measure.client + 2);
      if (state === "STANDARD") await page.screenshot({ path: `${output}/authenticated-${off ? "off" : "on"}-${width}.png`, fullPage: true });
      await cta.click(); await page.waitForURL(off ? /\/dashboard\/website/ : /\/onboarding\/website/);
      if (off) {
        assert.equal(requests.length, 0); assert.deepEqual(await account(id), before);
        const direct = await context.request.post(origin + "/api/websites/purchase-intent", { headers: { origin }, data: { plan: "EQUIPO", extraStaff: 20 } });
        assert.equal(direct.status(), 200); assert.deepEqual(await direct.json(), { nextUrl: "/dashboard/website" });
        assert.deepEqual(await account(id), before);
        if (state === "STANDARD" || state.startsWith("FOUNDER") || state.startsWith("PAST_DUE")) {
          const label = state.startsWith("FOUNDER") ? "PROBAR MI WEB GRATIS" : state.startsWith("PAST_DUE") ? "REGULARIZAR MI PAGO" : "ACTIVAR SITIO WEB";
          // Billing belongs to an editor tab; its capability must survive navigation.
          assert.equal(await page.getByRole("button", { name: label, exact: true, includeHidden: true }).isEnabled(), true);
        }
        if (state.startsWith("ACTIVE")) assert.equal(await page.getByRole("button", { name: "CANCELAR SITIO WEB", exact: true, includeHidden: true }).isEnabled(), true);
        if (state.startsWith("FOUNDER")) assert.ok((await page.locator("#website-billing").textContent()).includes("5.990"));
        if (["PENDING_INTENT", "AUTHORIZED_INTENT"].includes(state)) {
          assert.equal(await page.getByRole("button", { name: "CANCELAR SOLICITUD DE PAGO", exact: true, includeHidden: true }).isEnabled(), true);
          assert.match(await page.locator("#website-billing").textContent(), /esperando la confirmación de Mercado Pago/);
        }
        if (["EXISTING_INTENT", "EMPTY_ADDON_INTENT"].includes(state)) assert.equal(await page.getByRole("button", { name: "ACTIVAR SITIO WEB", exact: true, includeHidden: true }).isDisabled(), true);
        if (["PAST_DUE_INTENT", "UNKNOWN_INTENT"].includes(state)) {
          const panel = page.locator("#website-billing").locator('xpath=ancestor::section[@role="tabpanel"]');
          const tab = await panel.getAttribute("aria-labelledby"); await page.locator(`[id="${tab}"]`).click();
          const action = page.getByRole("button", { name: state === "PAST_DUE_INTENT" ? "REGULARIZAR MI PAGO" : "ACTIVAR SITIO WEB", exact: true });
          await action.waitFor(); assert.equal(await action.isEnabled(), true);
          if (state === "UNKNOWN_INTENT") { await action.click(); await page.getByText(/Estamos conciliando tu solicitud de pago/).waitFor(); }
          await page.locator("#website-billing").screenshot({ path: `${output}/lifecycle-${state.toLowerCase()}-${width}.png` });
          assert.deepEqual(await account(id), before);
        }
      } else {
        assert.equal(requests.length, 1); assert.ok((await account(id)).intent);
        assert.deepEqual((await account(id)).base, before.base);
        assert.match(await page.locator("section").first().innerText(), /Individual:\s*\$\s*12\.990\/mes/);
        assert.equal(await page.getByRole("button", { name: "Continuar con Sitio Web", exact: true }).isEnabled(), true);
      }
      assert.equal(await prisma.websiteCheckoutOperation.count({ where: { addon: { businessId: id } } }), before.operations.length);
      report.checks.push({ width, state, ...measure, pass: true }); await context.close();
    }
  }
  console.log(`PASS authenticated public ${off ? "OFF" : "ON"}, actual BASE, preserved access and 1440/390/360 (${report.checks.length} checks)`);
} finally {
  fs.writeFileSync(`${output}/public-access-${off ? "off" : "on"}.json`, JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  for (const { id, userId } of fixtures) { await prisma.business.deleteMany({ where: { id } }); await prisma.user.deleteMany({ where: { id: userId } }); }
  await prisma.websiteLaunchSnapshot.deleteMany({ where: { id: { in: snapshots } } });
  await prisma.$disconnect();
}
