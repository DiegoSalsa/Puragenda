import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import assert from "node:assert/strict";
import {localCommercialDatabase} from "./commercial-migrations.mjs";
import {invokeCommercialWorker} from "../ops/commercial-scheduler/worker.mjs";
const state=JSON.parse(fs.readFileSync("scratch/next-staging/current.json","utf8"));
const target=path.resolve(state.target);assert(target.startsWith(path.resolve("scratch/next-staging")+path.sep));
assert.equal(state.httpsOrigin,"https://localhost:3448");
const runtime=JSON.parse(fs.readFileSync(path.join(target,"staging-runtime.private.json"),"utf8"));localCommercialDatabase(runtime.DATABASE_URL);
const env={SCHEDULER_ENABLED:"0",PURAGENDA_WORKER_URL:"https://next-staging.puragenda.cl/api/cron/puragenda-next",COMMERCIAL_WORKER_SECRET:runtime.COMMERCIAL_WORKER_SECRET};
let calls=0;
// Map only this exact staging destination to the owned loopback TLS server.
// This tests real HTTPS, bearer auth and the application; it never contacts DNS
// or a cloud provider. Certificate/hostname verification stays enabled.
function localTransport(url,options){
 assert.equal(url,env.PURAGENDA_WORKER_URL);calls++;
 return new Promise((resolve,reject)=>{
  const req=https.request({hostname:"127.0.0.1",port:3448,servername:"localhost",ca:fs.readFileSync(path.join(target,"localhost.crt")),path:"/api/cron/puragenda-next",method:options.method,headers:options.headers,signal:options.signal},res=>{
   const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:{"content-type":"application/json"}})));
  });req.on("error",reject);req.end();
 });
}
assert.deepEqual(await invokeCommercialWorker(env,localTransport),{disabled:true});assert.equal(calls,0);
env.SCHEDULER_ENABLED="1";
assert.deepEqual(await invokeCommercialWorker(env,localTransport),{ok:true,attempts:1});
await assert.rejects(invokeCommercialWorker({...env,COMMERCIAL_WORKER_SECRET:"synthetic-unauthorized-key-at-least-thirty-two"},localTransport),/PURAGENDA_SCHEDULER_FAILED/);
let attempts=0;
assert.deepEqual(await invokeCommercialWorker(env,(url,options)=>++attempts===1?Promise.resolve(new Response(null,{status:503})):localTransport(url,options),async()=>{}),{ok:true,attempts:2});
fs.writeFileSync(path.join(target,"scheduler-http-results.json"),JSON.stringify({passed:true,cloudRuntime:false,cloudResourcesCreated:false,externalCalls:0,httpsVerified:true,defaultOff:true,dedicatedBearerVerified:true,invalidBearerRejected:true,serverRetryVerified:true},null,2));
console.log("PASS scheduler default-off, verified local TLS, dedicated bearer, rejected invalid bearer and safe retry; Cloudflare runtime not certified.");
