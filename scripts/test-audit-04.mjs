// All audit checks run with synthetic secrets, no ambient env files and loopback I/O only.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { localCommercialDatabase } from "./commercial-migrations.mjs";
if (readdirSync(".").some(name => /^\.env(?:\.|$)/.test(name) && name !== ".env.example")) throw new Error("AUDIT_REQUIRES_NO_AMBIENT_ENV_FILES");
const database = localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const allowed = new Set(["PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "APPDATA", "LOCALAPPDATA", "USERPROFILE", "USERNAME", "USERDOMAIN", "COMSPEC", "PATHEXT", "PROGRAMFILES", "PROGRAMFILES(X86)"]);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())));
Object.assign(env, { NODE_ENV: "test", DATABASE_URL: database, DIRECT_URL: database, COMMERCIAL_V2_TEST_DATABASE_URL: database,
  AUTH_SECRET: randomBytes(32).toString("hex"), NEXTAUTH_SECRET: randomBytes(32).toString("hex"), NEXT_TELEMETRY_DISABLED: "1", RESEND_API_KEY: "",
  CONTACT_FLOW_PRODUCTION_ENABLED: "0", CONTACT_FLOW_EXTERNAL_RELEASE: "false", NEXT_STAGING_NETWORK_GUARD: "1",
  NODE_OPTIONS: `--import=${pathToFileURL(path.resolve("scripts/next-staging-network-guard.mjs")).href}` });
mkdirSync("scratch/audit04", { recursive: true });
const mode = process.argv[2] || "postgres";
if (mode === "general") delete env.COMMERCIAL_V2_TEST_DATABASE_URL;
const commands = {
  general: ["node_modules/vitest/vitest.mjs", "run", "--reporter=dot", "--reporter=json", "--outputFile.json=scratch/audit04/general.json"],
  postgres: ["scripts/test-commercial-postgres.mjs", "--clients-privacy"],
  commercial: ["scripts/test-commercial-postgres.mjs"],
  booking: ["scripts/test-rc1-booking-postgres.mjs"],
  mcp: ["scripts/test-rc1-booking-postgres.mjs", "--mcp"],
  legacy: ["scripts/test-rc1-legacy-postgres.mjs"],
  migrations: ["scripts/test-audit-04-migrations.mjs"],
  tests: ["node_modules/vitest/vitest.mjs", "run", ...process.argv.slice(3)],
};
if (!commands[mode]) throw new Error("UNKNOWN_AUDIT_CHECK");
const result = spawnSync(process.execPath, commands[mode], { env, stdio: "inherit", windowsHide: true });
process.exitCode = result.status ?? 1;
