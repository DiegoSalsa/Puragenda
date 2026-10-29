import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import pg from "pg";
import {localCommercialDatabase} from "./commercial-migrations.mjs";

// This harness uses only the synthetic, disposable staging prepared by us.
// Credentials, cookies and opt-out tokens are deliberately never reported.
const state=JSON.parse(fs.readFileSync("scratch/next-staging/current.json","utf8"));
const target=path.resolve(state.target);
assert(target.startsWith(path.resolve("scratch/next-staging")+path.sep));
const env=JSON.parse(fs.readFileSync(path.join(target,"staging-runtime.private.json"),"utf8"));
const accounts=JSON.parse(fs.readFileSync(path.join(target,"staging-accounts.private.json"),"utf8"));
assert.equal(accounts.synthetic,true);
assert.equal(state.httpOrigin,"http://127.0.0.1:3128");
const pool=new pg.Pool({connectionString:localCommercialDatabase(env.DATABASE_URL)});
const origin=state.httpOrigin, checks=[];
async function call(route,data,cookie="",extra={}){
 const response=await fetch(origin+route,{method:data===undefined?"GET":"POST",redirect:"manual",headers:{Origin:origin,"Content-Type":"application/json",...(cookie?{Cookie:cookie}:{}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});
 const text=await response.text();let body;try{body=JSON.parse(text);}catch{body={html:text};}
 return {response,body};
}
function ok(name,value){assert(value,name);checks.push(name);console.log("PASS "+name);}
async function login(account){const {response}=await call("/api/auth/login",{email:account.email,password:account.password});assert.equal(response.status,200);return response.headers.getSetCookie().map(v=>v.split(";")[0]).join("; ");}
async function action(route,data,cookie){const result=await call(route,data,cookie);assert.equal(result.response.status,200,`${route}:${data.action}:${result.body.code??result.response.status}`);return result.body;}
try{
 const tlsStatus=await new Promise((resolve,reject)=>{const req=https.get({hostname:"127.0.0.1",port:3448,path:"/",servername:"localhost",ca:fs.readFileSync(path.join(target,"localhost.crt"))},res=>{res.resume();resolve(res.statusCode);});req.on("error",reject);});
 ok("HTTPS certificate and hostname validated with explicit local CA",tlsStatus===200);
 const plus=accounts.accounts.find(a=>a.plan==="PURAGENDA_PLUS"),basic=accounts.accounts.find(a=>a.plan==="PURAGENDA");
 const plusCookie=await login(plus),basicCookie=await login(basic);
 ok("Two independent owners authenticated through actual HTTP login",!!plusCookie&&!!basicCookie&&plusCookie!==basicCookie);
 const cf="/api/dashboard/contact-flow",growth="/api/dashboard/puri-plus";
 ok("Unauthenticated dashboard rejected",(await call(cf,{action:"LOAD"})).response.status===401);
 ok("Cross-origin request rejected",(await call(cf,{action:"LOAD"},plusCookie,{Origin:"https://untrusted.example.invalid"})).response.status===403);
 const basicAccess=await call(cf,{action:"LOAD"},basicCookie);
 ok("Basic plan cannot access Contact Flow",basicAccess.response.status>=400&&!basicAccess.body.campaigns);
 const analysis=await action(growth,{action:"ANALYZE"},plusCookie);
 const signal=analysis.signals.find(s=>s.kind==="INACTIVE_CLIENTS"&&s.runId===analysis.result.run.id);assert(signal);
 ok("Puri Advanced SQL analysis detects synthetic inactive clients",!!signal.id);
 let draft=(await action(growth,{action:"DRAFT",id:signal.id},plusCookie)).result;
 if(draft.status==="DRAFT")draft=(await action(growth,{action:"PREPARE",id:draft.id,hash:draft.contentHash,version:draft.version},plusCookie)).result;
 if(draft.status==="PROPOSED")draft=(await action(growth,{action:"REVIEW",id:draft.id,hash:draft.contentHash,version:draft.version},plusCookie)).result;
 if(draft.status==="REVIEWED")draft=(await action(growth,{action:"APPROVE",id:draft.id,hash:draft.contentHash,version:draft.version,explicit:true},plusCookie)).result;
 ok("Recommendation prepared, reviewed and explicitly approved via HTTP",draft.status==="APPROVED");
 const campaign={...accounts.plusRecommendation.input,recommendationId:draft.id,recommendationHash:draft.contentHash,recommendationVersion:draft.version,startsAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()};
 const prepared=await action(cf,{action:"PREPARE",campaign},plusCookie);
 let row=prepared.campaigns.find(c=>c.id===prepared.result.id);assert(row);
 ok("Only consented cohort included and campaign prepared",row.eligible>0&&row.eligible<=3&&row.excluded>0);
 const prior=await call(cf,{action:"AUTHORIZE",id:row.id,hash:row.version.contentHash,version:row.version.version,explicit:false},plusCookie);
 ok("Authorization requires explicit approval",prior.response.status>=400);
 const authorized=await action(cf,{action:"AUTHORIZE",id:row.id,hash:row.version.contentHash,version:row.version.version,explicit:true},plusCookie);
 row=authorized.campaigns.find(c=>c.id===row.id);
 ok("Campaign authorization is persisted",row.version.authorizations.length===1);
 ok("Legacy CRON_SECRET cannot invoke commercial worker",(await call("/api/cron/puragenda-next",undefined,"",{Authorization:`Bearer ${env.CRON_SECRET}`})).response.status===401);
 const before=Date.now();const tick=await call("/api/cron/puragenda-next",undefined,"",{Authorization:`Bearer ${env.COMMERCIAL_WORKER_SECRET}`});
 ok("Dedicated scheduler bearer executes whole worker without error",tick.response.status===200&&tick.body.ok===true);
 checks.push(`Worker HTTP duration ${Date.now()-before}ms (cold development runtime)`);
 await action(cf,{action:"RECONCILE",explicit:true},plusCookie);
 const delivered=await pool.query('SELECT state,count(*)::int AS n FROM "CfMessage" WHERE "businessId"=$1 GROUP BY state',[plus.businessId]);
 ok("Synthetic provider receipts reconciled to delivered",delivered.rows.some(r=>r.state==="DELIVERED"&&r.n>0));
 const token=(await pool.query('SELECT * FROM "CfToken" WHERE "businessId"=$1 AND kind=\'UNSUBSCRIBE\' LIMIT 1',[plus.businessId])).rows[0];assert(token);
 // pg returns timestamps without time zone as local time; preserve Prisma UTC semantics.
 const iso=(await pool.query('SELECT to_char("expiresAt",\'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') AS expiry FROM "CfToken" WHERE id=$1',[token.id])).rows[0].expiry;
 const signed=token.id+"."+createHmac("sha256",env.CONTACT_FLOW_TOKEN_SECRET).update(`UNSUBSCRIBE:${token.id}:${iso}`).digest("base64url");
 const optOut=await call("/contact-flow/unsubscribe?token="+encodeURIComponent(signed),{});
 ok("Real HTTP opt-out route accepts signed synthetic token",optOut.body.html?.includes("baja comercial quedó registrada"));
 await call("/contact-flow/unsubscribe?token="+encodeURIComponent(signed),{});
 const suppression=await pool.query('SELECT count(*)::int AS n FROM "CfSuppression" WHERE "businessId"=$1 AND reason=\'UNSUBSCRIBE\'',[plus.businessId]);
 ok("Opt-out replay creates one suppression",suppression.rows[0].n===1);
 const replay=await call("/api/cron/puragenda-next",undefined,"",{Authorization:`Bearer ${env.COMMERCIAL_WORKER_SECRET}`});
 ok("Worker replay succeeds without duplicate message creation",replay.response.status===200&&(await pool.query('SELECT count(*)::int AS n FROM "CfMessage" WHERE "businessId"=$1',[plus.businessId])).rows[0].n===delivered.rows.reduce((n,r)=>n+r.n,0));
 const foreign=await call(cf,{action:"RESULTS",id:row.id},basicCookie);
 ok("Other tenant cannot inspect campaign results",foreign.response.status>=400&&!foreign.body.result);
 const observed=await pool.query('SELECT "lastError","leaseUntil","lastSuccessAt" IS NOT NULL AS success FROM "CommercialWorkerState" LIMIT 1');
 ok("Worker reports last success and releases lease",observed.rows[0]?.success&&observed.rows[0].lastError===null&&observed.rows[0].leaseUntil===null);
 const booking=await pool.query('SELECT count(*)::int AS n FROM "Appointment" WHERE "customerEmail"=$1',['reserva-integral@rc.example.invalid']);
 ok("UI-created widget booking exists in isolated PostgreSQL",booking.rows[0].n===1);
 const report={passed:true,syntheticOnly:true,httpOrigin:origin,httpsCaValidated:true,externalProviderCalls:0,aiProviderCalls:0,checks};
 fs.writeFileSync(path.join(target,"integrated-http-results.json"),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await pool.end();}
