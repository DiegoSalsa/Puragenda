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
    await page.screenshot({
      path: "scratch/puri-plus-qa/desktop.png",
      fullPage: true,
    });
    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    assert.equal(desktopOverflow, false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "scratch/puri-plus-qa/mobile.png",
      fullPage: true,
    });
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
      flow: "SQL → signal → recommendation → proposal → review → explicit approval → durable audit",
      approved: 1,
      executable: false,
      standardDenied: true,
      realProviderCalls: 0,
      viewports: [
        { width: 1440, height: 1050 },
        { width: 390, height: 844 },
      ],
      horizontalOverflow: false,
      pageErrors: errors,
      checks: [
        "APPROVED_SQL_FLOW_AND_AUDIT",
        "EXPLICIT_APPROVAL_CHECKBOX",
        "STANDARD_API_403_AND_ZERO_RUNS",
        "DESKTOP_NO_OVERFLOW",
        "MOBILE_NO_OVERFLOW",
        "NOINDEX_METADATA",
        "BUTTON_ACCESSIBLE_NAMES",
        "DETERMINISTIC_CHAT_FALLBACK",
        "ZERO_PAGE_ERRORS",
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
    await deleteGrowthFixture(f);
    await deleteGrowthFixture(standard);
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
