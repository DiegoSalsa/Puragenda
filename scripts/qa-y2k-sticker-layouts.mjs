import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

// Run against the local, in-memory prototype; no tenant or database is modified.
const require = createRequire(import.meta.url);
const tooling = process.env.PINK_QA_TOOLING || resolve(process.env.TEMP || "/tmp", "puragenda-pink-y2k-qa/node_modules");
const { chromium } = require(resolve(tooling, "playwright"));
const url = process.env.PINK_QA_URL || "http://localhost:3006/website-preview/pink-y2k";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, hasTouch: width < 600, reducedMotion: "reduce" });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const first = width < 600 ? "mobile" : "desktop", other = first === "mobile" ? "desktop" : "mobile";
    const label = viewport => viewport === "mobile" ? "Móvil" : "Escritorio";
    const dialog = page.getByRole("dialog");
    const canvas = page.locator("[data-sticker-viewport]");
    async function openStickers(viewport) {
      await page.getByRole("button", { name: /Personalizar/ }).click();
      await dialog.getByRole("button", { name: "Stickers", exact: true }).click();
      if (viewport) await dialog.getByRole("button", { name: label(viewport), exact: true }).click();
    }
    async function config() {
      await page.getByRole("button", { name: /Personalizar/ }).click();
      await dialog.getByRole("button", { name: "JSON", exact: true }).click();
      const value = JSON.parse(await dialog.getByRole("textbox", { name: "Configuración completa del borrador", exact: true }).inputValue());
      await dialog.getByRole("button", { name: "Cerrar personalización", exact: true }).click();
      return value;
    }
    async function drag(id) {
      const sticker = page.locator(`[data-sticker-id="${id}"]`);
      await sticker.scrollIntoViewIfNeeded();
      const box = await sticker.boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      if (width < 600) {
        const session = await context.newCDPSession(page);
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 48, y: y + 30 }] });
        await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await session.detach();
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 80, y + 30, { steps: 6 });
        await page.mouse.up();
      }
    }

    await openStickers();
    assert.equal(await dialog.getByRole("button", { name: label(first), exact: true }).getAttribute("aria-pressed"), "true");
    await dialog.getByRole("button", { name: "Añadir Calavera con lazo", exact: true }).click();
    await canvas.locator("[data-sticker-id]").waitFor();
    const initial = (await config()).stickers[0], id = initial.id;
    assert.equal(initial[first].visible, true);
    assert.equal(initial[other].visible, false);
    await drag(id);
    const moved = (await config()).stickers[0];
    assert.notEqual(moved[first].x, initial[first].x);
    assert.deepEqual(moved[other], initial[other]);

    await openStickers(other);
    assert.equal(await dialog.locator("[data-my-stickers] button").count(), 0);
    await dialog.getByRole("button", { name: "Añadir Estrella cromada", exact: true }).click();
    await canvas.locator("[data-sticker-id]").waitFor();
    assert.equal(await canvas.getAttribute("data-sticker-viewport"), other);
    assert.equal(await canvas.locator(`[data-sticker-id="${id}"]`).count(), 0);
    let current = await config();
    const second = current.stickers.find(item => item.id !== id);
    await drag(second.id);
    current = await config();
    const otherPosition = current.stickers.find(item => item.id === second.id)[other];
    assert.notEqual(otherPosition.x, second[other].x);
    assert.deepEqual(current.stickers.find(item => item.id === id)[first], moved[first]);

    await openStickers(first);
    assert.equal(await dialog.locator("[data-my-stickers] button").count(), 1);
    await dialog.locator("[data-my-stickers] button").click();
    await openStickers(first);
    await dialog.getByRole("button", { name: "Duplicar sticker", exact: true }).click();
    assert.equal(await canvas.locator("[data-sticker-id]").count(), 2);
    current = await config();
    const copy = current.stickers.find(item => ![id, second.id].includes(item.id));
    assert.equal(copy[other].visible, false);
    await page.locator(`[data-sticker-id="${copy.id}"]`).press("Delete");
    assert.equal(await canvas.locator("[data-sticker-id]").count(), 1);
    await page.locator(`[data-sticker-id="${id}"]`).press("Delete");
    current = await config();
    assert.equal(current.stickers.length, 1);
    assert.deepEqual(current.stickers[0][other], otherPosition);

    await openStickers(other);
    await dialog.locator("[data-my-stickers] button").click();
    await page.getByRole("button", { name: "Terminar de colocar", exact: true }).click();
    assert.equal(await canvas.getAttribute("data-editing"), "false");
    assert.equal(await canvas.getAttribute("data-sticker-viewport"), other);
    assert.equal(await canvas.locator("[data-sticker-id]").count(), 1);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: independent add, ${width < 600 ? "touch" : "mouse"} drag, duplicate, delete and preview in both views`);
    await context.close();
  }
} finally {
  await browser.close();
}
