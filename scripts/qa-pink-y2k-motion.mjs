import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const tooling = process.env.PINK_QA_TOOLING || resolve(process.env.TEMP || "/tmp", "puragenda-pink-y2k-qa/node_modules");
const { chromium } = require(resolve(tooling, "playwright"));
const output = resolve("output/pink-y2k/motion");
const url = process.env.PINK_QA_URL || "http://127.0.0.1:3007/website-preview/pink-y2k";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { checks: [], errors: [], apiRequests: [], viewports: [], performance: [] };
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("request", (request) => {
  if (new URL(request.url()).pathname.startsWith("/api/")) report.apiRequests.push(request.url());
});
const track = () => page.locator('[data-pink-loop="marquee"]');
const matrixX = () => track().evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);
const inspect = async (width) => {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator("h1").waitFor();
  const geometry = await page.evaluate(async () => {
    const measurements = [];
    for (let i = 0; i < 18; i++) {
      measurements.push({ width: innerWidth, scroll: document.documentElement.scrollWidth });
      await new Promise((done) => requestAnimationFrame(done));
    }
    return measurements;
  });
  assert.ok(geometry.every((frame) => frame.scroll <= width + 1), `Animated overflow at ${width}`);
  await page.waitForTimeout(1500);
  assert.equal(await page.getByRole("heading", { level: 1, name: "Tus uñas, tu universo." }).count(), 1);
  const settled = await page.locator("h1 [data-pink-glyph]").evaluateAll((elements) => elements.every((element) => getComputedStyle(element).opacity === "1"));
  assert.ok(settled, `Title did not settle at ${width}`);
  await page.screenshot({ path: resolve(output, `hero-${width}.png`) });
  await page.locator('[class*="ribbon"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await page.mouse.move(0, 0);
  const before = await matrixX();
  await page.waitForTimeout(320);
  const after = await matrixX();
  assert.ok(after < before - 3, `Marquee is not moving left at ${width}: ${before} / ${after}`);
  const seam = await track().evaluate((element) => {
    const groups = [...element.children];
    const widths = groups.map((group) => parseFloat(getComputedStyle(group).width));
    const animation = element.getAnimations()[0];
    const duration = Number(animation.effect.getTiming().duration);
    animation.currentTime = duration - 1;
    const end = new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
    animation.currentTime = duration + 1;
    const start = new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
    animation.currentTime = 2000;
    return { widths, trackWidth: parseFloat(getComputedStyle(element).width), gap: getComputedStyle(element).gap, end, start };
  });
  assert.ok(Math.abs(seam.widths[0] - seam.widths[1]) < 0.1);
  assert.ok(Math.abs(seam.trackWidth - seam.widths[0] * 2) < 0.2);
  assert.ok(seam.widths[0] >= width);
  assert.equal(seam.gap, "0px");
  assert.ok(Math.abs(seam.end + seam.widths[0] - seam.start) < 0.2, `Seam discontinuity: ${JSON.stringify(seam)}`);
  report.viewports.push({ width, animatedOverflow: false, marqueeMovesLeft: true, seam });
};

try {
  for (const width of [320, 360, 390, 430, 768, 1280, 1440]) await inspect(width);
  report.checks.push("Seven widths: no overflow during entrance, complete accessible title, leftward marquee, equal groups and continuous seam");

  await page.getByRole("button", { name: "Pausar movimiento decorativo" }).click();
  const pausedX = await matrixX();
  await page.waitForTimeout(220);
  assert.ok(Math.abs(await matrixX() - pausedX) < 0.1);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  assert.ok(await page.getByRole("button", { name: "Reanudar movimiento decorativo" }).evaluate((element) => element === document.activeElement));
  assert.notEqual(await page.locator('[class*="motionToggle"]').evaluate((element) => getComputedStyle(element).outlineStyle), "none");
  await page.keyboard.press("Enter");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(120);
  assert.ok(await matrixX() < pausedX - 1);
  const ribbonBox = await page.locator('[class*="ribbon"]').boundingBox();
  await page.mouse.move(ribbonBox.x + 200, ribbonBox.y + ribbonBox.height / 2);
  const hoverX = await matrixX();
  await page.waitForTimeout(200);
  assert.ok(Math.abs(await matrixX() - hoverX) < 0.1);
  await page.mouse.move(0, 0);
  report.checks.push("Visible pause/resume control works with pointer and keyboard, visible focus, hover pauses marquee");

  await page.locator("#services").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const windowState = await page.locator('[class*="priceWindow"]').evaluate((element) => ({ seen: element.dataset.pinkSeen, opacity: getComputedStyle(element).opacity, animations: element.getAnimations().map((animation) => ({ name: animation.animationName, state: animation.playState })) }));
  assert.equal(windowState.seen, "true");
  assert.equal(windowState.opacity, "1");
  assert.ok(windowState.animations.some((animation) => animation.name.includes("windowOpen")));
  await page.screenshot({ path: resolve(output, "window-1440.png") });
  await page.locator("#guide").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(160);
  assert.equal(await track().getAttribute("data-pink-running"), "false");
  await page.locator("#services").scrollIntoViewIfNeeded();
  assert.ok(await page.locator('[class*="priceWindow"]').evaluate((element) => element.getAnimations().every((animation) => animation.playState === "finished")));
  await page.locator("#gallery").scrollIntoViewIfNeeded();
  await page.waitForTimeout(950);
  await page.getByRole("button", { name: "Ampliar Pink digital dream" }).hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(output, "gallery-1440.png") });
  report.checks.push("Window opens once, remains visible on return, gallery entries and fine-pointer hover, off-screen loops pause");

  // Main-thread diagnostics for this machine, not a device performance score.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1800);
  const client = await context.newCDPSession(page);
  await client.send("Performance.enable");
  const metrics = async () => Object.fromEntries((await client.send("Performance.getMetrics")).metrics.map((item) => [item.name, item.value]));
  const measure = async (mode) => {
    const from = await metrics();
    await page.waitForTimeout(2500);
    const to = await metrics();
    report.performance.push({ mode, seconds: to.Timestamp - from.Timestamp, layouts: to.LayoutCount - from.LayoutCount, styleRecalculations: to.RecalcStyleCount - from.RecalcStyleCount, scriptMs: (to.ScriptDuration - from.ScriptDuration) * 1000, taskMs: (to.TaskDuration - from.TaskDuration) * 1000 });
  };
  await measure("desktop 1440: hero idle with motion");
  await page.getByRole("button", { name: "Pausar movimiento decorativo" }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await measure("desktop 1440: paused");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await measure("mobile 390: hero idle with motion");
  await client.detach();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  const reduced = await page.locator("#studio-root").evaluate((element) => ({ animations: element.getAnimations({ subtree: true }).length, hidden: [...element.querySelectorAll("h1,h2,[data-pink-reveal]")].filter((item) => getComputedStyle(item).opacity === "0").length }));
  assert.equal(reduced.animations, 0);
  assert.equal(reduced.hidden, 0);
  assert.equal(await page.getByRole("button", { name: "Pausar movimiento decorativo" }).count(), 0);
  await page.getByRole("button", { name: "Mensaje siguiente del Love Pocket" }).click();
  assert.equal(await page.locator('[class*="pocketScreen"] strong').innerText(), "Tu idea, tu estilo");
  await page.screenshot({ path: resolve(output, "reduced-motion-1440.png") });
  report.checks.push("Reduced motion: zero active animations, content visible, Pocket remains functional");

  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await touch.newPage();
  await mobile.goto(url, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(1500);
  assert.equal(await mobile.locator('[class*="pocketFloat"]').evaluate((element) => getComputedStyle(element).animationName), "none");
  await mobile.getByRole("button", { name: "Mensaje siguiente del Love Pocket" }).tap();
  await mobile.getByRole("button", { name: "Reservar desde Love Pocket" }).tap();
  await mobile.getByRole("heading", { name: "¿Qué te harás?" }).waitFor();
  await mobile.getByRole("button", { name: "Cerrar reserva" }).tap();
  await mobile.getByRole("dialog").waitFor({ state: "hidden" });
  await mobile.getByRole("button", { name: "Ampliar foto de portada" }).tap();
  await mobile.getByRole("button", { name: "Imagen siguiente", exact: true }).waitFor();
  assert.equal(await mobile.getByRole("button", { name: "Imagen siguiente", exact: true }).isDisabled(), true);
  await mobile.getByRole("button", { name: "Cerrar imagen" }).tap();
  await mobile.getByRole("dialog").waitFor({ state: "hidden" });
  await mobile.getByRole("button", { name: "Ampliar Pink digital dream", exact: true }).tap();
  const image = mobile.locator('[class*="lightboxImage"]');
  const box = await image.boundingBox();
  const session = await touch.newCDPSession(mobile);
  const y = box.y + box.height / 2;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 295, y }] });
  for (const x of [265, 235, 205, 175, 145, 115])
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await mobile.getByRole("heading", { name: "Chrome crush" }).waitFor();
  await mobile.screenshot({ path: resolve(output, "touch-lightbox-390.png") });
  await session.detach();
  await touch.close();
  report.checks.push("Real emulated touch: Pocket controls, immediate booking, lightbox horizontal swipe; mobile ambient float disabled");

  for (const mode of ["javascript-disabled", "observer-unavailable"]) {
    const fallback = await browser.newContext({ javaScriptEnabled: mode !== "javascript-disabled", viewport: { width: 390, height: 844 } });
    if (mode === "observer-unavailable") await fallback.addInitScript(() => { window.IntersectionObserver = undefined; });
    const fallbackPage = await fallback.newPage();
    await fallbackPage.goto(url, { waitUntil: "networkidle" });
    await fallbackPage.waitForTimeout(1500);
    assert.ok(await fallbackPage.locator("[data-pink-reveal]").evaluateAll((elements) => elements.every((element) => getComputedStyle(element).opacity === "1")));
    await fallback.close();
  }
  report.checks.push("Without JavaScript or IntersectionObserver: all editorial content remains visible");
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.apiRequests, []);
  report.success = true;
} catch (error) {
  report.success = false;
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(resolve(output, "qa-motion-report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
