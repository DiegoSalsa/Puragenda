import pg from "pg";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const mcpPreview = process.argv.includes("--mcp-preview");
const reviewOrigin = process.env.PURAGENDA_MCP_REVIEW_ORIGIN || "http://localhost:3108";
if (mcpPreview && reviewOrigin !== "http://localhost:3108") {
  const parsed = new URL(reviewOrigin);
  if (parsed.protocol !== "https:" || parsed.origin !== reviewOrigin || parsed.username || parsed.password) throw new Error("Review origin must be an exact HTTPS origin");
}
const reviewPasswords = mcpPreview ? { owner: randomBytes(24).toString("base64url"), specialist: randomBytes(24).toString("base64url") } : null;

// No .env loading: an accidental production connection is rejected before SQL.
const url = new URL(process.env.PURAGENDA_BOOKING_TEST_DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/puragenda_booking_api_test");
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^\/puragenda_booking_api_test$/.test(url.pathname)) {
  throw new Error("Booking tests require loopback host and database puragenda_booking_api_test");
}
const adminUrl = new URL(url); adminUrl.pathname = "/postgres";
const admin = new pg.Client({ connectionString: adminUrl.toString() });
await admin.connect();
const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'puragenda_booking_api_test'");
if (!exists.rowCount) await admin.query('CREATE DATABASE "puragenda_booking_api_test"');
await admin.end();
const schema = `booking_api_test_${Date.now()}`;
url.searchParams.set("schema", schema);
// Existing raw SQL helpers use the connection search_path; Prisma's schema
// option qualifies ORM queries only. Keep both pointed at our isolated fixture.
url.searchParams.set("options", `-csearch_path=${schema},public`);
const env = { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), PURAGENDA_BOOKING_TEST_DATABASE_URL: url.toString(),
  ...(process.argv.includes("--all") ? { TEST_DATABASE_URL: url.toString() } : {}),
  RESEND_API_KEY: "", AUTH_SECRET: mcpPreview ? randomBytes(32).toString("base64url") : "local-booking-test-only-at-least-32-characters",
  NEXT_PUBLIC_APP_URL: mcpPreview ? reviewOrigin : process.argv.includes("--all") ? "http://localhost:3000" : "http://localhost:3107",
  MCP_ENABLED: mcpPreview || process.argv.includes("--mcp") ? "true" : "false",
  ...(mcpPreview ? { MCP_ORIGIN: reviewOrigin, MCP_OAUTH_ALLOW_LOOPBACK: "true", MCP_OPERATION_ENCRYPTION_KEY: randomBytes(32).toString("base64"), MCP_PUBLIC_BOOKING_ENABLED: "true" } : {}),
  PURAGENDA_MCP_TEST: process.argv.includes("--mcp") ? "1" : "",
  LOCAL_PAYMENT_SIMULATOR: mcpPreview || process.argv.includes("--preview") || process.argv.includes("--build") ? "true" : "" };
function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: "inherit", env });
    const stop = () => child.kill("SIGTERM");
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
    child.on("exit", (code) => {
      process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
      resolve(code ?? 1);
    });
  });
}
const prismaBin = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
const vitestBin = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
let code = await run([prismaBin, "db", "push"]);
const client = new pg.Client({ connectionString: url.toString() });
try {
  await client.connect();
  await client.query(`SET search_path TO "${schema}", public`);
  if (code === 0) {
    // This table was created by db push in our fresh schema only. Recreate it
    // with the exact migration, including FKs and the database concurrency guard.
    await client.query('DROP TABLE "BookingOperation"');
    await client.query(fs.readFileSync(new URL("../prisma/migrations/20260930120000_public_booking_operations/migration.sql", import.meta.url), "utf8"));
    await client.query(fs.readFileSync(new URL("../prisma/migrations/20261001121000_booking_operation_fk_update/migration.sql", import.meta.url), "utf8"));
    if (process.argv.includes("--mcp") || mcpPreview) {
      // Recreate connector tables from the versioned migration, so tests cover
      // real FKs, indexes, grants and RLS rather than db push alone.
      await client.query('DROP TABLE "McpOperation", "McpOAuthToken", "McpOAuthCode", "McpConnection", "McpProfile", "McpOAuthRequest", "McpOAuthClient" CASCADE');
      await client.query('ALTER TABLE "Business" DROP COLUMN "mcpPublicDiscovery"');
      const folder = fs.readdirSync(new URL("../prisma/migrations/", import.meta.url)).find((name) => name.endsWith("_mcp_oauth_connector"));
      if (!folder) throw new Error("MCP migration missing");
      await client.query(fs.readFileSync(new URL(`../prisma/migrations/${folder}/migration.sql`, import.meta.url), "utf8"));
    }
    if (mcpPreview || process.argv.includes("--preview") || process.argv.includes("--build")) {
      const { PrismaClient } = await import("@prisma/client");
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const previewDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema }) });
      if (mcpPreview) {
        const bcrypt = (await import("bcrypt")).default;
        await previewDb.user.create({ data: { id: "preview-owner", email: "review@example.invalid", name: "Revisión MCP", password: await bcrypt.hash(reviewPasswords.owner, 10) } });
      }
      await previewDb.business.create({ data: { id: "preview-business", slug: "booking-api-fixture", name: "Booking API Fixture", apiKey: "local-public-fixture-key", allowSameDayBookings: true, slotInterval: 30,
        ...(mcpPreview ? { ownerId: "preview-owner", mcpPublicDiscovery: true } : {}),
        subscription: { create: { plan: "EQUIPO", status: "ACTIVE" } },
        locations: { create: { id: "preview-location", name: "Local de pruebas", slug: "principal", timezone: "America/Santiago", isPrimary: true, isActive: true,
          hours: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" })) } } },
        services: { create: { id: "preview-service", name: "Servicio de prueba", price: 20000, duration: 60,
          optionCategories: { create: { name: "Formato", isRequired: true, alternatives: { create: [{ id: "preview-option-local", name: "En local" }, { id: "preview-option-home", name: "A domicilio", durationDelta: 30, priceDelta: 5000, isHomeService: true }] } } },
        } },
      } });
      await previewDb.locationService.create({ data: { locationId: "preview-location", serviceId: "preview-service" } });
      await previewDb.staff.create({ data: { id: "preview-staff", name: "Profesional de prueba", businessId: "preview-business", services: { connect: { id: "preview-service" } }, locations: { create: { locationId: "preview-location" } } } });
      if (mcpPreview) {
        await previewDb.service.create({ data: { id: "preview-free-service", businessId: "preview-business", name: "Orientación gratuita", duration: 30, price: 0, locations: { create: { locationId: "preview-location" } }, staff: { connect: { id: "preview-staff" } } } });
        await previewDb.business.create({ data: { id: "preview-private-business", slug: "mcp-private-fixture", name: "Negocio privado de revisión", ownerId: "preview-owner", apiKey: "local-private-fixture-key", subscription: { create: { plan: "EQUIPO", status: "ACTIVE" } }, locations: { create: { name: "Sucursal privada", slug: "principal", timezone: "America/Santiago", isPrimary: true, isActive: true } } } });
        const bcrypt = (await import("bcrypt")).default;
        const { enrichMcpReviewFixture } = await import("./mcp-review-fixture.mjs");
        const fixture = await enrichMcpReviewFixture(previewDb, await bcrypt.hash(reviewPasswords.specialist, 10));
        const directory = new URL("../artifacts/mcp/iteration-2/", import.meta.url);
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(new URL("review-access.json", directory), JSON.stringify({ origin: reviewOrigin, owner: { email: "review@example.invalid", password: reviewPasswords.owner }, specialist: { email: "specialist.review@example.invalid", password: reviewPasswords.specialist } }), { mode: 0o600 });
        fs.writeFileSync(new URL("fixture.json", directory), JSON.stringify(fixture, null, 2));
        console.log(`Isolated review endpoint: ${reviewOrigin}/mcp. Random access credentials are in the local ignored artifacts/mcp/iteration-2/review-access.json; never copy this file to Git or logs.`);
      }
      await previewDb.$disconnect();
      const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
      if (process.argv.includes("--build")) code = await run([nextBin, "build"]);
      else {
        const port = mcpPreview ? "3108" : "3107";
        console.log(`Preview local: http://localhost:${port}/widget/booking-api-fixture (sin reservas reales)`);
        if (mcpPreview && process.argv.includes("--production")) {
          if (!reviewOrigin.startsWith("https:")) throw new Error("Production-mode MCP review requires an HTTPS review origin");
          code = await run([nextBin, "build"]);
          if (code === 0) code = await run([nextBin, "start", "-H", "127.0.0.1", "-p", port]);
        } else code = await run([nextBin, "dev", "-H", "127.0.0.1", "-p", port]);
      }
    } else {
      const files = process.argv.includes("--mcp") ? ["tests/server/mcp.security.test.ts", "tests/server/mcp.rollout.test.ts", "tests/server/mcp.postgres.integration.test.ts"] : process.argv.includes("--all") ? [] : ["tests/server/booking-api.integration.test.ts", "tests/server/booking-read.test.ts", "tests/core/booking-selection.test.ts", "tests/core/booking-availability.test.ts"];
      code = await run([vitestBin, "run", ...files]);
    }
  }
} finally {
  // Absolute scope was checked above; only our generated schema is removed.
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
}
process.exitCode = code;
