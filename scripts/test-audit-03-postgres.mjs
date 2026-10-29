// Executes only disposable loopback PostgreSQL with a clean, provider-free environment.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { localCommercialDatabase } from "./commercial-migrations.mjs";
const url = localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const allowed = new Set(["PATH","SYSTEMROOT","WINDIR","TEMP","TMP","APPDATA","LOCALAPPDATA","USERPROFILE","COMSPEC","PATHEXT","PROGRAMFILES","PROGRAMFILES(X86)","HTTP_PROXY","HTTPS_PROXY","NO_PROXY","NODE_EXTRA_CA_CERTS"]);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())));
Object.assign(env, { NODE_ENV: "test", COMMERCIAL_V2_TEST_DATABASE_URL: url, AUTH_SECRET: randomBytes(32).toString("hex"),
  RESEND_API_KEY: "", CONTACT_FLOW_PRODUCTION_ENABLED: "0", CONTACT_FLOW_EXTERNAL_RELEASE: "false", NEXT_TELEMETRY_DISABLED: "1",
  NEXT_STAGING_NETWORK_GUARD: "1", NODE_OPTIONS: `--import=${pathToFileURL(path.resolve("scripts/next-staging-network-guard.mjs")).href}` });
const result = spawnSync(process.execPath, ["scripts/test-commercial-postgres.mjs", "--services-staff"], { env, stdio: "inherit", windowsHide: true });
process.exitCode = result.status ?? 1;
