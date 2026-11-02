import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import changelog from "../src/config/changelog.ts";
const { CHANGELOG_DATA } = changelog;

async function main() {
  const origin = process.env.ONBOARDING_QA_ORIGIN ?? "http://localhost:3116";
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error("LOCAL_BROWSER_QA_ONLY");
  const require = createRequire(resolve(process.env.ONBOARDING_QA_MODULES ?? resolve(homedir(), ".codex/tools/puri-onboarding-qa"), "package.json"));
  const { chromium } = require("playwright");
  const artifacts = process.env.ONBOARDING_QA_ARTIFACTS ?? resolve(homedir(), ".codex/artifacts/puri-onboarding-v2-iteration2");
  mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const results = [];
  const errors = [];
  const cleanError = value => String(value).replace(/((?:cookie|authorization):\s*)[^\n]+/gi, "$1[redacted]");
  const contexts = [];
  const stamp = Date.now();
  async function newSession(email, mobile = false, team = false, ui = false) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-for": "127.0.0.1" }, permissions: ["clipboard-read", "clipboard-write"], reducedMotion: "reduce" });
    contexts.push(context);
    const accountEmail = email ?? `iteration2-${team ? "team" : mobile ? "mobile" : "solo"}-${stamp}@example.invalid`;
    if (email) await context.addCookies([{ name: "puragenda_changelog_seen", value: CHANGELOG_DATA[0].version, url: origin }]);
    if (ui) {
      const page = await context.newPage(); page.on("pageerror", e => errors.push(cleanError(e.stack ?? e.message)));
      await page.goto(`${origin}/register`); await page.waitForLoadState("networkidle");
      const reject = page.getByRole("button", { name: /^rechazar$/i }); if (await reject.isVisible()) await reject.click();
      await page.locator("#name").fill("Antonia QA"); await page.locator("#businessName").fill(`Manicure QA ${stamp}`);
      await page.locator("#marketplaceLocalitySlug").selectOption("__not_found__"); await page.locator("#marketplaceCityName").fill("Ciudad ficticia");
      await page.locator("#marketplaceCategorySlug").selectOption("puri-demo"); await page.locator("#email").fill(accountEmail);
      await page.locator("#password").fill("PuriDemo2026!"); await page.locator("#confirmPassword").fill("PuriDemo2026!"); await page.locator("#terms").check();
      await page.locator("form button[type=submit]").click(); await page.waitForURL(`${origin}/dashboard/setup`, { waitUntil: "domcontentloaded" }); await page.waitForLoadState("networkidle"); await page.getByRole("heading", { name: /Empecemos,/ }).waitFor();
      assert.equal(await page.locator("[data-changelog-close]").isVisible(), false, "No promotion may precede Setup");
      return { page, context, email: accountEmail };
    }
    const response = email ? await context.request.post(`${origin}/api/auth/login`, { data: { email, password: "PuriDemo2026!" } }) : await context.request.post(`${origin}/api/auth/register`, { data: {
      name: team ? "Camila QA" : "Antonia QA", email: accountEmail, password: "PuriDemo2026!", businessName: `${team ? "Equipo" : "Estudio"} QA ${stamp}${mobile ? " móvil" : ""}`, countryCode: "CL", currencyCode: "CLP", timezone: "America/Santiago", commercialPlanIntent: team ? "PURAGENDA_PLUS" : "PURAGENDA", professionalTotal: team ? 2 : 1,
      marketplaceCategorySlug: "puri-demo", marketplaceLocalityNotFound: true, marketplaceCityName: "Ciudad ficticia", marketplaceAuthorized: false, termsAccepted: true,
    } });
    assert.equal(response.ok(), true, `Auth failed: ${response.status()} ${await response.text()}`);
    const page = await context.newPage(); page.on("pageerror", (e) => errors.push(cleanError(e.stack ?? e.message)));
    await page.goto(`${origin}/dashboard`); await page.waitForLoadState("networkidle");
    const reject = page.getByRole("button", { name: /^rechazar$/i });
    await reject.waitFor({ state: "visible", timeout: 2500 }).catch(() => undefined);
    if (await reject.isVisible()) { await reject.click(); await reject.waitFor({ state: "hidden" }); }
    return { page, context, email: accountEmail };
  }
  async function state(context) { const r = await context.request.get(`${origin}/api/dashboard/setup`); assert.equal(r.ok(), true); return r.json(); }
  async function waitUntil(test, label) { const until = Date.now() + 25000; while (Date.now() < until) { try { if (await test()) return; } catch (error) { if (!/ECONNRESET|socket hang up/.test(String(error))) throw error; } await new Promise(r => setTimeout(r, 150)); } throw new Error(`Timeout: ${label}`); }
  async function clickSave(page) { await page.locator("[data-tour='hours-save']").click(); await page.getByText("Horarios guardados", { exact: true }).waitFor(); }
  async function askSetup(page, message, apply = true) {
    const details = page.locator("[data-tour='setup-conversation']");
    if ((await details.getAttribute("open")) === null) await details.locator("summary").click();
    await details.getByRole("textbox", { name: "Escribir a Puri sobre este paso" }).fill(message);
    const [response] = await Promise.all([page.waitForResponse(r => r.url().endsWith("/api/dashboard/puri") && r.request().method() === "POST"), details.getByRole("button", { name: "Enviar a Puri", exact: true }).click()]); assert.equal(response.status(), 200, await response.text());
    const result = await response.json();
    if (apply) {
      await details.getByRole("button", { name: "Revisar en el editor", exact: true }).click();
      await details.getByText(/Propuesta llevada al editor/).waitFor();
    }
    return result.answer;
  }
  async function dismissPromotion(page) { const close = page.locator("[data-changelog-close]"); await close.waitFor({ state: "visible", timeout: 1500 }).catch(() => undefined); if (await close.isVisible()) await close.click(); }
  async function screenshot(page, name) {
    await page.locator("#tutorial-main").evaluate(el => el.scrollTo({ top: 0, left: 0, behavior: "instant" })).catch(() => undefined);
    await page.screenshot({ path: resolve(artifacts, `${name}.png`), fullPage: true });
    const width = await page.evaluate(() => ({ viewport: innerWidth, body: document.documentElement.scrollWidth }));
    assert.ok(width.body <= width.viewport + 1, `${name}: horizontal overflow ${JSON.stringify(width)}`);
  }
  try {
    const solo = await newSession(undefined, false, false, true);
    assert.ok(solo.page.url().endsWith("/dashboard/setup"));
    assert.equal(await solo.page.locator("[data-changelog-close]").isVisible(), false);
    await solo.page.getByRole("radio", { name: /Trabajo de forma independiente/ }).check();
    await screenshot(solo.page, "01-bienvenida-escritorio");
    await solo.page.getByRole("button", { name: "Continuar", exact: true }).click();
    await solo.page.getByRole("heading", { name: "Horarios", exact: true }).waitFor();
    const beforeProposal = await state(solo.context);
    const prepared = await askSetup(solo.page, "Trabajo de lunes a viernes de 9 a 19, con colación de 13 a 14. Los sábados atiendo hasta las 14.");
    assert.equal(prepared.setup.mode, "rules");
    assert.equal(await solo.page.getByRole("textbox", { name: "Inicio de pausa Lunes", exact: true }).inputValue(), "13:00");
    assert.equal(await solo.page.getByRole("textbox", { name: "Fin de pausa Lunes", exact: true }).inputValue(), "14:00");
    assert.equal(await solo.page.getByRole("textbox", { name: "Fin Sábado", exact: true }).inputValue(), "14:00");
    const onlyDraft = await state(solo.context);
    assert.equal(onlyDraft.locations[0].hours.find(h => h.dayOfWeek === 1).breakStart, beforeProposal.locations[0].hours.find(h => h.dayOfWeek === 1).breakStart, "Preparing must not save the business schedule");
    await screenshot(solo.page, "02-propuesta-horarios-revisable");
    await clickSave(solo.page);
    await solo.page.getByRole("button", { name: /Usar este horario en/ }).click();
    await waitUntil(async () => (await state(solo.context)).locations[0].hours.find(h => h.dayOfWeek === 6)?.endTime === "14:00", "confirmed Saturday hours");
    results.push({ scenario: "C: Natural-language hours → identified deterministic mode → real editor fields → no domain writes until confirmation → saved business/professional hours", status: "passed" });
    await solo.page.getByRole("button", { name: "Continuar", exact: true }).click();
    await solo.page.getByRole("heading", { name: "Servicios", exact: true }).waitFor();
    const servicesPrepared = await askSetup(solo.page, "Soy manicurista y ofrezco esmaltado permanente, kapping y soft gel.");
    assert.equal(servicesPrepared.setup.proposal.names.length, 3);
    assert.equal((await state(solo.context)).catalog.services.length, 0);
    for (const [index, name] of ["esmaltado permanente", "kapping", "soft gel"].entries()) {
      assert.equal(await solo.page.getByRole("textbox", { name: "Nombre del servicio", exact: true }).inputValue(), name);
      assert.equal(await solo.page.getByLabel("Duración (minutos)").inputValue(), ""); assert.equal(await solo.page.getByLabel("Precio (CLP)").inputValue(), "");
      await solo.page.getByLabel("Duración (minutos)").fill(String(30 + index * 15)); await solo.page.getByLabel("Precio (CLP)").fill(String(12000 + index * 3000));
      await solo.page.getByRole("button", { name: "Guardar servicio", exact: true }).click();
      await waitUntil(async () => (await state(solo.context)).catalog.services.length === index + 1, "reviewed service saved");
    }
    await screenshot(solo.page, "03-tres-servicios-confirmados");
    await solo.page.getByRole("button", { name: "Continuar", exact: true }).click();
    await solo.page.getByRole("button", { name: "Comprobar disponibilidad", exact: true }).click();
    await solo.page.getByRole("heading", { name: "Encontramos horas disponibles" }).waitFor();
    await solo.page.getByRole("button", { name: /^\d{1,2}:\d{2}$/ }).first().click();
    await solo.page.getByText(/no se creó una cita/).waitFor();
    await solo.page.getByRole("button", { name: "Copiar enlace", exact: true }).click();
    const verified = await state(solo.context); assert.equal(verified.verified, true); assert.equal(verified.bookings, 0);
    const publicPage = await solo.context.newPage(); const publicResponse = await publicPage.goto(`${origin}${verified.publicPath}`);
    assert.equal(publicResponse?.status(), 200); assert.ok((await publicPage.locator("body").innerText()).includes("soft gel")); await publicPage.close();
    // Exercise recovery from the server before finishing, and settle development hydration.
    await solo.page.reload({ waitUntil: "networkidle" });
    await screenshot(solo.page, "04-comprobacion-real");
    await solo.page.getByRole("button", { name: "Finalizar configuración", exact: true }).click();
    await solo.page.getByRole("link", { name: "Ir a Hoy", exact: true }).click();
    await solo.page.waitForURL(`${origin}/dashboard`); await dismissPromotion(solo.page); await solo.page.reload({ waitUntil: "networkidle" }); assert.equal(new URL(solo.page.url()).pathname, "/dashboard"); await screenshot(solo.page, "05-dashboard");
    results.push({ scenario: "A: Full UI registration → automatic Setup without promotions → reviewed schedules and three services → real availability → public widget → copied link → finish → Today on reload", status: "passed" });

    const team = await newSession(undefined, false, true);
    await askSetup(team.page, "Tengo un centro de estética con tres profesionales.");
    assert.equal(await team.page.getByRole("radio", { name: /Tengo un equipo/ }).isChecked(), true);
    assert.equal((await state(team.context)).capacity.total, 2, "Proposal cannot grant a third paid seat");
    await team.page.getByRole("button", { name: "Continuar", exact: true }).click(); await clickSave(team.page);
    await team.page.getByRole("button", { name: "Continuar", exact: true }).click();
    await team.page.getByRole("heading", { name: "Profesionales", exact: true }).waitFor();
    await askSetup(team.page, "Mi equipo es Daniela QA y Josefina QA");
    await team.page.getByRole("button", { name: "Agregar profesional", exact: true }).click();
    await waitUntil(async () => (await state(team.context)).staff.length === 2, "second professional saved");
    assert.equal(await team.page.getByRole("button", { name: "Agregar profesional", exact: true }).isDisabled(), true);
    await team.page.getByRole("button", { name: "Confirmar horario del negocio para Daniela QA", exact: true }).click();
    await screenshot(team.page, "06-equipo");
    await team.page.getByRole("button", { name: "Continuar", exact: true }).click();
    await team.page.getByRole("textbox", { name: "Nombre del servicio", exact: true }).fill("Sesión de equipo");
    await team.page.getByLabel("Duración (minutos)").fill("45"); await team.page.getByLabel("Precio (CLP)").fill("18000");
    await team.page.getByRole("button", { name: "Guardar servicio", exact: true }).click();
    await waitUntil(async () => (await state(team.context)).catalog.services.length === 1, "team service saved");
    await team.page.getByRole("button", { name: "Continuar", exact: true }).click();
    await team.page.getByRole("button", { name: "Comprobar disponibilidad", exact: true }).click();
    await team.page.getByRole("heading", { name: "Encontramos horas disponibles" }).waitFor();
    assert.equal((await state(team.context)).optional.website, true);
    await team.page.getByRole("button", { name: "Finalizar configuración", exact: true }).click(); await team.page.getByRole("link", { name: "Ir a Hoy", exact: true }).click(); await team.page.waitForURL(`${origin}/dashboard`);
    results.push({ scenario: "B: Natural-language business/team proposals → two professionals → schedules and shared service → functional agenda without exceeding the granted contract", status: "passed" });

    const mobile = await newSession(undefined, true);
    await mobile.page.getByRole("radio", { name: /Trabajo de forma independiente/ }).check();
    await mobile.page.getByRole("button", { name: "Continuar", exact: true }).click();
    await mobile.page.getByRole("heading", { name: "Horarios", exact: true }).waitFor();
    await screenshot(mobile.page, "07-horarios-movil");
    await mobile.page.getByRole("textbox", { name: "Inicio Lunes", exact: true }).fill("11:00");
    await mobile.page.getByRole("button", { name: "Guardar y salir", exact: true }).click();
    await mobile.page.waitForURL(`${origin}/dashboard`);
    await mobile.context.request.post(`${origin}/api/auth/logout`);
    await mobile.page.goto(`${origin}/dashboard`); await mobile.page.waitForURL(/\/login/);
    const secondDevice = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "x-forwarded-for": "127.0.0.1" } }); contexts.push(secondDevice);
    const second = await secondDevice.newPage(); await second.goto(`${origin}/login`);
    await second.locator("#email").fill(mobile.email); await second.locator("#password").fill("PuriDemo2026!"); await second.locator("form button[type=submit]").click(); await second.waitForURL(`${origin}/dashboard`);
    await second.getByRole("link", { name: "Continuar configuración", exact: true }).click(); await second.waitForURL(`${origin}/dashboard/setup`); await second.waitForLoadState("networkidle");
    assert.equal(await second.getByRole("textbox", { name: "Inicio Lunes", exact: true }).inputValue(), "11:00");
    await screenshot(second, "08-reanudacion-movil");
    results.push({ scenario: "D: Draft → save and exit → real logout → login from a new mobile session → same server draft recovered", status: "passed" });

    await second.locator("[data-tour='setup-conversation'] summary").click();
    await second.route("**/api/dashboard/puri", route => route.abort("failed"));
    await second.getByRole("textbox", { name: "Escribir a Puri sobre este paso" }).fill("Ayúdame a organizar la disponibilidad");
    await second.getByRole("button", { name: "Enviar a Puri", exact: true }).click(); await second.locator("[data-tour='setup-conversation'] [role=alert]").waitFor();
    await second.unroute("**/api/dashboard/puri"); await clickSave(second);
    assert.equal(await second.getByRole("textbox", { name: "Inicio Lunes", exact: true }).isEnabled(), true);
    results.push({ scenario: "H: Unavailable Puri transport → visible error → real manual hours save remains usable; external provider timeout/quota fallbacks also covered by unit tests", status: "passed" });
    await second.getByRole("button", { name: /Comprobar agenda/ }).first().click();
    await second.locator("[data-tour='setup-diagnostics']").waitFor();
    const diagnostic = await askSetup(second, "¿Por qué no hay disponibilidad?", false);
    assert.ok(diagnostic.message.includes("servicio activo")); assert.equal(diagnostic.setup.proposal, undefined);
    assert.equal((await state(secondDevice)).verified, false);
    await screenshot(second, "09-problema-real-de-disponibilidad-movil");
    await second.getByRole("button", { name: "Ir a Servicios", exact: true }).click();
    await second.getByRole("textbox", { name: "Nombre del servicio", exact: true }).waitFor();
    results.push({ scenario: "G: No bookable service → real diagnostic from authorized catalog → Puri explains cause → direct navigation to Services without fake success", status: "passed" });

    const existing = await newSession("existente@puri-demo.invalid");
    assert.equal(new URL(existing.page.url()).pathname, "/dashboard");
    results.push({ scenario: "F: Existing configured business enters Today without forced onboarding", status: "passed" });
    const limited = await newSession("profesional@puri-demo.invalid");
    const denied = await limited.context.request.get(`${origin}/api/dashboard/setup`); assert.equal(denied.status(), 403);
    const guides = await (await limited.context.request.get(`${origin}/api/dashboard/learning`)).json(); assert.equal(guides.tutorials.some((t) => ["staff", "hours", "services", "website"].includes(t.id)), false);
    results.push({ scenario: "Limited professional cannot read Setup or receive unauthorized management guides", status: "passed" });

    // Puri's deterministic help path works while OPENAI_API_KEY is intentionally absent.
    await solo.page.locator("[data-tour='puri-launcher']").click();
    const textarea = solo.page.locator("textarea"); await textarea.fill("¿Cómo bloqueo un día para que no me reserven?"); await textarea.press("Enter");
    await solo.page.getByRole("link", { name: /Iniciar guía: Cerrar un día/ }).waitFor();
    await screenshot(solo.page, "09-puri-ayuda-contextual");
    await solo.page.getByRole("link", { name: /Iniciar guía: Cerrar un día/ }).click();
    await solo.page.locator(".driver-popover").waitFor();
    await screenshot(solo.page, "10-guia-bloquear-dia");
    await solo.page.locator(".driver-popover-next-btn").click(); await solo.page.locator(".driver-popover-next-btn").click();
    await waitUntil(async () => { const p = await (await solo.context.request.get(`${origin}/api/dashboard/learning`)).json(); return p.progress.some((p) => p.tutorialId === "block-day" && p.status === "completed"); }, "guide completed");
    await solo.page.goto(`${origin}/dashboard/services?learn=services`); await solo.page.locator(".driver-popover").waitFor();
    await solo.page.locator(".driver-popover-next-btn").click();
    await solo.page.locator("#btn-nuevo-servicio").click();
    await waitUntil(async () => (await solo.page.locator(".driver-popover-title").textContent()).includes("Disponibilidad"), "tutorial detects form open");
    await solo.page.locator(".driver-popover-close-btn").click();
    await waitUntil(async () => { const p = await (await solo.context.request.get(`${origin}/api/dashboard/learning`)).json(); return p.progress.some(p => p.tutorialId === "services" && p.status === "paused" && p.step === 2); }, "tutorial paused on server");
    await solo.page.reload();
    // The same explicit guide link resumes the saved step instead of showing an automatic general tour.
    await solo.page.locator(".driver-popover").waitFor();
    assert.ok((await solo.page.locator(".driver-popover-title").textContent()).includes("Disponibilidad"));
    await solo.page.locator(".driver-popover-next-btn").click();
    await solo.page.locator("[data-tour='contextual-help']").filter({ visible: true }).first().click();
    await solo.page.getByRole("dialog", { name: "Aprende con Puri" }).waitFor();
    await solo.page.keyboard.press("Tab");
    assert.equal(await solo.page.getByRole("dialog", { name: "Aprende con Puri" }).evaluate(el => el.contains(document.activeElement)), true);
    const item = solo.page.getByRole("button", { name: /^Crear un servicio reservable/ }); await item.click();
    await solo.page.locator(".driver-popover").waitFor(); assert.ok((await solo.page.locator(".driver-popover-title").textContent()).includes("Revisa tu catálogo"));
    await screenshot(solo.page, "11-guia-servicios-reiniciada"); await solo.page.locator(".driver-popover-close-btn").click();
    await solo.page.goto(`${origin}/dashboard`); await dismissPromotion(solo.page);
    await solo.page.locator("[data-tour='puri-launcher']").click();
    const question = solo.page.locator("textarea"); await question.fill("Puri, ¿cómo agrego un cliente?"); await question.press("Enter");
    await solo.page.getByRole("link", { name: /Iniciar guía: Registrar un cliente/ }).click(); await solo.page.locator(".driver-popover").waitFor();
    await solo.page.locator(".driver-popover-next-btn").click(); await solo.page.locator("[data-tour='appointment-create']").click();
    await waitUntil(async () => (await solo.page.locator(".driver-popover-title").textContent()).includes("Datos del cliente"), "real customer controls highlighted");
    assert.equal(await solo.page.locator("[data-tour='appointment-customer']").evaluate(el => el.classList.contains("driver-active-element")), true);
    await screenshot(solo.page, "12-cliente-desde-puri-sin-crear-reserva"); await solo.page.locator(".driver-popover-next-btn").click();
    await solo.page.goto(`${origin}/dashboard`); await solo.page.locator("[data-tour='puri-launcher']").click(); await solo.page.locator("[data-tour='puri-learning']").click();
    const help = solo.page.getByRole("dialog", { name: "Aprende con Puri" }); await help.waitFor();
    assert.equal(await solo.page.locator("[role='dialog'][aria-modal='true']").count(), 1);
    assert.ok(await help.locator("[data-tour='learning-results'] > div").count() <= 4);
    await help.getByRole("searchbox", { name: "Buscar una guía" }).fill("horarios"); await help.getByRole("button", { name: /Configurar días y pausas/ }).waitFor();
    await screenshot(solo.page, "13-ayuda-contextual-organizada");
    assert.equal((await state(solo.context)).bookings, 0, "Tutorials did not create fictitious appointments");
    results.push({ scenario: "E: Puri → correct client/closing-day guides → real controls and route navigation → completion/pause/resume/restart → contextual search/modules → one help panel at a time", status: "passed" });
    results.push({ scenario: "Desktop and mobile layout has no document horizontal overflow; no unhandled browser exceptions", status: errors.length ? "failed" : "passed", detail: errors.join("; ") });
    assert.equal(errors.length, 0, errors.join("\n"));
  } catch (error) {
    results.push({ scenario: "Browser run", status: "failed", detail: cleanError(error instanceof Error ? error.stack : error) });
    for (const context of contexts) for (const page of context.pages()) await page.screenshot({ path: resolve(artifacts, `failure-${contexts.indexOf(context)}-${context.pages().indexOf(page)}.png`) }).catch(() => undefined);
    throw error;
  } finally {
    writeFileSync(resolve(artifacts, "browser-results.json"), JSON.stringify({ at: new Date().toISOString(), origin, results, errors }, null, 2));
    await browser.close(); console.log(JSON.stringify(results, null, 2)); console.log(`Artifacts: ${artifacts}`);
  }
}
main().catch(error => { console.error(String(error.stack ?? error).replace(/((?:cookie|authorization):\s*)[^\n]+/gi, "$1[redacted]")); process.exitCode = 1; });
