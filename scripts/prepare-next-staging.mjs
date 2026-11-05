import fs from "node:fs";
import path from "node:path";
import { randomBytes,createHash } from "node:crypto";
import { execFileSync,spawnSync } from "node:child_process";
import pg from "pg";
import { deployCommercialMigrations,localCommercialDatabase } from "./commercial-migrations.mjs";
const root=process.cwd(),profile=JSON.parse(fs.readFileSync("config/release/puragenda-next.json","utf8"));
if(!process.argv.includes("--prepare-local")){console.log(JSON.stringify({profile,action:"Use --prepare-local with COMMERCIAL_V2_TEST_DATABASE_URL to create only a disposable loopback database and local files"},null,2));process.exit(0);}
const base=new URL(localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL));
const id=randomBytes(6).toString("hex"),name=`puragenda_commercial_test_rc${id}`;
const parent=path.resolve(root,"scratch/next-staging"),target=path.join(parent,id);
if(!target.startsWith(parent+path.sep))throw Error("STAGING_PATH_REQUIRED");
fs.mkdirSync(target,{recursive:true,mode:0o700});
if(process.platform==="win32")execFileSync("icacls",[target,"/inheritance:r","/grant:r",`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`,"SYSTEM:(OI)(CI)F"],{stdio:"ignore",windowsHide:true});
const adminUrl=new URL(base);adminUrl.pathname="/postgres";
const admin=new pg.Client({connectionString:adminUrl.href});await admin.connect();try{await admin.query(`CREATE DATABASE "${name}"`);}finally{await admin.end();}
base.pathname="/"+name;await deployCommercialMigrations(base.href);
const git=args=>execFileSync("git",args,{encoding:"utf8",windowsHide:true}).split("\0").filter(Boolean);
const files=[...new Set([...git(["ls-files","-z"]),...git(["ls-files","--others","--exclude-standard","-z"])])];
for(const file of files){
 if(file.split(/[\\/]/).some(p=>p.startsWith(".env")&&p!==".env.example")||!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
 const dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);
}
fs.symlinkSync(path.join(root,"node_modules"),path.join(target,"node_modules"),process.platform==="win32"?"junction":"dir");
const policy=JSON.parse(fs.readFileSync("config/commercial/contact-flow-free.json","utf8"));
for(const phase of["trial","paid"])policy[phase].PURAGENDA_PLUS.contactFlow.senderEmail="sender@example.invalid";
policy.global.contactFlow.senderEmail="sender@example.invalid";
const env={NODE_ENV:"development",VERCEL_ENV:"preview",DATABASE_URL:base.href,DIRECT_URL:base.href,COMMERCIAL_V2_TEST_DATABASE_URL:base.href,
 COMMERCIAL_V2_INTERNAL_WRITES:"1",COMMERCIAL_V2_PREVIEW_ENABLED:"1",COMMERCIAL_V2_PREVIEW_DATABASE_SHA256:createHash("sha256").update(base.href).digest("hex"),
 PURAGENDA_NEXT_ENABLED:"1",APP_URL:profile.staging.localHttpOrigin,NEXT_PUBLIC_APP_URL:profile.staging.localHttpOrigin,NEXT_TELEMETRY_DISABLED:"1",
 AUTH_SECRET:randomBytes(32).toString("hex"),CONTACT_FLOW_TOKEN_SECRET:randomBytes(32).toString("hex"),CONTACT_FLOW_LAB_ENABLED:"1",CONTACT_FLOW_PUBLIC_CONSENT_ENABLED:"1",CONTACT_FLOW_PUBLIC_ORIGIN:profile.staging.localHttpOrigin,
 CONTACT_FLOW_DELIVERY_MODE:"simulation",CONTACT_FLOW_RESEND_TEST_ENABLED:"0",CONTACT_FLOW_PRODUCTION_ENABLED:"0",CONTACT_FLOW_EXTERNAL_RELEASE:"false",CONTACT_FLOW_PROVIDER_CAPACITY_MODE:"shared_free",CONTACT_FLOW_PRODUCTION_REPLY_TO:profile.contactFlow.replyTo,CONTACT_FLOW_PRODUCTION_FROM:profile.contactFlow.sender,
 COMMERCIAL_WORKER_ENABLED:"1",COMMERCIAL_WORKER_KILLED:"0",COMMERCIAL_WORKER_BUDGET_MS:"20000",COMMERCIAL_WORKER_SECRET:randomBytes(32).toString("hex"),CRON_SECRET:randomBytes(32).toString("hex"),
 COMMERCIAL_USAGE_POLICY_JSON:JSON.stringify(policy),PURI_PLUS_INTERNAL_ENABLED:"1",PURI_PLUS_AI_ENABLED:"0",PURI_PLUS_PROACTIVE_ENABLED:"0",
 PURAGENDA_MP_V2_ENABLED:"0",PURAGENDA_MP_V2_ENVIRONMENT:"sandbox",PURAGENDA_MP_V2_PRODUCTION_WRITES:"0",PURAGENDA_MP_V2_RECOVERY_ENABLED:"0",PURAGENDA_MP_V2_PRODUCTION_RECOVERY_ENABLED:"0",
 COMMERCIAL_V2_SANDBOX_WRITES:"0",COMMERCIAL_V2_SANDBOX_WEBHOOKS:"0",COMMERCIAL_V2_WEBSITE_GATES:"1",
 WEBSITE_QA:"1",WEBSITE_ROOT_DOMAIN:"localhost",WEBSITE_MEDIA_MOCK:"1",WEBSITE_DOMAIN_PROVIDER:"mock",WEBSITE_VERCEL_WRITES_ENABLED:"0",WEBSITE_CHECKOUT_ENABLED:"0",WEBSITE_LAUNCH_ENABLED:"0",
 MCP_ENABLED:"false",MCP_PUBLIC_BOOKING_ENABLED:"false",NEXT_STAGING_NETWORK_GUARD:"1",NEXT_PUBLIC_GA_ID:"",RESEND_API_KEY:"",GOOGLE_CLIENT_ID:"",GOOGLE_CLIENT_SECRET:"",MERCADOPAGO_ACCESS_TOKEN:""};
fs.writeFileSync(path.join(target,".env.local"),Object.entries(env).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join("\n")+"\n",{mode:0o600});
fs.writeFileSync(path.join(target,"staging-runtime.private.json"),JSON.stringify(env),{mode:0o600});
const allowed=new Set(["PATH","SYSTEMROOT","WINDIR","TEMP","TMP","APPDATA","LOCALAPPDATA","USERPROFILE","COMSPEC","PATHEXT","PROGRAMFILES","PROGRAMFILES(X86)","HTTP_PROXY","HTTPS_PROXY","NO_PROXY","NODE_EXTRA_CA_CERTS"]);
const processEnv={...Object.fromEntries(Object.entries(process.env).filter(([k])=>allowed.has(k.toUpperCase()))),...env};
const seed=spawnSync(process.execPath,["--import","tsx","scripts/seed-next-staging.ts"],{cwd:target,env:processEnv,encoding:"utf8",windowsHide:true});
fs.writeFileSync(path.join(target,"seed.log"),seed.stdout+seed.stderr);if(seed.status!==0)throw Error("NEXT_STAGING_SEED_FAILED");
const openssl=process.env.NEXT_STAGING_OPENSSL??(process.platform==="win32"?"C:/Program Files/Git/usr/bin/openssl.exe":"openssl");
execFileSync(openssl,["req","-x509","-newkey","rsa:2048","-sha256","-days","14","-nodes","-keyout",path.join(target,"localhost.key"),"-out",path.join(target,"localhost.crt"),"-subj","/CN=localhost","-addext","subjectAltName=DNS:localhost,IP:127.0.0.1"],{stdio:"ignore",windowsHide:true});
fs.writeFileSync(path.join(parent,"current.json"),JSON.stringify({target,id,databaseName:name,httpOrigin:profile.staging.localHttpOrigin,httpsOrigin:profile.staging.localHttpsOrigin,remoteResourcesCreated:false},null,2));
console.log(JSON.stringify({prepared:true,target,databaseName:name,httpOrigin:profile.staging.localHttpOrigin,httpsOrigin:profile.staging.localHttpsOrigin,credentials:"Local protected files only",externalProviderIO:"Blocked",productionWrites:false,remoteResourcesCreated:false}));
