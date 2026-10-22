import { randomUUID, randomBytes } from "node:crypto";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import pg from "pg";
import {
  deployCommercialMigrations,
  localCommercialDatabase,
} from "./commercial-migrations.mjs";
if (
  readdirSync(".").some(
    (name) => /^\.env(?:\.|$)/.test(name) && name !== ".env.example",
  )
)
  throw new Error("LAB_REQUIRES_NO_AMBIENT_ENV_FILES");
const database = new URL(
  localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL),
);
const adminUrl = new URL(database);
adminUrl.pathname = "/postgres";
const admin = new pg.Pool({ connectionString: adminUrl.href }),
  name = `puragenda_commercial_test_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
} finally {
  await admin.end();
}
database.pathname = `/${name}`;
await deployCommercialMigrations(database.href);
const allowed = new Set([
  "PATH",
  "SYSTEMROOT",
  "WINDIR",
  "TEMP",
  "TMP",
  "APPDATA",
  "LOCALAPPDATA",
  "USERPROFILE",
  "COMSPEC",
  "PATHEXT",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "NODE_EXTRA_CA_CERTS",
  "PURI_QA_NODE_MODULES",
  "PURI_QA_CHROME",
]);
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())),
);
Object.assign(env, {
  NODE_ENV: "development",
  DATABASE_URL: database.href,
  DIRECT_URL: database.href,
  COMMERCIAL_V2_TEST_DATABASE_URL: database.href,
  COMMERCIAL_V2_INTERNAL_WRITES: "1",
  PURI_PLUS_INTERNAL_ENABLED: "1",
  PURI_PLUS_AI_ENABLED: "0",
  PURI_PLUS_PROACTIVE_ENABLED: "0",
  COMMERCIAL_V2_SANDBOX_WRITES: "0",
  COMMERCIAL_V2_SANDBOX_WEBHOOKS: "0",
  COMMERCIAL_V2_WEBSITE_GATES: "0",
  COMMERCIAL_V2_MIGRATION_WRITES: "0",
  WEBSITE_CHECKOUT_ENABLED: "0",
  WEBSITE_LAUNCH_ENABLED: "0",
  WEBSITE_VERCEL_WRITES_ENABLED: "0",
  WEBSITE_QA: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  AUTH_SECRET: randomBytes(32).toString("hex"),
  APP_URL: "http://127.0.0.1:3119",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3119",
  MCP_ENABLED: "0",
  MCP_PUBLIC_BOOKING_ENABLED: "0",
});
console.log(
  `Puri+ browser QA uses disposable database ${name}; provider credentials are absent.`,
);
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "scripts/puri-plus-browser-qa.ts"],
  { env, stdio: "inherit", windowsHide: true },
);
process.exit(result.status ?? 1);
