import pg from "pg";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

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
  RESEND_API_KEY: "", AUTH_SECRET: "local-booking-test-only", NEXT_PUBLIC_APP_URL: "http://localhost:3107", LOCAL_PAYMENT_SIMULATOR: "true" };
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
    if (process.argv.includes("--preview") || process.argv.includes("--build")) {
      const { PrismaClient } = await import("@prisma/client");
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const previewDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema }) });
      await previewDb.business.create({ data: { id: "preview-business", slug: "booking-api-fixture", name: "Booking API Fixture", apiKey: "local-public-fixture-key", allowSameDayBookings: true, slotInterval: 30,
        subscription: { create: { plan: "EQUIPO", status: "ACTIVE" } },
        locations: { create: { id: "preview-location", name: "Local de pruebas", slug: "principal", timezone: "America/Santiago", isPrimary: true, isActive: true,
          hours: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" })) } } },
        services: { create: { id: "preview-service", name: "Servicio de prueba", price: 20000, duration: 60,
          optionCategories: { create: { name: "Formato", isRequired: true, alternatives: { create: [{ id: "preview-option-local", name: "En local" }, { id: "preview-option-home", name: "A domicilio", durationDelta: 30, priceDelta: 5000, isHomeService: true }] } } },
        } },
      } });
      await previewDb.locationService.create({ data: { locationId: "preview-location", serviceId: "preview-service" } });
      await previewDb.staff.create({ data: { id: "preview-staff", name: "Profesional de prueba", businessId: "preview-business", services: { connect: { id: "preview-service" } }, locations: { create: { locationId: "preview-location" } } } });
      await previewDb.$disconnect();
      const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
      if (process.argv.includes("--build")) code = await run([nextBin, "build"]);
      else {
        console.log("Preview local: http://localhost:3107/widget/booking-api-fixture (sin reservas reales)");
        code = await run([nextBin, "dev", "-H", "127.0.0.1", "-p", "3107"]);
      }
    } else {
      code = await run([vitestBin, "run", "tests/server/booking-api.integration.test.ts", "tests/server/booking-read.test.ts", "tests/core/booking-selection.test.ts", "tests/core/booking-availability.test.ts"]);
    }
  }
} finally {
  // Absolute scope was checked above; only our generated schema is removed.
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
}
process.exitCode = code;
