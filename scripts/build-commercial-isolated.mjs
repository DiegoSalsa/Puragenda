import { readdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { localCommercialDatabase } from "./commercial-migrations.mjs";
// Next loads .env files itself. Refuse ambient project secrets rather than
// assuming a sanitized child environment can override every future variable.
if (readdirSync(".").some(name => /^\.env(?:\.|$)/.test(name) && name !== ".env.example")) throw new Error("ISOLATED_BUILD_REQUIRES_NO_AMBIENT_ENV_FILES");
const databaseUrl = localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const allowed = new Set(["PATH","SYSTEMROOT","WINDIR","TEMP","TMP","APPDATA","LOCALAPPDATA","USERPROFILE","COMSPEC","PATHEXT","PROGRAMFILES","PROGRAMFILES(X86)","HTTP_PROXY","HTTPS_PROXY","NO_PROXY","NODE_EXTRA_CA_CERTS"]);
const env = Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.has(key.toUpperCase())));
Object.assign(env,{NODE_ENV:"production",DATABASE_URL:databaseUrl,DIRECT_URL:databaseUrl,NEXT_TELEMETRY_DISABLED:"1",
  AUTH_SECRET:randomBytes(32).toString("hex"),NEXTAUTH_SECRET:randomBytes(32).toString("hex"),
  APP_URL:"http://127.0.0.1:3000",NEXT_PUBLIC_APP_URL:"http://127.0.0.1:3000",NEXT_PUBLIC_PADDLE_ENV:"sandbox",
  WEBSITE_BUILD_QA:"1",WEBSITE_LAUNCH_ENABLED:"0",WEBSITE_CHECKOUT_ENABLED:"0",WEBSITE_VERCEL_WRITES_ENABLED:"0",
  COMMERCIAL_V2_INTERNAL_WRITES:"0",COMMERCIAL_V2_SANDBOX_WRITES:"0",COMMERCIAL_V2_SANDBOX_WEBHOOKS:"0",
  MCP_ENABLED:"0",MCP_PUBLIC_BOOKING_ENABLED:"0",MCP_REVIEW_SUPPRESS_EFFECTS:"1"});
console.log("Production compilation with isolated local database, no provider credentials, all commercial writers disabled.");
const result=spawnSync(process.execPath,["node_modules/next/dist/bin/next","build"],{env,stdio:"inherit",windowsHide:true});
process.exit(result.status??1);
