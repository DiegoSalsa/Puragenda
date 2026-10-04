import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import pg from "pg";
// Fresh disposable database in the isolated QA cluster; no project .env.
const root="postgresql://websiteqa@127.0.0.1:55439/";
const name=`website_public_migration_${Date.now()}`;
const directory=path.resolve("scratch",name);fs.mkdirSync(directory,{recursive:true});
const schema=path.join(directory,"main.prisma");
fs.writeFileSync(schema,execFileSync("git",["show","4d009e6714a69c7178b2dd9fd22b9f68cae8423f:prisma/schema.prisma"]));
const admin=new pg.Client({connectionString:root+"postgres"});await admin.connect();await admin.query(`CREATE DATABASE "${name}"`);
const db=new pg.Client({connectionString:root+name});await db.connect();
try {
  const ddl=execFileSync(process.execPath,["node_modules/prisma/build/index.js","migrate","diff","--from-empty","--to-schema",schema,"--script"],{encoding:"utf8",env:{...process.env,DATABASE_URL:root+name,DIRECT_URL:root+name}});
  await db.query(ddl);
  await db.query(fs.readFileSync("prisma/migrations/20261003220000_website_purchase_intent/migration.sql","utf8"));
  const table=(await db.query(`SELECT relrowsecurity FROM pg_class WHERE oid='"WebsitePurchaseIntent"'::regclass`)).rows[0];assert.equal(table.relrowsecurity,true);
  const foreign=(await db.query(`SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid='"WebsitePurchaseIntent"'::regclass AND contype IN ('f','c')`)).rows[0];assert.equal(foreign.count,2);
  const drift=execFileSync(process.execPath,["node_modules/prisma/build/index.js","migrate","diff","--from-config-datasource","--to-schema","prisma/schema.prisma","--exit-code"],{encoding:"utf8",env:{...process.env,DATABASE_URL:root+name,DIRECT_URL:root+name}});assert.match(drift,/No difference detected/);
  console.log("PASS main -> purchase intent migration; zero Prisma drift; FK/check/RLS present");
} finally {await db.end();await admin.end();}
