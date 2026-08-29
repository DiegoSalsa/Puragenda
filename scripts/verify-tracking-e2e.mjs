import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";

const baseUrl = process.argv[2];
if (!baseUrl?.startsWith("https://")) throw new Error("Pass an HTTPS deployment URL");
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required");

const visitorId = randomUUID();
const sessionId = randomUUID();
const client = new pg.Client({ connectionString });
await client.connect();

try {
  function vercelPost(path, payload) {
    const result = spawnSync("npx", [
      "vercel", "curl", path, "--deployment", baseUrl, "--yes", "--",
      "--silent", "--show-error", "--fail-with-body", "--request", "POST",
      "--header", "content-type: application/json", "--header", `origin: ${baseUrl}`,
      "--data-binary", "@-",
    ], { encoding: "utf8", input: JSON.stringify(payload), shell: process.platform === "win32" });
    if (result.status !== 0) throw new Error(`${path} failed: ${result.error?.message || result.stderr || result.stdout}`);
    return result.stdout.trim();
  }

  const consentResult = vercelPost("/api/analytics/consent", { decision: "accepted", policyVersion: "2026-08-29", visitorId, sessionId });
  const trackResult = vercelPost("/api/analytics/track", {
      event: "page_view", visitorId, sessionId,
      path: "/cita/super-secret-e2e-token", consentVersion: "2026-08-29",
      properties: { page_type: "marketing", customerEmail: "must-not-be-stored@example.com" },
  });
  if (!consentResult.includes('"ok":true') || !trackResult.includes('"ok":true')) {
    throw new Error(`Unexpected deployed responses: consent=${consentResult} track=${trackResult}`);
  }

  const result = await client.query(
    'SELECT "path", "properties", "consentGrantedAt" FROM "TrackingEvent" WHERE "visitorId" = $1',
    [visitorId],
  );
  const event = result.rows[0];
  if (result.rows.length !== 1 || event.path !== "/cita/[appointment]" || event.properties.customerEmail || !event.consentGrantedAt) {
    throw new Error(`Deployed tracking did not preserve the privacy invariants (rows=${result.rows.length}, pathSafe=${event?.path === "/cita/[appointment]"}, propertiesSafe=${!event?.properties?.customerEmail}, consentLinked=${Boolean(event?.consentGrantedAt)})`);
  }
  console.log("E2E tracking privacy verification passed.");
} finally {
  await client.query('DELETE FROM "TrackingEvent" WHERE "visitorId" = $1', [visitorId]);
  await client.query('DELETE FROM "TrackingConsent" WHERE "visitorId" = $1', [visitorId]);
  await client.end();
}
