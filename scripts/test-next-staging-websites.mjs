import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import {isDeepStrictEqual} from "node:util";
import pg from "pg";
import {localCommercialDatabase} from "./commercial-migrations.mjs";
const state=JSON.parse(fs.readFileSync("scratch/next-staging/current.json","utf8"));
const target=path.resolve(state.target);assert(target.startsWith(path.resolve("scratch/next-staging")+path.sep));
const env=JSON.parse(fs.readFileSync(path.join(target,"staging-runtime.private.json"),"utf8"));
const accounts=JSON.parse(fs.readFileSync(path.join(target,"staging-accounts.private.json"),"utf8"));assert.equal(accounts.synthetic,true);
assert.equal(state.httpOrigin,"http://127.0.0.1:3128");
pg.types.setTypeParser(1114,value=>new Date(value+"Z"));
const db=new pg.Pool({connectionString:localCommercialDatabase(env.DATABASE_URL)}),origin=state.httpOrigin,checks=[];
function check(name,value){assert(value,name);checks.push(name);console.log("PASS "+name);}
async function request(route,cookie="",options={}){
 const response=await fetch(origin+route,{redirect:"manual",...options,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...options.headers}});
 return{response,text:await response.text()};
}
async function json(route,data,cookie=""){const r=await request(route,cookie,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});return{...r,body:JSON.parse(r.text)};}
async function login(email){const r=await json("/api/auth/login",{email,password:accounts.accounts[0].password});assert.equal(r.response.status,200);return r.response.headers.getSetCookie().map(v=>v.split(";")[0]).join("; ");}
async function action(name,args,cookie){
 const manifest=JSON.parse(fs.readFileSync(path.join(target,".next-websites-qa/dev/server/server-reference-manifest.json"),"utf8"));
 const id=Object.entries(manifest.node).find(([,e])=>e.exportedName===name&&e.filename?.endsWith("website.actions.ts"))?.[0];assert(id,"Compiled action required");
 const r=await request("/dashboard/website",cookie,{method:"POST",headers:{"next-action":id,"content-type":"text/plain;charset=UTF-8"},body:JSON.stringify(args)});
 assert.equal(r.response.status,200);const lines=r.text.split("\n");const root=JSON.parse(lines.find(l=>l.startsWith("0:")).slice(2));
 if(root.a===undefined)return undefined;
 if(typeof root.a==="string"&&root.a.startsWith("$@")){const prefix=root.a.slice(2)+":";const raw=lines.filter(l=>l.startsWith(prefix)).at(-1)?.slice(prefix.length);assert(raw);if(raw==='"$undefined"')return undefined;return JSON.parse(raw);}
 return root.a;
}
async function publicSite(subdomain){return new Promise((resolve,reject)=>{const req=http.get(origin+"/",{headers:{host:`${subdomain}.localhost:3128`}},res=>{let text="";res.on("data",c=>text+=c);res.on("end",()=>resolve({status:res.statusCode,text}));});req.on("error",reject);});}
let original;
try{
 const registered="registro-plus-20261028@rc.example.invalid",cookie=await login(registered);
 const business=(await db.query('SELECT b.id FROM "Business" b JOIN "User" u ON u.id=b."ownerId" WHERE u.email=$1',[registered])).rows[0];assert(business);
 const site=async()=> (await db.query('SELECT * FROM "BusinessWebsite" WHERE "businessId"=$1',[business.id])).rows[0];
 const base=await site();assert(base);
 check("Registered Plus business has persisted website draft",base.draftConfig.headline==="Reserva integral RC");
 const form=new FormData();form.set("image",new Blob([fs.readFileSync("public/websites/pink-y2k/pink-dream.webp")],{type:"image/webp"}),"synthetic-cover.webp");form.set("usage","hero");
 const uploaded=await request("/api/website/media",cookie,{method:"POST",body:form});const asset=JSON.parse(uploaded.text).asset;
 check("Authenticated media upload uses only local mock storage",uploaded.response.status===200&&asset?.secureUrl.startsWith("/website-media-qa/"));
 const current=await site(),config={...current.draftConfig,heroImage:asset.secureUrl,mediaAssets:[...(current.draftConfig.mediaAssets??[]),asset]};
 const saved=await action("saveWebsiteDraft",[config,current.revision,current.subdomain,current.templateKey],cookie);
 check("HTTP draft save validates owned image and revision",saved?.revision===current.revision+1);
 const stale=await action("saveWebsiteDraft",[config,current.revision,current.subdomain,current.templateKey],cookie);
 check("Stale second-tab save is rejected",!!stale?.error);
 const result=await action("publishWebsite",[saved.revision],cookie);
 check("Actual authenticated publish succeeds for Plus trial",!result?.error&&(await site()).status==="PUBLISHED");
 const page=await publicSite(current.subdomain);
 check("Public tenant host serves published title and booking interface",page.status===200&&page.text.includes("Reserva integral RC")&&page.text.includes("Comenzar mi reserva"));
 original=(await db.query('SELECT "trialStart","trialEnd",status FROM "CommercialSubscription" WHERE "businessId"=$1',[business.id])).rows[0];
 await db.query('UPDATE "CommercialSubscription" SET "trialStart"=(NOW() AT TIME ZONE \'UTC\')-INTERVAL \'31 days\',"trialEnd"=(NOW() AT TIME ZONE \'UTC\')-INTERVAL \'1 hour\' WHERE "businessId"=$1',[business.id]);
 check("Expired Plus trial stops public site",(await publicSite(current.subdomain)).status===404);
 check("Expiry preserves draft, publication and appointments",isDeepStrictEqual((await site()).draftConfig,config)&&(await db.query('SELECT count(*)::int AS n FROM "Appointment" WHERE "businessId"=$1',[business.id])).rows[0].n>0);
 await db.query('UPDATE "CommercialSubscription" SET "trialEnd"=$1,status=$2,"trialStart"=$4 WHERE "businessId"=$3',[original.trialEnd,original.status,business.id,original.trialStart]);original=undefined;
 check("Restored entitlement serves existing publication without recreation",(await publicSite(current.subdomain)).status===200);
 const basicEmail="registro-basic-20261028@rc.example.invalid";
 let basic=(await db.query('SELECT id FROM "User" WHERE email=$1',[basicEmail])).rows[0];
 if(!basic){const r=await json("/api/auth/register",{email:basicEmail,password:accounts.accounts[0].password,name:"Responsable básico RC",businessName:"Registro Integral RC Básico",countryCode:"CL",timezone:"America/Santiago",currencyCode:"CLP",planIntent:"PURAGENDA",commercialPlanIntent:"PURAGENDA",professionalTotal:1,billingCycle:"MONTHLY",marketplaceCategorySlug:"otro",marketplaceOtherDescription:"Servicio sintético local",marketplaceLocalityNotFound:true,marketplaceCityName:"Ciudad sintética RC",marketplaceAuthorized:false,termsAccepted:true});assert.equal(r.response.status,201,"Synthetic Basic HTTP registration");basic=true;}
 const basicContract=(await db.query('SELECT c."planCode",c."professionalTotal",c."totalPriceClp",c."billingCycle",EXTRACT(EPOCH FROM(c."trialEnd"-c."trialStart"))/86400 AS days FROM "CommercialSubscription" c JOIN "Business" b ON b.id=c."businessId" JOIN "User" u ON u.id=b."ownerId" WHERE u.email=$1',[basicEmail])).rows[0];
 check("Basic registration persists monthly 12990 CLP and exactly 30 trial days",basic&&basicContract.planCode==="PURAGENDA"&&basicContract.professionalTotal===1&&basicContract.totalPriceClp===12990&&Number(basicContract.days)===30&&basicContract.billingCycle==="MONTHLY");
 const basicCookie=await login(basicEmail);const forbidden=await action("publishWebsite",[saved.revision],basicCookie);
 check("Basic cannot publish another business website",!!forbidden?.error);
 const foreign=await request("/api/website/media",basicCookie,{method:"POST",body:form});
 check("Basic cannot upload Plus website media",foreign.response.status>=400);
 fs.writeFileSync(path.join(target,"integrated-website-results.json"),JSON.stringify({passed:true,syntheticOnly:true,externalProviderCalls:0,checks},null,2));
 console.log(JSON.stringify({passed:true,checks},null,2));
}finally{
 if(original){const b=(await db.query('SELECT b.id FROM "Business" b JOIN "User" u ON u.id=b."ownerId" WHERE u.email=$1',["registro-plus-20261028@rc.example.invalid"])).rows[0];await db.query('UPDATE "CommercialSubscription" SET "trialEnd"=$1,status=$2,"trialStart"=$4 WHERE "businessId"=$3',[original.trialEnd,original.status,b.id,original.trialStart]);}
 await db.end();
}
