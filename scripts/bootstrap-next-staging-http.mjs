import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";
import {localCommercialDatabase} from "./commercial-migrations.mjs";

// Completes the former manual preconditions through the real HTTP application.
// SQL is used only for assertions and synthetic identifiers, never to create
// users, contracts, services, staff, bookings, or website drafts.
const state=JSON.parse(fs.readFileSync("scratch/next-staging/current.json","utf8"));
const target=path.resolve(state.target);assert(target.startsWith(path.resolve("scratch/next-staging")+path.sep));
assert.equal(state.httpOrigin,"http://127.0.0.1:3128");
const env=JSON.parse(fs.readFileSync(path.join(target,"staging-runtime.private.json"),"utf8"));
const accounts=JSON.parse(fs.readFileSync(path.join(target,"staging-accounts.private.json"),"utf8"));assert.equal(accounts.synthetic,true);
assert.equal(env.CONTACT_FLOW_PRODUCTION_ENABLED,"0");assert.equal(env.NEXT_STAGING_NETWORK_GUARD,"1");
const db=new pg.Pool({connectionString:localCommercialDatabase(env.DATABASE_URL)});
const origin=state.httpOrigin,checks=[];let cookie="";
function check(name,value){assert(value,name);checks.push(name);console.log("PASS "+name);}
async function call(route,body,headers={}){const response=await fetch(origin+route,{redirect:"manual",method:body===undefined?"GET":"POST",headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{"Content-Type":"application/json"}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});return{response,text:await response.text()};}
async function json(route,body,headers){const r=await call(route,body,headers);return{...r,body:JSON.parse(r.text)};}
async function action(name,args,route,filename){
 const manifest=JSON.parse(fs.readFileSync(path.join(target,".next-websites-qa/dev/server/server-reference-manifest.json"),"utf8"));
 const id=Object.entries(manifest.node).find(([,e])=>e.exportedName===name&&e.filename?.endsWith(filename))?.[0];assert(id,"Compiled server action required");
 const r=await call(route,args,{"next-action":id,"Content-Type":"text/plain;charset=UTF-8"});assert.equal(r.response.status,200);
 const lines=r.text.split("\n"),root=JSON.parse(lines.find(l=>l.startsWith("0:")).slice(2));
 let result=root.a;
 if(typeof root.a==="string"&&root.a.startsWith("$@")){const prefix=root.a.slice(2)+":";const raw=lines.filter(l=>l.startsWith(prefix)).at(-1)?.slice(prefix.length);assert(raw);result=JSON.parse(raw);}
 assert(!result?.error,`${name}: ${result?.error}`);return result;
}
try{
 const email="registro-plus-20261028@rc.example.invalid",password=accounts.accounts[0].password;
 const existing=(await db.query('SELECT id FROM "User" WHERE email=$1',[email])).rows[0];
 let auth;
 if(!existing){auth=await json("/api/auth/register",{email,password,name:"Responsable RC",businessName:"Registro Integral RC Plus",countryCode:"CL",timezone:"America/Santiago",currencyCode:"CLP",planIntent:"PURAGENDA_PLUS",commercialPlanIntent:"PURAGENDA_PLUS",professionalTotal:3,billingCycle:"ANNUAL",marketplaceCategorySlug:"otro",marketplaceOtherDescription:"Servicio sintético RC1",marketplaceLocalityNotFound:true,marketplaceCityName:"Ciudad sintética RC",marketplaceAuthorized:false,termsAccepted:true});assert.equal(auth.response.status,201);}else{auth=await json("/api/auth/login",{email,password});assert.equal(auth.response.status,200);}
 cookie=auth.response.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
 const business=(await db.query('SELECT b.* FROM "Business" b JOIN "User" u ON u.id=b."ownerId" WHERE u.email=$1',[email])).rows[0];assert(business);
 const contract=(await db.query('SELECT *,EXTRACT(EPOCH FROM("trialEnd"-"trialStart"))/86400 AS days FROM "CommercialSubscription" WHERE "businessId"=$1',[business.id])).rows[0];
 check("Annual Plus registration persists 3 professionals, 374900 CLP and exactly 30 trial days",contract.planCode==="PURAGENDA_PLUS"&&contract.professionalTotal===3&&contract.totalPriceClp===374900&&Number(contract.days)===30);
 let service=(await db.query('SELECT id FROM "Service" WHERE "businessId"=$1 AND name=$2',[business.id,"Consulta integral RC"])).rows[0];
 if(!service){const r=await json("/api/dashboard/services",{name:"Consulta integral RC",description:"Servicio sintético RC1",duration:30,price:15000});assert.equal(r.response.status,201);service=r.body;}
 check("Service created through authenticated dashboard API",!!service.id);
 const page=await call("/dashboard/staff");assert.equal(page.response.status,200);
 let staff=(await db.query('SELECT id FROM "Staff" WHERE "businessId"=$1 AND name=$2',[business.id,"Profesional Integral RC"])).rows[0];
 if(!staff){await action("createStaffAction",[{name:"Profesional Integral RC",email:"profesional@rc.example.invalid",role:"STAFF",serviceIds:[service.id]}],"/dashboard/staff","dashboard.actions.ts");staff=(await db.query('SELECT id FROM "Staff" WHERE "businessId"=$1 AND name=$2',[business.id,"Profesional Integral RC"])).rows[0];}
 check("Professional created with selected service via authenticated server action",!!staff?.id);
 const location=(await db.query('SELECT id FROM "BusinessLocation" WHERE "businessId"=$1 AND "isPrimary"=true',[business.id])).rows[0];assert(location);
 await action("setStaffLocationAssignmentAction",[staff.id,location.id,true],"/dashboard/staff","dashboard.actions.ts");
 await action("saveStaffScheduleAction",[staff.id,Array.from({length:7},(_,dayOfWeek)=>({dayOfWeek,startTime:"10:00",endTime:"19:00",isWorking:true})),location.id],"/dashboard/staff","dashboard.actions.ts");
 check("Location and working hours configured through the application",true);
 const prior=(await db.query('SELECT id FROM "Appointment" WHERE "businessId"=$1 AND "customerEmail"=$2',[business.id,"reserva-integral@rc.example.invalid"])).rows;
 if(!prior.length){
  const date=new Date(Date.now()+4*86400000).toISOString().slice(0,10),query=new URLSearchParams({date,serviceId:service.id,staffId:staff.id,locationId:location.id});
  const available=await json(`/api/business/${business.slug}/availability?${query}`,undefined,{"x-api-key":business.apiKey});assert.equal(available.response.status,200);
  const slot=available.body.slots?.[0];assert(slot,"Configured professional must have a public slot");
  const booking={serviceId:service.id,staffId:staff.id,locationId:location.id,startTime:slot.startTime,endTime:slot.endTime,customerName:"Cliente Sintético RC",customerEmail:"reserva-integral@rc.example.invalid",customerPhone:"+56900000001"};
  const headers={"x-api-key":business.apiKey,"Idempotency-Key":"rc1-booking-"+randomUUID()};
  const booked=await json(`/api/business/${business.slug}/book`,booking,headers);assert.equal(booked.response.status,201);
  const replay=await json(`/api/business/${business.slug}/book`,booking,headers);assert(replay.response.status>=200&&replay.response.status<300);
 }
 check("Public booking persists once and replays safely without commercial opt-in",(await db.query('SELECT count(*)::int AS n FROM "Appointment" WHERE "businessId"=$1 AND "customerEmail"=$2',[business.id,"reserva-integral@rc.example.invalid"])).rows[0].n===1);
 await call("/dashboard/website");
 const site=(await db.query('SELECT * FROM "BusinessWebsite" WHERE "businessId"=$1',[business.id])).rows[0];assert(site);
 await action("saveWebsiteDraft",[{...site.draftConfig,headline:"Reserva integral RC",intro:"Sitio sintético de certificación RC1, sin clientes reales."},site.revision,site.subdomain,site.templateKey],"/dashboard/website","website.actions.ts");
 check("Website draft edited through authenticated HTTP action",true);
 fs.writeFileSync(path.join(target,"bootstrap-http-results.json"),JSON.stringify({passed:true,syntheticOnly:true,providerCalls:0,checks},null,2));
}finally{await db.end();}
