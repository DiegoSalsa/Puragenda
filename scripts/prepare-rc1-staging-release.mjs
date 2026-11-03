import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {deployCommercialMigrations} from "./commercial-migrations.mjs";

// Default: preparation only. The explicit --migrate mode reuses the certified
// runner, including its exact staging allowlist, TLS and optional-role checks.
if(process.argv.includes("--migrate")) {
 try { console.log(JSON.stringify(await deployCommercialMigrations(process.env.RC1_STAGING_DATABASE_URL,"bootstrap",{staging:true}))); }
 catch { console.error("STAGING_MIGRATION_FAILED: inspect the protected runner evidence; no credentials are printed"); process.exitCode=1; }
 process.exit(process.exitCode??0);
}

// Preparation only: no SQL, network, credentials, environment writes or deploy.
// Remote staging must use the same bootstrap/cutover tested locally, rather
// than replaying historical incremental migrations against an empty database.
const root=process.cwd(),parent=path.resolve("scratch");
fs.mkdirSync(parent,{recursive:true});
const target=fs.mkdtempSync(path.join(parent,"rc1-staging-release-"));
if(!target.startsWith(parent+path.sep))throw Error("LOCAL_RELEASE_DIRECTORY_REQUIRED");
if(process.platform==="win32")execFileSync("icacls",[target,"/inheritance:r","/grant:r",`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`,"SYSTEM:(OI)(CI)F"],{stdio:"ignore",windowsHide:true});
const manifest=JSON.parse(fs.readFileSync("prisma/bootstrap/manifest.json","utf8")),baseline="00000000000000_legacy";
const migrations=path.join(target,"migrations");fs.mkdirSync(migrations);
fs.cpSync(path.join(root,"prisma/bootstrap",baseline),path.join(migrations,baseline),{recursive:true});
for(const name of fs.readdirSync("prisma/migrations"))if(name>=manifest.cutoverMigration&&/^\d{14}_/.test(name)&&fs.statSync(path.join(root,"prisma/migrations",name)).isDirectory())fs.cpSync(path.join(root,"prisma/migrations",name),path.join(migrations,name),{recursive:true});
fs.writeFileSync(path.join(migrations,"migration_lock.toml"),'provider = "postgresql"\n');
const config=path.join(target,"prisma.config.ts");
fs.writeFileSync(config,`import {defineConfig} from "prisma/config";
import {createHash} from "node:crypto";
function stagingUrl(){
 if(process.env.RC1_STAGING_CONFIRM!=="puragenda-next-staging"||process.env.VERCEL_ENV==="production")throw Error("STAGING_MIGRATION_CONFIRMATION_REQUIRED");
 const raw=process.env.RC1_STAGING_DATABASE_URL;if(!raw)throw Error("STAGING_DATABASE_REQUIRED");
 const url=new URL(raw);if(!["postgres:","postgresql:"].includes(url.protocol))throw Error("STAGING_DATABASE_REQUIRED");
 const fingerprint=createHash("sha256").update(url.href).digest("hex");
 if(!/^[a-f0-9]{64}$/.test(process.env.RC1_STAGING_DATABASE_SHA256??"")||fingerprint!==process.env.RC1_STAGING_DATABASE_SHA256)throw Error("STAGING_DATABASE_FINGERPRINT_MISMATCH");
 return url.href;
}
export default defineConfig({schema:${JSON.stringify(path.join(root,"prisma/schema.prisma"))},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:stagingUrl()}});
`);
const sha=p=>createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const files=fs.readdirSync(migrations).filter(name=>name!=="migration_lock.toml").map(name=>({name,sha256:sha(path.join(migrations,name,"migration.sql"))}));
const result={prepared:true,target,config,baseline,cutover:manifest.cutoverMigration,schemaSha256:sha("prisma/schema.prisma"),migrations:files,migrationCommand:"node scripts/prepare-rc1-staging-release.mjs --migrate",rawBundleDeployApproved:false,sqlExecuted:false,remoteResourcesCreated:false,credentialsCopied:false};
if(process.argv.includes("--artifact")) {
 const git=args=>execFileSync("git",args,{encoding:"utf8",windowsHide:true});
 if(git(["status","--porcelain"]).trim())throw Error("STAGING_ARTIFACT_REQUIRES_CLEAN_COMMIT");
 const sourceSha=git(["rev-parse","HEAD"]).trim(),artifact=path.join(target,"artifact");fs.mkdirSync(artifact);
 const copied=[];
 for(const file of git(["ls-files","-z"]).split("\0").filter(Boolean)) {
  if(/^(?:scratch|node_modules|tests|marketing|\.git|\.vercel)\//.test(file)||(/^\.env/.test(file)&&file!==".env.example")||/\.(?:pem|key|log)$/.test(file))continue;
  const source=path.resolve(root,file);if(!source.startsWith(root+path.sep)||!fs.statSync(source).isFile())throw Error("UNSAFE_ARTIFACT_SOURCE");
  const dest=path.join(artifact,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);copied.push(file);
 }
 const stagingDir=path.join(artifact,".staging");fs.mkdirSync(stagingDir);
 fs.writeFileSync(path.join(stagingDir,"preview-build.mjs"),`if(process.env.VERCEL_ENV!=="preview"||process.env.VERCEL_PROJECT_ID!=="prj_ma5nkDSDzQGBCFMhroTTzsGi07YD"){console.error("ISOLATED_STAGING_PREVIEW_REQUIRED");process.exit(1);}\nawait import("../scripts/vercel-build.mjs");\n`);
 // Vercel may classify a new project's first upload as Production even when
 // the CLI requested Preview. Refuse it before installing or running Prisma.
 fs.writeFileSync(path.join(stagingDir,"preview-install.mjs"),`import {spawnSync} from "node:child_process";\nif(process.env.VERCEL_ENV!=="preview"||process.env.VERCEL_PROJECT_ID!=="prj_ma5nkDSDzQGBCFMhroTTzsGi07YD"){console.error("ISOLATED_STAGING_PREVIEW_REQUIRED");process.exit(1);}\nconst result=spawnSync("npm",["ci"],{stdio:"inherit",shell:process.platform==="win32"});process.exit(result.status??1);\n`);
 const vc=JSON.parse(fs.readFileSync(path.join(artifact,"vercel.json"),"utf8"));
 vc.git={...vc.git,deploymentEnabled:false};vc.crons=[];vc.buildCommand="node .staging/preview-build.mjs";vc.installCommand="node .staging/preview-install.mjs";
 vc.headers=[...(vc.headers??[]),{source:"/(.*)",headers:[{key:"X-Robots-Tag",value:"noindex, nofollow"}]}];
 fs.writeFileSync(path.join(artifact,"vercel.json"),JSON.stringify(vc,null,2)+"\n");
 const manifest={sourceSha,projectId:"prj_ma5nkDSDzQGBCFMhroTTzsGi07YD",environment:"preview",gitAutomatic:false,crons:0,providerSecretsIncluded:false,files:copied.map(file=>({file,sha256:sha(path.join(artifact,file))})),wrapperSha256:sha(path.join(stagingDir,"preview-build.mjs")),installWrapperSha256:sha(path.join(stagingDir,"preview-install.mjs"))};
 fs.writeFileSync(path.join(stagingDir,"manifest.json"),JSON.stringify(manifest,null,2));
 result.artifact={path:artifact,sourceSha,files:copied.length,manifestSha256:sha(path.join(stagingDir,"manifest.json"))};
}
fs.writeFileSync(path.join(target,"bundle-manifest.json"),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
