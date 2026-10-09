import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const tooling = process.env.PINK_QA_TOOLING || resolve(process.env.TEMP || "/tmp", "puragenda-pink-y2k-qa/node_modules");
const { chromium } = require(resolve(tooling, "playwright"));
const output = resolve("output/pink-y2k/motion");
const url = process.env.PINK_QA_URL || "http://127.0.0.1:3007/website-preview/pink-y2k";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const captures = [];
try {
  for (const mobile of [false, true]) {
    const name = mobile ? "mobile-390" : "desktop-1440";
    const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, recordVideo: { dir: resolve(output, "recordings"), size: viewport } });
    const page = await context.newPage();
    const video = page.video();
    const started = Date.now();
    const capture = { name, url, viewport, scenes: [], errors: [], apiRequests: [] };
    page.on("pageerror", (error) => capture.errors.push(error.message));
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) capture.apiRequests.push(request.url());
    });
    const mark = (scene) => capture.scenes.push({ scene, seconds: Number(((Date.now() - started) / 1000).toFixed(1)) });
    const pause = (ms) => page.waitForTimeout(ms);
    const press = async (locator) => {
      if (mobile) await locator.tap();
      else {
        // Sample the current visible control and use real pointer events, so
        // a gently floating toy does not need to stop for the recorder.
        const box = await locator.boundingBox();
        if (!box) throw new Error("Control not visible");
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await pause(250);
        await page.mouse.down();
        await pause(110);
        await page.mouse.up();
      }
    };
    const scroll = async (selector) => {
      await page.locator(selector).evaluate((element) => element.scrollIntoView({ behavior: "smooth", block: "start" }));
      await pause(1500);
    };
    mark("Entrada del hero y Love Pocket");
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator("h1").waitFor();
    await pause(2600);
    mark("Pocket: mensajes, corazón y respuesta física");
    await press(page.getByRole("button", { name: "Mensaje siguiente del Love Pocket" }));
    await pause(900);
    await press(page.getByRole("button", { name: "Mensaje anterior del Love Pocket" }));
    await pause(700);
    mark("Reserva accesible desde el dispositivo");
    await press(page.getByRole("button", { name: "Reservar desde Love Pocket" }));
    await page.getByRole("heading", { name: "¿Qué te harás?" }).waitFor();
    await pause(1300);
    await press(page.getByRole("button", { name: "Cerrar reserva" }));
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    mark("Marquee continuo y control de pausa");
    await scroll('[class*="ribbon"]');
    await pause(1000);
    await press(page.getByRole("button", { name: "Pausar movimiento decorativo" }));
    await pause(800);
    await press(page.getByRole("button", { name: "Reanudar movimiento decorativo" }));
    await page.mouse.move(0, 0);
    await pause(800);
    mark("Ventana retro, servicios y precios");
    await scroll("#services");
    if (!mobile) {
      await page.locator('[class*="priceRow"]').first().hover();
      await pause(700);
    } else await pause(700);
    mark("Polaroids, álbum y ampliación");
    await scroll("#gallery");
    if (mobile) {
      const rail = await page.locator('[class*="galleryRail"]').boundingBox();
      const session = await context.newCDPSession(page);
      const y = Math.min(rail.y + rail.height / 2, 650);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 310, y }] });
      for (const x of [280, 250, 220, 190, 160, 130, 100]) {
        await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
        await pause(55);
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      await pause(750);
      await press(page.getByRole("button", { name: "Ampliar Chrome crush" }));
    } else {
      const photo = page.getByRole("button", { name: "Ampliar Pink digital dream" });
      await photo.hover();
      await pause(700);
      await press(photo);
    }
    await page.getByRole("dialog").waitFor();
    await pause(1200);
    await press(page.getByRole("button", { name: "Imagen siguiente" }));
    await pause(1000);
    await press(page.getByRole("button", { name: "Cerrar imagen" }));
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    mark("Guía y políticas");
    await scroll("#guide");
    await page.locator("summary").scrollIntoViewIfNeeded();
    await press(page.locator("summary"));
    await pause(1000);
    mark("Cierre y CTA glossy");
    await scroll('[class*="final"] section, section[class*="final"]');
    await pause(900);
    const finalButton = page.locator('section[class*="final"]').getByRole("button");
    await press(finalButton);
    await page.getByRole("heading", { name: "¿Qué te harás?" }).waitFor();
    await pause(1200);
    await press(page.getByRole("button", { name: "Cerrar reserva" }));
    await pause(600);
    await context.close();
    const path = resolve(output, `motion-${name}.webm`);
    await video.saveAs(path);
    capture.file = path;
    capture.seconds = Number(((Date.now() - started) / 1000).toFixed(1));
    captures.push(capture);
    if (capture.errors.length || capture.apiRequests.length) throw new Error(JSON.stringify(capture));
    console.log(`Recorded ${name}: ${capture.seconds}s`);
  }
} finally {
  await writeFile(resolve(output, "recording-manifest.json"), JSON.stringify(captures, null, 2));
  await browser.close();
}
