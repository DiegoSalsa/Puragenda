import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHmac } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

// Exercises real application actions exclusively against the isolated local fixtures.
const require = createRequire(import.meta.url);
const tooling = process.env.PINK_QA_TOOLING || resolve(process.env.TEMP || "/tmp", "puragenda-pink-y2k-qa/node_modules");
const { chromium } = require(resolve(tooling, "playwright"));
const port = process.env.Y2K_QA_PORT || "3005";
assert.match(port, /^\d{4,5}$/);
const origin = `http://localhost:${port}`, output = resolve("output/pink-y2k/native-template");
const db = new pg.Client({ connectionString: "postgresql://websiteqa@127.0.0.1:55439/websiteqa" });
await db.connect();
const original = (await db.query('SELECT * FROM "BusinessWebsite" WHERE "businessId"=$1', ["website-qa-a"])).rows[0];
assert.ok(original, "Prepare the local website fixtures first");
const beforeMedia = new Set((await db.query('SELECT id FROM "WebsiteMedia" WHERE "websiteId"=$1', [original.id])).rows.map(row => row.id));
const user = (await db.query('SELECT id,email,name,role,"tokenVersion","isSuperAdmin" FROM "User" WHERE id=$1', ["website-qa-a-owner"])).rows[0];
const payload = Buffer.from(JSON.stringify({ ...user, v: 3, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
const value = `${payload}.${createHmac("sha256", "local-website-qa-auth-secret-isolated-2026").update(payload).digest("base64url")}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
await context.addCookies([{ name: "puragenda_session", value, url: origin, httpOnly: true }, { name: "puragenda_changelog_seen", value: "v2.2.0", url: origin }]);
const page = await context.newPage(), reports = [], errors = [];
page.setDefaultTimeout(30000);
page.on("pageerror", error => errors.push(error.message));
const check = (name, result) => { assert.ok(result, name); reports.push({ name, result: "PASS" }); console.log(`PASS ${name}`); };
const site = async () => (await db.query('SELECT * FROM "BusinessWebsite" WHERE id=$1', [original.id])).rows[0];
const panel = key => page.locator(`#website-panel-${key}`);
const live = () => page.frameLocator('iframe[title="Vista previa en vivo de mi sitio"]');
async function saved(predicate) {
  for (let n = 0; n < 100; n++) { const row = await site(); if (predicate(row)) return row; await new Promise(r => setTimeout(r, 150)); }
  throw new Error("Draft did not reach the expected saved state");
}
async function select(name) {
  await page.getByRole("tab", { name: "Diseño", exact: true }).click();
  const card = panel("design").locator('[class*="designCard"]').filter({ has: page.getByText(name, { exact: true }) });
  await card.getByRole("button", { name: "Usar diseño", exact: true }).click();
}
try {
  await page.goto(`${origin}/dashboard/website`, { waitUntil: "networkidle", timeout: 180000 });
  await page.getByRole("button", { name: "Cerrar anuncio de Sitio Web" }).click().catch(() => {});
  check("Y2K appears in the authenticated template selector", await panel("design").getByText("Y2K", { exact: true }).isVisible());
  await select("Y2K");
  await panel("design").getByText("Y2K · Nail art con personalidad").waitFor();
  const selected = await saved(row => row.templateKey === "y2k");
  check("selection retains tenant content and published design", selected.draftConfig.displayName === original.draftConfig.displayName && selected.publishedTemplateKey === original.publishedTemplateKey);
  check("selection imports no stock demo photos", !JSON.stringify(selected.draftConfig).includes("/websites/pink-y2k/pink-dream.webp"));
  await page.getByRole("tab", { name: "Portada", exact: true }).click();
  await panel("hero").getByLabel("Nombre visible", { exact: false }).fill("Estudio QA Y2K");
  await panel("hero").getByLabel("Titular · línea 1", { exact: true }).fill("Mi idea,");
  await panel("hero").getByLabel("Titular · línea 2", { exact: true }).fill("mi mundo.");
  await live().getByRole("heading", { level: 1, name: "Mi idea, mi mundo." }).waitFor();
  await saved(row => row.draftConfig.displayName === "Estudio QA Y2K" && row.draftConfig.headline?.[1] === "mi mundo.");
  check("native autosave and live iframe update the headline and brand", true);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Portada", exact: true }).click();
  check("edits survive reload", await panel("hero").getByLabel("Titular · línea 1", { exact: true }).inputValue() === "Mi idea,");
  await panel("hero").getByLabel("Subir Foto principal", { exact: true }).setInputFiles("public/websites/pink-y2k/pink-dream.webp");
  await saved(row => row.draftConfig.heroImage?.startsWith("/website-media-qa/website-qa-a/"));
  check("hero uploads through the tenant-owned media library", true);
  await page.getByRole("tab", { name: "Galería", exact: true }).click();
  await panel("gallery").getByText("Categorías de trabajos", { exact: true }).click();
  await panel("gallery").getByLabel("Nueva categoría", { exact: true }).fill("QA categoría");
  await panel("gallery").getByRole("button", { name: "Añadir", exact: true }).click();
  await panel("gallery").getByLabel("Subir Añadir foto", { exact: true }).setInputFiles("public/websites/pink-y2k/pink-dream.webp");
  let uploaded;
  uploaded = await saved(row => row.draftConfig.gallery?.some(photo => photo.image.startsWith("/website-media-qa/website-qa-a/")));
  const photoIndex = uploaded.draftConfig.gallery.findIndex(photo => photo.image.startsWith("/website-media-qa/website-qa-a/"));
  const detail = panel("gallery").locator('details').filter({ has: page.getByLabel("Subir Reemplazar foto", { exact: true }) }).nth(photoIndex);
  await detail.locator("summary").click();
  await detail.getByRole("textbox", { name: "Título", exact: true }).fill("Trabajo QA original");
  await detail.getByRole("button", { name: "QA categoría", exact: true }).click();
  await saved(row => row.draftConfig.gallery.some(photo => photo.name === "Trabajo QA original" && photo.categoryIds?.length));
  await live().getByRole("button", { name: "QA categoría", exact: true }).waitFor();
  check("gallery upload, title and category persist and appear in the preview", true);
  await page.getByRole("tab", { name: "Contacto", exact: true }).click();
  await panel("contact").getByLabel("WhatsApp", { exact: true }).fill("+56911112222");
  await panel("contact").getByLabel("Email", { exact: true }).fill("y2k@example.test");
  await panel("contact").getByLabel("Personalizar vista de Google", { exact: true }).check();
  await panel("contact").getByLabel("Título de Google", { exact: true }).fill("Estudio QA Y2K · Mi sitio");
  await saved(row => row.draftConfig.seoTitle === "Estudio QA Y2K · Mi sitio" && row.draftConfig.contactEmail === "y2k@example.test");
  await page.getByRole("button", { name: "Móvil", exact: true }).click();
  await live().getByRole("heading", { name: "Mi idea, mi mundo.", exact: true }).waitFor();
  const frame = page.frames().find(frame => frame.url().includes("/website-preview"));
  await frame.waitForFunction(() => innerWidth === 390);
  const geometry = await frame.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  console.log("Mobile preview geometry", geometry);
  check("mobile live preview has no horizontal overflow", geometry.width === 390 && geometry.scroll <= 391);
  await page.screenshot({ path: resolve(output, "editor-mobile-preview.png") });
  await page.getByRole("button", { name: "Publicar cambios", exact: true }).click();
  const published = await saved(row => row.publishedTemplateKey === "y2k" && row.publishedConfig.displayName === "Estudio QA Y2K");
  check("publication saves the Y2K identity and matching revision", published.publishedRevision === published.revision);
  const publicPage = await context.newPage();
  const publicResponse = await publicPage.goto(`http://${published.subdomain}.localhost:${port}/`, { waitUntil: "networkidle", timeout: 120000 });
  check("public host renders the published Y2K design", publicResponse.status() === 200 && await publicPage.getByRole("heading", { name: "Mi idea, mi mundo.", exact: true }).isVisible());
  check("public metadata and contact use saved tenant values", await publicPage.title() === "Estudio QA Y2K · Mi sitio" && await publicPage.getByRole("link", { name: "y2k@example.test", exact: true }).isVisible());
  await publicPage.getByRole("button", { name: "Ampliar foto de portada", exact: true }).click();
  const cover = publicPage.getByRole("dialog");
  await cover.waitFor();
  check("cover enlargement displays the cover rather than the first gallery photo", decodeURIComponent(await cover.locator("img").getAttribute("src")).includes(published.publishedConfig.heroImage));
  await publicPage.getByRole("button", { name: "Cerrar imagen", exact: true }).click();
  await publicPage.getByRole("button", { name: "QA categoría", exact: true }).click();
  check("published gallery category filters actual photos", await publicPage.getByRole("button", { name: "Ampliar Trabajo QA original", exact: true }).isVisible() && await publicPage.locator('button[class*="galleryPhoto"]').count() === 1);
  for (const image of await publicPage.locator("#studio-root img").all()) {
    await image.scrollIntoViewIfNeeded();
    await publicPage.waitForFunction(element => element.complete && element.naturalWidth > 0, await image.elementHandle());
  }
  check("published uploaded and inherited images load successfully", true);
  await publicPage.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await publicPage.screenshot({ path: resolve(output, "published-desktop.png"), fullPage: true });
  await publicPage.getByRole("button", { name: "Reservar hora", exact: true }).first().click();
  await publicPage.getByRole("dialog").waitFor();
  check("published reserve button opens the canonical booking flow", await publicPage.getByRole("dialog").isVisible());
  await select("Bella");
  await panel("design").getByText("Y2K · Nail art con personalidad", { exact: true }).waitFor({ state: "hidden" });
  await saved(row => row.templateKey === "bella");
  await publicPage.reload({ waitUntil: "networkidle" });
  check("switching draft templates preserves the published Y2K site", await publicPage.getByRole("heading", { name: "Mi idea, mi mundo.", exact: true }).isVisible());
  await select("Y2K");
  const restored = await saved(row => row.templateKey === "y2k");
  check("switching back restores the complete Y2K draft", restored.draftConfig.headline[0] === "Mi idea," && restored.draftConfig.seoTitle === "Estudio QA Y2K · Mi sitio" && restored.draftConfig.gallery.some(photo => photo.name === "Trabajo QA original"));
  check("no browser runtime errors", errors.length === 0);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ environment: "isolated local websiteqa", reports, errors }, null, 2));
} finally {
  await browser.close();
  await db.query('UPDATE "BusinessWebsite" SET "templateKey"=$1,"templateVersion"=$2,"draftConfig"=$3,"templateConfigs"=$4,"publishedTemplateKey"=$5,"publishedTemplateVersion"=$6,"publishedConfig"=$7,revision=$8,"publishedRevision"=$9,status=$10,"publishedAt"=$11 WHERE id=$12 AND "businessId"=$13', [original.templateKey, original.templateVersion, original.draftConfig, original.templateConfigs, original.publishedTemplateKey, original.publishedTemplateVersion, original.publishedConfig, original.revision, original.publishedRevision, original.status, original.publishedAt, original.id, "website-qa-a"]);
  const after = (await db.query('SELECT id,"secureUrl",provider FROM "WebsiteMedia" WHERE "websiteId"=$1', [original.id])).rows;
  for (const row of after) if (!beforeMedia.has(row.id) && row.provider === "local" && row.secureUrl.startsWith("/website-media-qa/website-qa-a/")) {
    await db.query('DELETE FROM "WebsiteMedia" WHERE id=$1 AND "websiteId"=$2', [row.id, original.id]);
    await unlink(resolve(`public${row.secureUrl}`)).catch(() => {});
  }
  await db.end();
}
