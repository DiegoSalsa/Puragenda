import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";

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
const result={prepared:true,target,config,baseline,cutover:manifest.cutoverMigration,schemaSha256:sha("prisma/schema.prisma"),migrations:files,sqlExecuted:false,remoteResourcesCreated:false,credentialsCopied:false};
fs.writeFileSync(path.join(target,"bundle-manifest.json"),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
