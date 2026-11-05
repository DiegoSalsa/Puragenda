import {randomBytes} from "node:crypto";
import {spawnSync,execFileSync} from "node:child_process";
import {writeFileSync,mkdirSync,realpathSync} from "node:fs";
import {pathToFileURL} from "node:url";
import path from "node:path";
import net from "node:net";
import pg from "pg";
import {localCommercialDatabase,deployCommercialMigrations} from "./commercial-migrations.mjs";

// Reproduce the original simulator environment instead of relaxing its guards.
// Both clusters bind loopback. No production env file or credentials are loaded.
const base=new URL(localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL));
const suffix=randomBytes(6).toString("hex"),root=path.resolve("scratch/rc1-20261029");
mkdirSync(root,{recursive:true});
const binary=process.env.PG_BIN_DIR??(process.platform==="win32"?"C:/Program Files/PostgreSQL/17/bin":"/usr/lib/postgresql/17/bin");
const executable=name=>path.join(binary,name+(process.platform==="win32"?".exe":""));
const data=path.resolve(root,"website-pg-"+suffix),log=path.join(root,"website-pg-"+suffix+".log");
if(!data.startsWith(root+path.sep))throw Error("OWNED_QA_DATA_DIRECTORY_REQUIRED");
const probe=net.createServer();
await new Promise((resolve,reject)=>{probe.once("error",reject);probe.listen(55439,"127.0.0.1",()=>probe.close(resolve));});
mkdirSync(data,{recursive:true});
if(process.platform==="win32")execFileSync("icacls",[data,"/inheritance:r","/grant:r",`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`,"SYSTEM:(OI)(CI)F"],{stdio:"ignore",windowsHide:true});
execFileSync(executable("initdb"),["-D",data,"-U","websiteqa","-A","trust","--encoding=UTF8","--no-locale"],{stdio:"ignore",windowsHide:true});
execFileSync(executable("pg_ctl"),["-D",data,"-o","-h 127.0.0.1 -p 55439","-l",log,"start"],{stdio:"ignore",windowsHide:true});
let websiteClusterOwned=false,status=1;
try{
 const websiteAdmin=new pg.Client({connectionString:"postgresql://websiteqa@127.0.0.1:55439/postgres"});await websiteAdmin.connect();
 try{
  const actual=(await websiteAdmin.query("SHOW data_directory")).rows[0].data_directory;
  if(realpathSync(actual).toLowerCase()!==realpathSync(data).toLowerCase())throw Error("WEBSITE_CLUSTER_OWNERSHIP_MISMATCH");
  websiteClusterOwned=true;
  await websiteAdmin.query('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN');
  await websiteAdmin.query(`CREATE DATABASE "puragenda_commercial_test_website${suffix}"`);
 }finally{await websiteAdmin.end();}
 const websiteTemplate=`postgresql://websiteqa@127.0.0.1:55439/puragenda_commercial_test_website${suffix}`;
 await deployCommercialMigrations(websiteTemplate);
 const wa=new pg.Client({connectionString:"postgresql://websiteqa@127.0.0.1:55439/postgres"});await wa.connect();
 try{await wa.query(`CREATE DATABASE websiteqa TEMPLATE "puragenda_commercial_test_website${suffix}"`);}finally{await wa.end();}
 const adminUrl=new URL(base);adminUrl.pathname="/postgres";
 const name="puragenda_commercial_test_rc1legacy"+suffix,legacyName="cinnamon_qa_rc1"+suffix;
 const admin=new pg.Client({connectionString:adminUrl.href});await admin.connect();
 try{await admin.query(`CREATE DATABASE "${name}"`);}finally{await admin.end();}
 base.pathname="/"+name;await deployCommercialMigrations(base.href);
 const ca=new pg.Client({connectionString:adminUrl.href});await ca.connect();
 try{await ca.query(`CREATE DATABASE "${legacyName}" TEMPLATE "${name}"`);}finally{await ca.end();}
 const commercialUrl=new URL(base);commercialUrl.pathname="/"+legacyName;
 const allowed=new Set(["PATH","SYSTEMROOT","WINDIR","TEMP","TMP","APPDATA","LOCALAPPDATA","USERPROFILE","COMSPEC","PATHEXT","PROGRAMFILES","PROGRAMFILES(X86)"]);
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.has(key.toUpperCase())));
 Object.assign(env,{NODE_ENV:"test",DATABASE_URL:commercialUrl.href,DIRECT_URL:commercialUrl.href,TEST_DATABASE_URL:commercialUrl.href,COMMERCIAL_SUBSCRIPTION_TEST_DATABASE_URL:commercialUrl.href,WEBSITE_BILLING_TEST_DATABASE_URL:"postgresql://websiteqa@127.0.0.1:55439/websiteqa",WEBSITE_PUBLIC_TEST_DATABASE_URL:"postgresql://websiteqa@127.0.0.1:55439/websiteqa",AUTH_SECRET:randomBytes(32).toString("hex"),RESEND_API_KEY:"",PURAGENDA_NEXT_ENABLED:"0",CONTACT_FLOW_PRODUCTION_ENABLED:"0",CONTACT_FLOW_EXTERNAL_RELEASE:"false",COMMERCIAL_WORKER_ENABLED:"0",PURAGENDA_MP_V2_ENABLED:"0",NEXT_STAGING_NETWORK_GUARD:"1",NEXT_TELEMETRY_DISABLED:"1",NODE_OPTIONS:`--import=${pathToFileURL(path.resolve("scripts/next-staging-network-guard.mjs")).href}`});
 const files=["tests/integration/deposit-payment-postgres.integration.test.ts","tests/server/commercial-subscription.integration.test.ts","tests/server/website-mercadopago.integration.test.ts","tests/server/website-purchase-intent.integration.test.ts"];
 const result=spawnSync(process.execPath,["node_modules/vitest/vitest.mjs","run",...files,"--no-file-parallelism","--reporter=dot","--reporter=json","--outputFile.json=scratch/rc1-20261029/legacy-results.json"],{env,stdio:"inherit",windowsHide:true});
 status=result.status??1;
 writeFileSync(path.join(root,"legacy-run.json"),JSON.stringify({commercialDatabase:legacyName,websiteCluster:data,localOnly:true,externalNetworkBlocked:true,providerCredentialsPresent:false,files,status},null,2));
}finally{
 if(websiteClusterOwned)execFileSync(executable("pg_ctl"),["-D",data,"stop","-m","fast"],{stdio:"ignore",windowsHide:true});
 // Preserve the disposable data directory and logs for failure diagnosis.
}
process.exitCode=status;
