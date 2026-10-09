import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const tooling =
  process.env.PINK_QA_TOOLING ||
  resolve(process.env.TEMP || "/tmp", "puragenda-pink-y2k-qa/node_modules");
const { chromium } = require(resolve(tooling, "playwright"));
const AxeBuilder = require(resolve(tooling, "@axe-core/playwright")).default;
const output = resolve("output/pink-y2k");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  viewports: [],
  interactions: [],
  accessibility: [],
  errors: [],
  apiRequests: [],
};
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("request", (request) => {
  if (new URL(request.url()).pathname.startsWith("/api/"))
    report.apiRequests.push({
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
});
const url =
  process.env.PINK_QA_URL || "http://127.0.0.1:3007/website-preview/pink-y2k";
try {
  for (const width of [320, 360, 390, 430, 768, 1280, 1440]) {
    const height = width < 600 ? 844 : 1000;
    await page.setViewportSize({ width, height });
    const response = await page.goto(url, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    // Exercise real lazy loading, including photos beyond the mobile scroll rail.
    for (const image of await page.locator("#studio-root img").all()) {
      await image.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (element) => element.complete && element.naturalWidth > 0,
        await image.elementHandle(),
        { timeout: 15000 },
      );
    }
    await page
      .locator('[class*="galleryRail"]')
      .evaluate((element) => (element.scrollLeft = 0));
    await page.evaluate(() => window.scrollTo(0, 0));
    // Capture the settled layout after the short editorial entrances.
    await page.waitForTimeout(1500);
    const geometry = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      width: innerWidth,
      rootScroll: document.getElementById("studio-root").scrollWidth,
      rootWidth: document.getElementById("studio-root").clientWidth,
      missing: [...document.querySelectorAll("#studio-root img")]
        .filter((image) => !image.complete || !image.naturalWidth)
        .map((image) => image.alt),
    }));
    assert.ok(
      geometry.scrollWidth <= width + 1,
      `Overflow ${width}: ${JSON.stringify(geometry)}`,
    );
    assert.ok(
      geometry.rootScroll <= geometry.rootWidth + 1,
      `Root overflow ${width}`,
    );
    assert.deepEqual(geometry.missing, []);
    const pocketButtons = await page
      .locator('[class*="pocketButtons"] button')
      .evaluateAll((buttons) =>
        buttons.map((button) => ({
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height,
        })),
      );
    assert.ok(
      pocketButtons.every((rect) => rect.width >= 43.5 && rect.height >= 43.5),
      `Pocket touch targets ${width}: ${JSON.stringify(pocketButtons)}`,
    );
    await page.screenshot({ path: resolve(output, `viewport-${width}.png`) });
    await page.screenshot({
      path: resolve(output, `page-${width}.png`),
      fullPage: true,
    });
    report.viewports.push({ width, height, ...geometry, pocketButtons });
    if (width === 390 || width === 1440) {
      const axe = await new AxeBuilder({ page }).analyze();
      report.accessibility.push({
        width,
        violations: axe.violations.map((row) => ({
          id: row.id,
          impact: row.impact,
          description: row.description,
          nodes: row.nodes.map((node) => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        })),
        passes: axe.passes.length,
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "networkidle" });
  const firstMessage = await page
    .locator('[class*="pocketScreen"] strong')
    .innerText();
  await page
    .getByRole("button", { name: "Mensaje siguiente del Love Pocket" })
    .click();
  assert.notEqual(
    await page.locator('[class*="pocketScreen"] strong').innerText(),
    firstMessage,
  );
  await page
    .getByRole("button", { name: "Mensaje anterior del Love Pocket" })
    .click();
  assert.equal(
    await page.locator('[class*="pocketScreen"] strong').innerText(),
    firstMessage,
  );
  report.interactions.push("Pocket next/previous and three 44px buttons");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("navigation", { name: "Menú móvil" })
    .getByRole("link", { name: "Mis trabajos" })
    .click();
  assert.equal(
    await page.getByRole("navigation", { name: "Menú móvil" }).count(),
    0,
  );
  await page.getByRole("button", { name: "Chrome", exact: true }).click();
  assert.equal(await page.locator('[class*="galleryPhotoTop"]').count(), 1);
  await page.getByRole("button", { name: "Ampliar Chrome crush" }).click();
  await page.getByRole("button", { name: "Imagen siguiente" }).click();
  assert.equal(
    await page.getByRole("dialog").getByRole("heading").innerText(),
    "Un poquito de nail art",
  );
  await page.keyboard.press("ArrowLeft");
  assert.equal(
    await page.getByRole("dialog").getByRole("heading").innerText(),
    "Chrome crush",
  );
  await page.screenshot({ path: resolve(output, "gallery-lightbox.png") });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.getByRole("button", { name: "Todos los sets" }).click();
  await page.locator("summary").click();
  assert.equal(await page.locator("details").getAttribute("open"), "");
  report.interactions.push(
    "Mobile menu, gallery filters, lightbox arrows, keyboard Escape, policies",
  );

  await page
    .locator('[class*="priceWindow"]')
    .getByRole("button")
    .filter({ hasText: "Soft gel + diseño" })
    .click();
  await page.getByRole("heading", { name: "¿Qué te harás?" }).waitFor();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Diseño complejo · ejemplo", { exact: false })
    .check();
  await dialog
    .getByLabel("Retiro para nuevo set · ejemplo", { exact: false })
    .check();
  await dialog.getByRole("button", { name: "Continuar con 125 min" }).click();
  await dialog
    .getByRole("button")
    .filter({ hasText: "Profesional de muestra" })
    .click();
  // Select another day if the first one is Sunday (the shared demo has no slots).
  await dialog.locator('[class*="timesRegion"]').getByRole("heading").waitFor();
  await page.waitForFunction(
    () => !document.querySelector('[class*="timesRegion"][aria-busy="true"]'),
  );
  if (!(await dialog.locator('[class*="times"] button').count())) {
    await dialog.locator('[class*="days"] button').nth(1).click();
    await page.waitForFunction(
      () => !document.querySelector('[class*="timesRegion"][aria-busy="true"]'),
    );
  }
  await dialog
    .getByRole("button", { name: /^\d{2}:\d{2}$/ })
    .first()
    .click();
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await dialog.getByLabel("Nombre", { exact: true }).fill("Cliente de prueba");
  await dialog.getByLabel("Email", { exact: true }).fill("demo@example.test");
  await dialog.getByLabel("Teléfono", { exact: true }).fill("+56912345678");
  await dialog.getByRole("button", { name: "Revisar mi elección" }).click();
  assert.ok((await dialog.innerText()).includes("$30.990"));
  await page.screenshot({ path: resolve(output, "booking-review-390.png") });
  await dialog.getByRole("button", { name: "Finalizar demostración" }).click();
  await dialog
    .getByText(
      "Así se vería tu reserva. No se creó una cita ni se enviaron tus datos.",
    )
    .waitFor();
  await page.screenshot({ path: resolve(output, "booking-complete-390.png") });
  assert.deepEqual(report.apiRequests, []);
  await page.getByRole("button", { name: "Cerrar reserva" }).click();
  report.interactions.push(
    "Full canonical five-step booking with design/removal, correct $30.990 / 125min quote, local demo finish, zero API calls",
  );
  await page
    .getByRole("button", { name: "Reservar desde Love Pocket", exact: true })
    .click();
  await page.getByRole("heading", { name: "¿Qué te harás?" }).waitFor();
  await page.getByRole("button", { name: "Cerrar reserva" }).click();
  report.interactions.push("Pocket reserve opens canonical booking");

  await page.getByRole("button", { name: /Personalizar/ }).click();
  await page
    .getByLabel("Nombre del negocio", { exact: true })
    .fill("Mi nuevo estudio");
  await page
    .getByLabel("Botón principal", { exact: true })
    .fill("Elegir mi set");
  await page.getByRole("button", { name: "Aplicar al preview" }).click();
  assert.ok(
    await page.getByRole("link", { name: "Mi nuevo estudio, inicio" }).count(),
  );
  assert.ok(await page.getByRole("button", { name: "Elegir mi set" }).count());
  await page.getByRole("button", { name: /Personalizar/ }).click();
  await page.getByRole("button", { name: "Álbum", exact: true }).click();
  for (let n = 0; n < 4; n++)
    await page.getByRole("button", { name: "Quitar foto" }).first().click();
  await page.getByRole("button", { name: "Aplicar al preview" }).click();
  await page.getByText("Tu álbum está esperando sus primeras fotos.").waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Chrome", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: /Personalizar/ }).click();
  await page.getByRole("button", { name: "Marca", exact: true }).click();
  await page
    .getByLabel("Foto de portada · ruta local o Cloudinary")
    .fill("/websites/pink-y2k/missing-qa.webp");
  await page.getByRole("button", { name: "Aplicar al preview" }).click();
  await page.getByText("Imagen por agregar").first().waitFor();
  await page.screenshot({ path: resolve(output, "empty-and-missing-390.png") });
  report.interactions.push(
    "Local editor applies brand/CTA, removes photos/categories and handles empty/missing media",
  );
  await page.getByRole("button", { name: /Personalizar/ }).click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const json = JSON.parse(
    await page.getByLabel("Configuración completa del borrador").inputValue(),
  );
  json.instagram = "javascript:alert(1)";
  await page
    .getByLabel("Configuración completa del borrador")
    .fill(JSON.stringify(json));
  await page.getByRole("button", { name: "Aplicar al preview" }).click();
  assert.ok(await page.getByRole("alert").count());
  await page.getByRole("button", { name: "Cerrar personalización" }).click();
  report.interactions.push("Unsafe imported social URL rejected");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  const animation = await page
    .locator('[class*="pixelHeart"]')
    .evaluate((element) => getComputedStyle(element).animationName);
  assert.equal(animation, "none");
  report.interactions.push("Reduced motion disables animation");
  assert.deepEqual(report.errors, []);
  assert.ok(
    report.accessibility.every((result) => result.violations.length === 0),
    "Accessibility violations remain",
  );
  report.success = true;
} catch (error) {
  report.success = false;
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(
    resolve(output, "qa-report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
