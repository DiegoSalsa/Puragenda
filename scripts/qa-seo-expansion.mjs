import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SEO_PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.SEO_QA_URL || "http://127.0.0.1:3107";
const output = "artifacts/seo-expansion-b01";
mkdirSync(output, { recursive: true });
if (process.argv.includes("--baseline")) {
  assert.equal(existsSync(`${output}/frozen-before.json`), false, "Refusing to overwrite the initial render baseline.");
}
const frozen = ["barberias", "peluquerias", "manicure", "estetica", "psicologos"]
  .flatMap((slug) => [`/software-agenda-${slug}`, `/para/${slug}`]).concat("/soluciones");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
const page = await context.newPage();
function normalizeFrozenHtml(html) {
  // React adds comment boundaries and Base UI generated IDs differently in dev and production.
  // Keep all content, element structure, classes and authored attributes.
  return html.replace(/<!--[\s\S]*?-->/g, "")
    .replace(/_R_[a-z0-9]+_/gi, "_REACT_ID_").replace(/_r_[a-z0-9]+_/gi, "_REACT_ID_")
    .replace(/ (?:id|aria-controls|aria-labelledby)="[^"]*_REACT_ID_[^"]*"/g, "");
}
async function snapshot(path) {
  const response = await page.goto(origin + path, { waitUntil: "networkidle", timeout: 120000 });
  assert.equal(response.status(), 200, path);
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const main = document.querySelector("main").cloneNode(true);
    main.querySelectorAll("script:not([type='application/ld+json'])").forEach((node) => node.remove());
    return {
      html: main.innerHTML.replace(/_R_[a-z0-9]+_/gi, "_REACT_ID_").replace(/_r_[a-z0-9]+_/gi, "_REACT_ID_"),
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      description: document.querySelector('meta[name="description"]')?.getAttribute("content"),
      robots: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
      jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]'), (el) => JSON.parse(el.textContent)),
      links: Array.from(document.querySelectorAll("a[href]"), (el) => el.getAttribute("href")),
    };
  });
}
try {
  const data = {};
  for (const path of frozen) {
    data[path] = await snapshot(path);
    data[path].html = normalizeFrozenHtml(data[path].html);
    console.log(`Frozen snapshot: ${path}`);
  }
  if (process.argv.includes("--baseline")) {
    writeFileSync(`${output}/frozen-before.json`, JSON.stringify(data, null, 2) + "\n");
    console.log("Captured initial render for 10 frozen pages and /soluciones.");
  } else {
    const before = JSON.parse(readFileSync(`${output}/frozen-before.json`, "utf8"));
    for (const path of frozen) before[path].html = normalizeFrozenHtml(before[path].html);
    writeFileSync(`${output}/frozen-candidate.json`, JSON.stringify(data, null, 2) + "\n");
    for (const path of frozen) {
      for (const key of Object.keys(before[path])) {
        assert.equal(JSON.stringify(data[path][key]) === JSON.stringify(before[path][key]), true, "Protected render changed: " + path + " · " + key);
      }
    }
    writeFileSync(`${output}/frozen-after.json`, JSON.stringify(data, null, 2) + "\n");
    writeFileSync(`${output}/frozen-render-check.json`, JSON.stringify(Object.fromEntries(frozen.map((path) => [path, {
      before: createHash("sha256").update(JSON.stringify(before[path])).digest("hex"),
      after: createHash("sha256").update(JSON.stringify(data[path])).digest("hex"),
    }])), null, 2) + "\n");
    console.log("PASS: all 11 protected renders are identical.");
    const paths = [
      "/funciones/recordatorios-citas-email", "/funciones/reservas-sin-cuenta",
      "/funciones/widget-reservas-web", "/funciones/agenda-multiples-sucursales", "/funciones/gift-cards",
      "/guias/dejar-de-agendar-por-whatsapp", "/guias/google-calendar-vs-sistema-reservas",
      "/guias/organizar-agenda-varios-profesionales", "/alternativa-calendly", "/alternativa-fresha",
    ];
    const critical = {
      "/funciones/recordatorios-citas-email": ["/guias/reducir-inasistencias-reservas", "/sistema-de-agendamiento-online"],
      "/funciones/reservas-sin-cuenta": ["/sistema-de-agendamiento-online", "/funciones/widget-reservas-web"],
      "/funciones/widget-reservas-web": ["/funciones/reservas-sin-cuenta", "/caracteristicas", "/demo"],
      "/funciones/agenda-multiples-sucursales": ["/funciones/agenda-multiples-profesionales", "/sistema-de-agendamiento-online"],
      "/funciones/gift-cards": ["/caracteristicas", "/funciones/reservas-sin-cuenta"],
      "/guias/dejar-de-agendar-por-whatsapp": ["/sistema-de-agendamiento-online", "/funciones/reservas-sin-cuenta"],
      "/guias/google-calendar-vs-sistema-reservas": ["/funciones/agenda-google-calendar", "/sistema-de-agendamiento-online"],
      "/guias/organizar-agenda-varios-profesionales": ["/funciones/agenda-multiples-profesionales"],
      "/alternativa-calendly": ["/sistema-de-agendamiento-online", "/pricing", "/demo"],
      "/alternativa-fresha": ["/sistema-de-agendamiento-online", "/pricing", "/demo"],
    };
    const sitemapResponse = await page.request.get(origin + "/sitemap.xml");
    assert.equal(sitemapResponse.status(), 200);
    const xml = await sitemapResponse.text();
    for (const path of paths) assert.equal(xml.split("<loc>https://www.puragenda.cl" + path + "</loc>").length - 1, 1, path);
    const reports = [];
    // Dismiss the existing banner locally so it cannot obscure visual evidence; no consent write API.
    await context.addInitScript(() => {
      localStorage.setItem("puragenda_cookie_consent", "rejected");
      localStorage.setItem("puragenda_cookie_consent_version", "2026-09-02");
    });
    for (const width of [1440, 390, 360]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      const titles = new Set(), headings = new Set();
      for (const path of paths) {
        const response = await page.goto(origin + path, { waitUntil: "networkidle", timeout: 120000 });
        assert.equal(response.status(), 200, path);
        assert.ok(!/noindex/i.test(response.headers()["x-robots-tag"] || ""));
        await page.evaluate(() => document.fonts.ready);
        const report = await page.evaluate(() => {
          const content = document.querySelector("[data-seo-content]");
          const graphs = Array.from(document.querySelectorAll('script[type="application/ld+json"]'), (s) => JSON.parse(s.textContent)).flatMap((g) => g["@graph"] || [g]);
          const faq = graphs.find((g) => g["@type"] === "FAQPage")?.mainEntity || [];
          const visibleFaq = Array.from(document.querySelectorAll("[data-seo-faq] article"), (el) => ({ question: el.querySelector("h3").textContent, answer: el.querySelector("p").textContent }));
          const overflow = Array.from(content.querySelectorAll("*")).filter((el) => {
            const r = el.getBoundingClientRect(), style = getComputedStyle(el);
            return r.width > 0 && style.position !== "fixed" && (r.right > innerWidth + 1 || r.left < -1 || el.scrollWidth > el.clientWidth + 2 && style.overflowX === "visible");
          }).map((el) => el.tagName + ":" + el.textContent.slice(0, 65));
          return {
            title: document.title, h1: Array.from(document.querySelectorAll("h1"), (el) => el.textContent),
            canonical: document.querySelector('link[rel="canonical"]')?.href,
            robots: document.querySelector('meta[name="robots"]')?.content,
            description: document.querySelector('meta[name="description"]')?.content,
            og: document.querySelector('meta[property="og:url"]')?.content,
            links: Array.from(content.querySelectorAll("a[href]"), (a) => a.getAttribute("href")),
            faq: faq.map((q) => ({ question: q.name, answer: q.acceptedAnswer.text })), visibleFaq, overflow,
            words: content.textContent.trim().split(/\s+/).length,
            sourceCount: content.querySelectorAll("#sources-heading").length,
            documentOverflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert.equal(report.canonical, "https://www.puragenda.cl" + path);
        assert.equal(report.og, report.canonical);
        assert.match(report.robots, /index/); assert.match(report.robots, /follow/); assert.ok(!/noindex|nofollow/.test(report.robots));
        assert.equal(report.h1.length, 1);
        assert.ok(report.description.length > 100);
        assert.ok(!titles.has(report.title)); titles.add(report.title);
        assert.ok(!headings.has(report.h1[0])); headings.add(report.h1[0]);
        assert.deepEqual(report.faq, report.visibleFaq, "FAQ mismatch: " + path);
        assert.equal(report.faq.length >= 5, true);
        assert.deepEqual(report.overflow, [], "Overflow at " + width + ": " + path);
        assert.equal(report.documentOverflow, false);
        for (const href of critical[path]) assert.ok(report.links.includes(href), path + " missing " + href);
        if (path.startsWith("/alternativa-")) assert.equal(report.sourceCount, 1);
        const name = path.slice(1).replaceAll("/", "--");
        await page.screenshot({ path: output + "/" + name + "-" + width + ".png", fullPage: true });
        await page.screenshot({ path: output + "/" + name + "-" + width + "-hero.png" });
        const closeupStyle = "body .fixed { visibility: hidden !important; }";
        if (path.startsWith("/alternativa-")) await page.locator("table").screenshot({ path: output + "/" + name + "-" + width + "-table.png", style: closeupStyle });
        await page.locator("[data-seo-faq]").screenshot({ path: output + "/" + name + "-" + width + "-faq.png", style: closeupStyle });
        await page.locator("[data-seo-content] > section").last().screenshot({ path: output + "/" + name + "-" + width + "-cta.png", style: closeupStyle });
        reports.push({ path, width, status: response.status(), ...report });
        console.log("PASS: " + width + "px " + path + " · " + report.words + " words · FAQ " + report.faq.length);
      }
    }
    await page.goto(origin + "/guias", { waitUntil: "networkidle" });
    const inbound = await page.locator("a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    for (const path of paths) assert.ok(inbound.includes(path), "Missing inbound discovery link: " + path);
    // Test the existing client events locally with consent, without storing them or contacting providers.
    const analytics = [];
    await context.route("**/api/analytics/track", async (route) => {
      analytics.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await context.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"user":null}' }));
    await page.goto(origin + "/funciones/reservas-sin-cuenta", { waitUntil: "networkidle" });
    const trackedPageView = page.waitForResponse((response) => response.url().endsWith("/api/analytics/track"));
    await page.evaluate(() => {
      localStorage.setItem("puragenda_cookie_consent", "accepted");
      localStorage.setItem("puragenda_cookie_consent_version", "2026-09-02");
      dispatchEvent(new CustomEvent("puragenda:analytics-consent-changed", { detail: "accepted" }));
    });
    await trackedPageView;
    await page.locator('[data-seo-content] a[href="/register?trial=1"]').first().click();
    await page.waitForURL("**/register?trial=1");
    const cohortEvents = analytics.filter((event) => event.properties.seo_batch);
    for (const name of ["page_view", "landing_cta_clicked"]) {
      const event = cohortEvents.find((event) => event.event === name);
      assert.ok(event, "Missing cohort event " + name);
      assert.equal(event.properties.seo_content_id, "reservas-sin-cuenta");
      assert.equal(event.properties.seo_batch, "seo-expansion-2026-10-b01");
      assert.equal(event.properties.seo_cluster, "feature");
      assert.equal(event.properties.seo_intent, "reserva-sin-registro");
    }
    writeFileSync(output + "/qa-results.json", JSON.stringify({ origin, widths: [1440, 390, 360], frozenRenders: 11, checkedPages: reports.length, inbound: true, analytics: cohortEvents.map((event) => ({ event: event.event, properties: event.properties })), reports }, null, 2) + "\n");
    console.log("PASS: 30 render checks, sitemap, discovery links and consented cohort events.");
  }
} finally { await browser.close(); }
