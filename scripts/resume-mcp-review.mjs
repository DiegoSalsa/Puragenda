import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";
import bcrypt from "bcrypt";

// Resume an existing fictitious review database. Never seed, migrate or drop it.
const root = new URL("../", import.meta.url);
const stateFile = new URL("../artifacts/mcp/review-runtime.json", import.meta.url);
const accessFile = new URL("../artifacts/mcp/iteration-2/review-access.json", import.meta.url);
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (["--check", "--build"].includes(arg)) options[arg.slice(2)] = true;
  else if (["--schema", "--origin"].includes(arg) && args[i + 1] && !args[i + 1].startsWith("--")) options[arg.slice(2)] = args[++i];
  else throw new Error("Use --schema NAME --origin HTTPS_ORIGIN [--build] [--check]");
}
let state;
try { state = JSON.parse(await fs.readFile(stateFile, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw new Error("Invalid private review runtime file"); }
const schema = options.schema || state?.schema;
if (!/^booking_api_test_\d+$/.test(schema || "")) throw new Error("Explicit isolated review schema required");
if (state && state.schema !== schema) throw new Error("Saved runtime belongs to another fixture; do not reuse its secrets");
const origin = new URL(options.origin || state?.origin || "http://invalid");
if (origin.protocol !== "https:" || !origin.hostname.endsWith(".trycloudflare.com") || origin.origin !== (options.origin || state?.origin)) throw new Error("Exact isolated Quick Tunnel HTTPS origin required");
const databaseUrl = new URL(process.env.PURAGENDA_BOOKING_TEST_DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/puragenda_booking_api_test");
if (!["127.0.0.1", "localhost", "[::1]"].includes(databaseUrl.hostname) || databaseUrl.pathname !== "/puragenda_booking_api_test") throw new Error("Only the named loopback test database is allowed");
databaseUrl.searchParams.set("schema", schema);
databaseUrl.searchParams.set("options", `-csearch_path=${schema},public`);
if ((await fs.readdir(root)).some((name) => /^\.env(?:$|\.)/.test(name) && name !== ".env.example")) throw new Error("Use the dedicated worktree without .env files");
const access = JSON.parse(await fs.readFile(accessFile, "utf8"));
const db = new pg.Client({ connectionString: databaseUrl.toString(), connectionTimeoutMillis: 5000 });
try {
  await db.connect();
  await db.query("BEGIN READ ONLY");
  const users = await db.query(`SELECT id, email, password FROM "${schema}"."User"`);
  if (users.rows.length !== 2 || users.rows.some((user) => !["preview-owner", "preview-employee"].includes(user.id) || !user.email.endsWith("@example.invalid"))) throw new Error("Database is not the dedicated fictitious review fixture");
  for (const [id, role] of [["preview-owner", "owner"], ["preview-employee", "specialist"]]) {
    const user = users.rows.find((row) => row.id === id);
    if (!user || user.email !== access[role].email || !await bcrypt.compare(access[role].password, user.password)) throw new Error("Saved review login does not match the fixture");
  }
  const businesses = await db.query(`SELECT id, "ownerId" FROM "${schema}"."Business"`);
  if (businesses.rows.length !== 2 || businesses.rows.some((business) => !["preview-business", "preview-private-business"].includes(business.id) || business.ownerId !== "preview-owner")) throw new Error("Unexpected businesses in review schema");
  const calendars = await db.query(`SELECT COUNT(*)::int AS count FROM "${schema}"."GoogleCalendarConnection"`);
  if (calendars.rows[0].count) throw new Error("Review fixture must not contain external calendar connections");
  await db.query("ROLLBACK");
} finally { await db.end(); }
if (options.check) {
  console.log(JSON.stringify({ status: "PASS", schema, origin: origin.origin, fictitiousUsers: 2, preservedData: true, wroteRuntimeOrDatabase: false }));
} else {
  if (!state) state = { schema, authSecret: randomBytes(32).toString("base64url"), operationEncryptionKey: randomBytes(32).toString("base64") };
  if (typeof state.authSecret !== "string" || state.authSecret.length < 32 || Buffer.from(state.operationEncryptionKey || "", "base64").length !== 32) throw new Error("Invalid saved review secrets");
  const previousOrigin = state.origin || access.origin;
  if (previousOrigin !== origin.origin && !options.build) throw new Error("Origin changed: --build is required before serving this fixture");
  state.origin = origin.origin;
  await fs.mkdir(new URL("./", stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
  // Retain the existing passwords; only update the temporary test URL.
  access.origin = origin.origin;
  await fs.writeFile(accessFile, JSON.stringify(access), { mode: 0o600 });
  const systemKeys = ["PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "APPDATA", "LOCALAPPDATA", "USERPROFILE", "HOME", "COMSPEC", "PROGRAMFILES", "PROGRAMFILES(X86)", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE"];
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => systemKeys.includes(key.toUpperCase())));
  Object.assign(env, { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", DATABASE_URL: databaseUrl.toString(), DIRECT_URL: databaseUrl.toString(),
    AUTH_SECRET: state.authSecret, RESEND_API_KEY: "", NEXT_PUBLIC_APP_URL: origin.origin, MCP_ORIGIN: origin.origin,
    MCP_OAUTH_ALLOW_LOOPBACK: "true", MCP_OPERATION_ENCRYPTION_KEY: state.operationEncryptionKey,
    MCP_PUBLIC_BOOKING_ENABLED: "true", LOCAL_PAYMENT_SIMULATOR: "true" });
  const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
  const run = (nextArgs) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin, ...nextArgs], { cwd: fileURLToPath(root), env, stdio: "inherit" });
    const stop = () => child.kill("SIGTERM");
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
    child.once("error", reject);
    child.once("exit", (code) => { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); resolve(code ?? 1); });
  });
  console.log(`Resuming existing fictitious review data at ${origin.origin}/mcp. Private runtime is ignored by Git; credentials were preserved.`);
  let code = options.build ? await run(["build"]) : 0;
  if (code === 0) code = await run(["start", "-H", "127.0.0.1", "-p", "3108"]);
  // Intentionally preserve the schema and private runtime across restarts.
  process.exitCode = code;
}
