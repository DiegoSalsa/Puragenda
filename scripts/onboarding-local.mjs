import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { deployCommercialMigrations } from "./commercial-migrations.mjs";

const root = resolve(import.meta.dirname, "..");
const database = "puragenda_commercial_test_onboarding";
const db = new URL(process.env.ONBOARDING_LOCAL_DATABASE_URL || `postgresql://postgres@127.0.0.1:5432/${database}`);
if (!["127.0.0.1", "localhost"].includes(db.hostname) || db.pathname !== `/${database}` || process.env.NODE_ENV === "production") throw new Error("ONBOARDING_LOCAL_DATABASE_REQUIRED");
const port = Number(process.env.ONBOARDING_LOCAL_PORT || 3116);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("INVALID_LOCAL_PORT");
mkdirSync(resolve(root, "scratch/onboarding"), { recursive: true });
const secretFile = resolve(root, "scratch/onboarding/session-secret");
if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(48).toString("base64url"));
const env = { ...process.env, DATABASE_URL: db.href, DIRECT_URL: db.href, ONBOARDING_TEST_DATABASE_URL: db.href,
  AUTH_SECRET: readFileSync(secretFile, "utf8"), NEXTAUTH_SECRET: readFileSync(secretFile, "utf8"),
  NEXT_PUBLIC_APP_URL: `http://localhost:${port}`, WHITELISTED_IPS: "127.0.0.1", RESEND_API_KEY: "", OPENAI_API_KEY: process.argv.includes("--ai") ? (process.env.OPENAI_API_KEY || "") : "", MCP_ENABLED: "false",
  LOCAL_PAYMENT_SIMULATOR: "false", CONTACT_FLOW_LAB_ENABLED: "", PURI_PLUS_INTERNAL_ENABLED: "",
  PADDLE_API_KEY: "", PADDLE_WEBHOOK_SECRET: "", MERCADOPAGO_ACCESS_TOKEN: "", GOOGLE_CLIENT_SECRET: "",
};
const run = args => { const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: "inherit", windowsHide: true }); if (result.status !== 0) process.exit(result.status ?? 1); };
if (!process.argv.includes("--serve")) {
  const adminUrl = new URL(db); adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.href });
  await admin.connect();
  if (!(await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [database])).rowCount) await admin.query(`CREATE DATABASE ${database}`);
  await admin.end();
  await deployCommercialMigrations(db.href);
  run(["--import", "tsx", "scripts/onboarding-seed.ts", ...(process.argv.includes("--reset") ? ["--reset"] : []), ...(process.argv.includes("--iteration2") ? ["--iteration2"] : [])]);
}
if (process.argv.includes("--test")) {
  run(["node_modules/vitest/vitest.mjs", "run", "tests/integration/onboarding-postgres.integration.test.ts", "--reporter=dot"]);
} else if (!process.argv.includes("--prepare")) {
  console.log(`Puri Setup local: http://localhost:${port}/login (loopback only)`);
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-H", "127.0.0.1", "-p", String(port)], { cwd: root, env, stdio: "inherit", windowsHide: true });
  process.on("SIGTERM", () => child.kill()); process.on("SIGINT", () => child.kill());
  child.on("exit", code => process.exit(code ?? 1));
}
