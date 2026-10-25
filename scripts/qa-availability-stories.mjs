import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";

// Exercises the real client component against an in-memory API. No database,
// account, session, or production environment is used.
const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const { chromium } = process.env.STORIES_QA_TOOLING
  ? require(resolve(process.env.STORIES_QA_TOOLING, "playwright"))
  : require("playwright");
const baseline = process.argv.includes("--baseline");
const baselineRef = process.env.STORIES_QA_BASELINE_REF || "5a1949fc34eb83bc93b71f3c665efc9cae264456";
const out = resolve("scratch/stories-audit");
await mkdir(out, { recursive: true });
const messages = JSON.parse(await readFile("messages/dashboard/es.json", "utf8"));
const componentPath = resolve("src/app/dashboard/stories/story-generator.tsx");
const plugins = baseline ? [{ name: "baseline", setup(builder) {
  builder.onLoad({ filter: /story-generator\.tsx$/ }, () => ({
    contents: execFileSync("git", ["show", `${baselineRef}:src/app/dashboard/stories/story-generator.tsx`], { encoding: "utf8" }),
    loader: "tsx", resolveDir: resolve("src/app/dashboard/stories"),
  }));
} }] : [];
const bundle = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
    import {NextIntlClientProvider} from 'next-intl'; import {StoryGenerator} from ${JSON.stringify(componentPath)};
    const options = { canChooseStaff:true, ownStaffId:null, isIndividualPlan:false, hasMultipleLocations:false,
      businessAddress:null, locations:[{id:'location',name:'Principal',slug:'main',address:null}],
      staff:[{id:'staff-1',name:'Ana',locationIds:['location']},{id:'staff-2',name:'Luz',locationIds:['location']}],
      services:[{id:'service',name:'Sesión',duration:60,locationIds:['location'],staffIds:[]}], opportunities:[],presets:[]};
    createRoot(document.getElementById('root')).render(<NextIntlClientProvider locale="es" messages={{dashboard:${JSON.stringify(messages)}}}>
      <StoryGenerator businessSlug="demo" options={options} brand={{name:'Demo',logoUrl:null,primaryColor:'#7C3AED',secondaryColor:'#FF4F87',backgroundColor:'#FFF8ED'}} insights={null} currencyCode="CLP" />
    </NextIntlClientProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins,
});
const postcss = require("postcss"), tailwind = require("@tailwindcss/postcss");
const sourceCss = (await readFile("src/app/globals.css", "utf8")).replace('@import "tailwindcss";', '@import "tailwindcss" source(none);')
  + `\n@source "${resolve("src/app/dashboard/stories").replaceAll("\\", "/")}";\nfieldset{border:0}body{margin:0;padding:16px;font-family:Arial,sans-serif}`;
const { css } = await postcss([tailwind()]).process(sourceCss, { from: resolve("src/app/globals.css") });
const icon = await readFile("public/icon-512x512.png");
const backgrounds = Object.fromEntries(await Promise.all(["editorial-paper.webp", "organic-paper.webp", "graphic-paper.webp"].map(async name => [name, await readFile(`public/story-templates/${name}`)])));
const server = createServer((req, res) => {
  if (req.url === "/app.js") { res.setHeader("content-type", "text/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url === "/style.css") { res.setHeader("content-type", "text/css"); res.end(css); }
  else if (req.url.startsWith("/icon-512x512.png")) { res.setHeader("content-type", "image/png"); res.end(icon); }
  else if (req.url.startsWith("/story-templates/")) { res.setHeader("content-type", "image/webp"); res.end(backgrounds[req.url.split("/").at(-1).split("?")[0]]); }
  else { res.setHeader("content-type", "text/html"); res.end('<!doctype html><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/app.js"></script>'); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [];
try {
  for (const width of baseline ? [1440] : [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, acceptDownloads: true });
    const page = await context.newPage(), errors = [], requests = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") console.error(message.text()); });
    let pendingPublish = null;
    await page.route("**/api/dashboard/stories**", async route => {
      if (route.request().method() !== "POST") return route.fulfill({ json: { success: true } });
      const input = route.request().postDataJSON(); requests.push(input);
      if (pendingPublish && route.request().url().includes("publish=1")) { const release = pendingPublish; pendingPublish = null; await release; }
      const available = input.staffId === "staff-2" ? ["14:00", "15:00"] : ["09:00", "10:00", "11:00"];
      const times = input.selectedSlots.length ? available.filter(time => input.selectedSlots.some(slot => slot.time === time)) : available;
      const data = { ...input, businessName: "Demo", logoUrl: null, primaryColor: input.accentColor, backgroundColor: input.canvasColor, textColor: input.storyTextColor,
        serviceName: "Sesión", serviceNames: ["Sesión"], locationName: "Principal", locationAddress: null, staffName: input.staffId === "staff-2" ? "Luz" : "Ana",
        days: input.showSchedule ? [{ date: "2026-10-26", label: "Lunes 26 de octubre", times }] : [],
        bookingUrl: url + "/widget/demo", generatedAt: new Date().toISOString(), timezone: "America/Santiago", templateBackgroundUrl: url + "/story-templates/editorial-paper.webp",
        disclaimer: "Cupos sujetos a disponibilidad", poweredBy: "Puragenda", noAvailability: "Sin cupos disponibles", slotCount: times.length, potentialRevenue: 0 };
      await route.fulfill({ json: { data, campaignId: "campaign-1", bookingUrl: url + "/s/teststory" } });
    });
    await page.goto(url);
    const button = name => page.getByRole("button", { name, exact: true });
    const content = () => button("Contenido").click();
    const preview = page.locator('[data-tour="story-preview"]');
    const refresh = () => button("Actualizar vista previa").last().click();
    await page.getByRole("button", { name: /Sin horarios/ }).click();
    await refresh();
    await preview.waitFor({ state: "visible" });
    assert.equal(await preview.getByText("09:00", { exact: true }).count(), 0);
    if (width < 600) await content();
    await page.getByRole("button", { name: /Con horarios/ }).click();
    if (baseline) {
      assert.equal(await preview.getByText("09:00", { exact: true }).count(), 0);
      await page.screenshot({ path: resolve(out, "baseline-with-schedule-empty.png"), fullPage: true });
      checks.push(`Reproduced on ${baselineRef}: without schedule → with schedule leaves an empty schedule`);
      await context.close(); continue;
    }
    await preview.getByText("09:00", { exact: true }).waitFor({ state: "visible" });
    checks.push(`${width}: switching modes recalculates and displays hours`);
    if (width < 600) await content();
    await button(messages.stories.customRange).click();
    await page.getByLabel(messages.stories.startDate, { exact: true }).fill("2026-10-26");
    await page.getByLabel(messages.stories.endDate, { exact: true }).fill("2026-10-26");
    await refresh();
    if (width < 600) await content();
    await page.getByRole("button", { name: /Sin horarios/ }).click();
    await page.waitForFunction(() => !document.querySelector("fieldset")?.disabled);
    assert.equal(requests.at(-1).targetDate, undefined);
    if (width < 600) await content();
    await page.getByRole("button", { name: /Con horarios/ }).click();
    await preview.getByText("09:00", { exact: true }).waitFor({ state: "visible" });
    assert.equal(requests.at(-1).targetDate, "2026-10-26");
    if (width < 600) await content();
    await button(messages.stories.nextAvailable).click();
    await refresh();
    assert.equal(requests.at(-1).targetDate, undefined);
    checks.push(`${width}: custom dates survive mode switches and are cleared for automatic ranges`);
    if (width < 600) await content();
    // Keep only one selected time, then try removing the last one.
    await button("09:00").click(); await button("10:00").click(); await button("11:00").click();
    await refresh();
    if (width < 600) await content();
    assert.equal(await button("09:00").count(), 1, "refresh must preserve unselected options");
    await button("09:00").click();
    // Changing professional clears the old selections and invalidates preview.
    await page.getByRole("combobox").selectOption("staff-2");
    assert.equal(await page.locator("[data-story-export]").count(), 0);
    await refresh();
    assert.equal(requests.at(-1).selectedSlots.length, 0);
    await preview.getByText("14:00", { exact: true }).waitFor();
    checks.push(`${width}: slot selection survives refresh; professional changes clear old choices`);
    if (width < 600) await content();
    let release;
    pendingPublish = new Promise(done => { release = done; });
    const download = page.waitForEvent("download");
    download.catch(() => undefined);
    if (width >= 600) {
      await button("Descargar PNG").click();
    } else {
      // The preview is display:none while Content is active; exercise that exact
      // state without Playwright switching panels to make the button visible.
      await page.getByRole("button", { name: "Descargar PNG", exact: true, includeHidden: true }).evaluate(element => element.click());
    }
    await page.waitForFunction(() => document.querySelector("fieldset")?.disabled, undefined, { timeout: 5000 }).catch(async error => {
      console.error("Export did not lock:", await preview.innerText(), requests, errors); throw error;
    });
    assert.equal(await page.getByRole("combobox").isDisabled(), true);
    release();
    const file = await download.catch(async error => {
      console.error(await preview.innerText(), errors);
      await page.screenshot({ path: resolve(out, `failure-${width}.png`), fullPage: true });
      throw error;
    });
    const pngPath = resolve(out, `story-${width}.png`); await file.saveAs(pngPath);
    const bytes = await readFile(pngPath);
    assert.equal(bytes.readUInt32BE(16), 1080); assert.equal(bytes.readUInt32BE(20), 1920);
    const { channels } = await require("sharp")(bytes).stats();
    assert.ok(channels.slice(0, 3).some(channel => channel.stdev > 25), "export must contain visible content");
    await page.waitForFunction(() => !document.querySelector("fieldset")?.disabled);
    assert.ok(requests.at(-1).showSchedule);
    assert.deepEqual(errors, []);
    checks.push(`${width}: PNG is 1080×1920 with visible content; controls stay locked through capture`);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "share", { configurable: true, value: async payload => { window.qaShare = payload; } });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => { window.qaLink = value; } } });
    });
    await page.getByRole("button", { name: messages.stories.share, exact: true, includeHidden: true }).evaluate(element => element.click());
    await page.waitForFunction(() => !!window.qaShare);
    const shared = await page.evaluate(async () => ({ count: window.qaShare.files.length, url: window.qaShare.url,
      width: new DataView(await window.qaShare.files[0].arrayBuffer()).getUint32(16) }));
    assert.deepEqual(shared, { count: 1, url: url + "/s/teststory", width: 1080 });
    await page.waitForFunction(() => !document.querySelector("fieldset")?.disabled);
    await page.getByRole("button", { name: messages.stories.copyLink, exact: true, includeHidden: true }).evaluate(element => element.click());
    await page.waitForFunction(() => !!window.qaLink);
    assert.equal(await page.evaluate(() => window.qaLink), url + "/s/teststory");
    await page.waitForFunction(() => !document.querySelector("fieldset")?.disabled);
    checks.push(`${width}: share receives a PNG and campaign URL; copying reuses the same campaign link`);
    if (width < 600) await button("Vista previa").click();
    await page.screenshot({ path: resolve(out, `fixed-${width}.png`), fullPage: true });
    await context.close();
  }
  await writeFile(resolve(out, baseline ? "baseline.json" : "results.json"), JSON.stringify({ checks }, null, 2));
  console.log(checks.join("\n"));
} finally { await browser.close(); await new Promise(done => server.close(done)); }
