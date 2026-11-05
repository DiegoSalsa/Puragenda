import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream, readdirSync, writeFileSync } from "node:fs";
import { localCommercialDatabase } from "./commercial-migrations.mjs";
if (readdirSync(".").some(n => /^\.env(?:\.|$)/.test(n) && n !== ".env.example")) throw new Error("NO_AMBIENT_ENV_FILES_REQUIRED");
const databaseUrl = localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const safe = new Set(["PATH","SYSTEMROOT","WINDIR","TEMP","TMP","APPDATA","LOCALAPPDATA","USERPROFILE","COMSPEC","PATHEXT","PROGRAMFILES","PROGRAMFILES(X86)"]);
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => safe.has(k.toUpperCase())));
Object.assign(env, { NODE_ENV: "production", DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl,
  AUTH_SECRET: randomBytes(32).toString("hex"), NEXT_TELEMETRY_DISABLED: "1", WEBSITE_BUILD_QA: "1",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3120", APP_URL: "http://127.0.0.1:3120", NEXT_PUBLIC_PADDLE_ENV: "sandbox",
  COMMERCIAL_V2_INTERNAL_WRITES: "1", COMMERCIAL_V2_SANDBOX_WRITES: "1", COMMERCIAL_V2_SANDBOX_WEBHOOKS: "1",
  COMMERCIAL_V2_MP_OWNER_SANDBOX: "1",
  PURI_PLUS_INTERNAL_ENABLED: "1", PURI_PLUS_AI_ENABLED: "1", PURI_PLUS_PROACTIVE_ENABLED: "1", CONTACT_FLOW_LAB_ENABLED: "1",
  CONTACT_FLOW_PUBLIC_CONSENT_ENABLED: "1", CONTACT_FLOW_RESEND_TEST_ENABLED: "1", COMMERCIAL_WORKER_ENABLED: "1",
  WEBSITE_LAUNCH_ENABLED: "0", WEBSITE_CHECKOUT_ENABLED: "0", MCP_ENABLED: "0" });
const log = createWriteStream("scratch/iteration-8-production-seal-server.log");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3120"], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
child.stdout.pipe(log); child.stderr.pipe(log);
try {
  const origin = "http://127.0.0.1:3120", deadline = Date.now() + 45000;
  while (true) {
    try { await fetch(origin + "/api/cron/puragenda-next"); break; } catch {}
    if (Date.now() > deadline) throw new Error("PRODUCTION_TEST_SERVER_START_TIMEOUT");
    await new Promise(r => setTimeout(r, 250));
  }
  const results = [];
  for (const [path, method] of [
    ["/api/dashboard/puri-plus", "POST"], ["/api/dashboard/contact-flow", "POST"],
    ["/api/dashboard/puri-plus/billing", "POST"],
    ["/api/internal/puri-plus", "POST"], ["/api/internal/contact-flow", "POST"],
    ["/api/internal/commercial-sandbox/webhooks/paddle", "POST"], ["/api/internal/commercial-sandbox/webhooks/mercadopago", "POST"],
    ["/api/contact-flow/webhooks/resend", "POST"], ["/api/client-portal/commercial-preferences", "POST"],
    ["/api/cron/puragenda-next", "GET"],
  ]) {
    if (path.startsWith("/api/dashboard/")) {
      const unauthorized = await fetch(origin + path, { method, headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}" });
      assert.equal(unauthorized.status, 401); results.push({ path, method, status: 401, check: "proxy authentication" });
    }
    // A malformed cookie gets past the proxy's presence check. The actual
    // endpoint must still be sealed before parsing/authentication/DB effects.
    const r = await fetch(origin + path, { method, headers: { Origin: origin, "Content-Type": "application/json", Cookie: "puragenda_session=invalid-signature-fixture" }, ...(method === "POST" ? { body: "{}" } : {}) });
    assert.equal(r.status, 404, `${method} ${path}`); results.push({ path, method, status: r.status });
  }
  const report = { productionRuntime: true, commercialFlagsIntentionallySet: true, providerCredentialsPresent: false, sealed: true, results };
  writeFileSync("docs/puragenda-next/evidence/iteration-8-production-seal.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} finally {
  child.kill(); await new Promise(r => child.once("exit", r)); log.end();
}
