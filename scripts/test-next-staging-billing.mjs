// Real local HTTP and server actions; only synthetic fixtures, payment I/O sealed.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {randomUUID,randomBytes} from "node:crypto";
import pg from "pg";
import {localCommercialDatabase} from "./commercial-migrations.mjs";
const state=JSON.parse(fs.readFileSync("scratch/next-staging/current.json","utf8"));
const target=path.resolve(state.target);assert(target.startsWith(path.resolve("scratch/next-staging")+path.sep));
assert.equal(state.httpOrigin,"http://127.0.0.1:3128");
const env=JSON.parse(fs.readFileSync(path.join(target,"staging-runtime.private.json"),"utf8"));
assert.equal(env.NEXT_STAGING_NETWORK_GUARD,"1");assert.equal(env.PURAGENDA_MP_V2_ENABLED,"0");
assert(!env.MERCADOPAGO_ACCESS_TOKEN && !env.RESEND_API_KEY);
const db=new pg.Pool({connectionString:localCommercialDatabase(env.DATABASE_URL)}),origin=state.httpOrigin,checks=[];
let cookie="";
const check=(name,value)=>{assert(value,name);checks.push(name);console.log("PASS "+name);};
async function call(route,body,headers={}) {
  const response=await fetch(origin+route,{redirect:"manual",method:body===undefined?"GET":"POST",headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{"Content-Type":"application/json"}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=null;}return {response,text,data};
}
try {
  const account={email:`rewards-${randomUUID()}@example.invalid`,password:randomBytes(24).toString("base64url")};
  const auth=await call("/api/auth/register",{...account,name:"Synthetic rewards owner",businessName:"Synthetic rewards business",countryCode:"CL",timezone:"America/Santiago",currencyCode:"CLP",planIntent:"PURAGENDA_PLUS",commercialPlanIntent:"PURAGENDA_PLUS",professionalTotal:1,billingCycle:"MONTHLY",marketplaceCategorySlug:"otro",marketplaceOtherDescription:"Synthetic rewards",marketplaceLocalityNotFound:true,marketplaceCityName:"Synthetic city",marketplaceAuthorized:false,termsAccepted:true},{"x-forwarded-for":`192.0.2.${150+Math.floor(Math.random()*50)}`});
  check("Synthetic reward owner registers through the actual application",auth.response.status===201);
  cookie=auth.response.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
  const business=(await db.query('SELECT b.id FROM "Business" b JOIN "User" u ON u.id=b."ownerId" WHERE u.email=$1',[account.email])).rows[0];assert(business);
  const rewards=await call("/dashboard/rewards");check("Rewards page explicitly presents pending V2 reservation without a payment promise",rewards.response.status===200&&rewards.text.includes("Los premios se reservan"));
  const affiliate=(await db.query('SELECT * FROM "Affiliate" WHERE "businessId"=$1',[business.id])).rows[0];assert(affiliate);
  const prizeId=randomUUID();await db.query('INSERT INTO "Prize" (id,"affiliateId",type,percentage,name) VALUES ($1,$2,\'PERCENTAGE\',25,\'Synthetic billing fixture\')',[prizeId,affiliate.id]);
  // The production catalog contains 10/15/20/30/50% prizes. A malformed prize
  // must be rejected even when it belongs to the authenticated business.
  const manifest=JSON.parse(fs.readFileSync(path.join(target,".next-websites-qa/dev/server/server-reference-manifest.json"),"utf8"));
  const actionId=Object.entries(manifest.node).find(([,e])=>e.exportedName==="activatePrizeAction"&&e.filename?.replaceAll("\\","/").endsWith("rewards/actions.ts"))?.[0];assert(actionId);
  async function activate(id) {
    const r=await call("/dashboard/rewards",[id],{"next-action":actionId,"Content-Type":"text/plain;charset=UTF-8"});assert.equal(r.response.status,200);
    const lines=r.text.split("\n"),root=JSON.parse(lines.find(l=>l.startsWith("0:")).slice(2));let result=root.a;
    if(typeof result==="string"&&result.startsWith("$@")){const prefix=result.slice(2)+":";result=JSON.parse(lines.filter(l=>l.startsWith(prefix)).at(-1).slice(prefix.length));}return result;
  }
  check("Malformed percentage prize cannot be activated",!(await activate(prizeId)).success);
  await db.query('UPDATE "Prize" SET percentage=50 WHERE id=$1',[prizeId]);
  const reserved=await activate(prizeId);check("Valid V2 prize reserves through the authenticated HTTP server action",reserved.success&&reserved.pendingCommercialConfirmation);
  const replay=await activate(prizeId);check("Duplicate activation is rejected without consuming another benefit",!replay.success);
  const dashboard=await call("/api/dashboard/subscription/billing");assert.equal(dashboard.response.status,200);
  check("Dashboard exposes preserved benefit and disabled provider execution",dashboard.data.benefitHold===true&&dashboard.data.enabled===false&&dashboard.data.benefitQuote.providerValidated===false);
  check("Dashboard blocks cycle transition rather than scheduling an unverified second contract",dashboard.data.billingCycleChangeEnabled===false);
  const monthly=dashboard.data.benefitQuote.monthlyTotal,credit=monthly-Math.round(monthly*.5);
  check("Accepted benefit pricing subtracts one final monthly discount from the cycle",dashboard.data.benefitQuote.credit===credit&&dashboard.data.benefitQuote.amountDue===dashboard.data.total-credit);
  const refused=await call("/api/billing/subscribe",{action:"SUBSCRIBE",idempotencyKey:randomUUID(),accepted:true,expectedContractHash:dashboard.data.contractHash});
  check("Sealed payment adapter rejects checkout before any external operation",refused.response.status===503&&refused.data.error==="V2_BILLING_DISABLED");
  const stored=(await db.query('SELECT "activePrizeId","pendingDiscountPercentage","freeMonthsRemaining" FROM "Subscription" WHERE "businessId"=$1',[business.id])).rows[0];
  check("HTTP attempts leave reserved prize and balances intact",stored.activePrizeId===prizeId&&stored.pendingDiscountPercentage===50&&stored.freeMonthsRemaining===0);
  check("No provider operation was created",(await db.query('SELECT count(*)::int n FROM "CommercialBillingOperation" WHERE "businessId"=$1',[business.id])).rows[0].n===0);
  // Register a separate annual owner with a real referral through the app.
  cookie="";
  const email=`billing-${randomUUID()}@example.invalid`,password=randomBytes(24).toString("base64url");
  const registered=await call("/api/auth/register",{email,password,name:"Synthetic billing owner",businessName:"Synthetic annual referred business",countryCode:"CL",timezone:"America/Santiago",currencyCode:"CLP",planIntent:"PURAGENDA",commercialPlanIntent:"PURAGENDA",professionalTotal:1,billingCycle:"ANNUAL",marketplaceCategorySlug:"otro",marketplaceOtherDescription:"Synthetic billing",marketplaceLocalityNotFound:true,marketplaceCityName:"Synthetic city",marketplaceAuthorized:false,termsAccepted:true,referralCode:affiliate.referralCode},{"x-forwarded-for":`192.0.2.${200+Math.floor(Math.random()*40)}`});
  check("Annual registration with referral succeeds over actual HTTP",registered.response.status===201);
  cookie=registered.response.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
  const annual=await call("/api/dashboard/subscription/billing");assert.equal(annual.response.status,200);
  check("Referral discount survives annual registration as 25 percent of one month",annual.data.benefitHold&&annual.data.benefitQuote.monthlyTotal===12990&&annual.data.benefitQuote.amountDue===126653);
  check("Annual offer remains 12 months paying 10 before the single-month benefit",annual.data.total===129900&&annual.data.benefitQuote.cycleTotal===129900);
  fs.writeFileSync(path.join(target,"audit05-billing-http-results.json"),JSON.stringify({passed:true,syntheticOnly:true,providerCalls:0,checks},null,2));
}finally{await db.end();}
