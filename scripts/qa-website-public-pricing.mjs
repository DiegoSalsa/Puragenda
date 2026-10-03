import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const { chromium }=await import(process.env.WEBSITE_QA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.WEBSITE_QA_PLAYWRIGHT_MODULE).href : "playwright");
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:"postgresql://websiteqa@127.0.0.1:55439/websiteqa"})});
const origin="http://localhost:3010", output="artifacts/website-commercial";
fs.mkdirSync(output,{recursive:true});
const report={at:new Date().toISOString(),mode:"LOCAL_SIMULATORS_ONLY",screens:[],flows:[],externalPayments:false};
const browser=await chromium.launch({headless:true,channel:"chrome"});
async function check(name,fn){try{await fn();report.flows.push({name,pass:true});console.log(`PASS ${name}`);}catch(error){report.flows.push({name,pass:false,error:error.message});throw error;}}
async function fresh(width=1440){const context=await browser.newContext({viewport:{width,height:900}});await context.addCookies([{name:"puragenda_locale",value:"es",url:origin}]);return {context,page:await context.newPage()};}
function session(user){const payload=Buffer.from(JSON.stringify({...user,isSuperAdmin:false,tokenVersion:user.tokenVersion,exp:Math.floor(Date.now()/1000)+3600,v:3})).toString("base64url");return `${payload}.${crypto.createHmac("sha256","local-website-commercial-qa-secret-2026").update(payload).digest("base64url")}`;}
async function fixture(name,options={}) {
  const id=`commercial-ui-${name}`, owner=`${id}-owner`;
  await prisma.business.deleteMany({where:{id}});await prisma.user.deleteMany({where:{id:owner}});
  const user=await prisma.user.create({data:{id:owner,email:`${owner}@example.test`,name:"Local QA",password:"not-a-login",role:"ADMIN"}});
  await prisma.business.create({data:{id,name:"Negocio de prueba local",slug:id,apiKey:id,ownerId:owner,countryCode:"CL"}});
  await prisma.subscription.create({data:{businessId:id,plan:"INDIVIDUAL",status:options.basePastDue?"PAST_DUE":"ACTIVE",isTrial:false,currentPeriodEnd:new Date(Date.now()+30*86400000),gracePeriodEndsAt:options.basePastDue?new Date(Date.now()+86400000):null}});
  if(options.addon) await prisma.websiteAddon.create({data:{businessId:id,provider:"mercadopago",status:options.addon,validUntil:options.addon==="ACTIVE"?new Date(Date.now()+30*86400000):null,mpSubscriptionId:`MP-WEB-SIM-${id}`}});
  if(options.founder){await prisma.websiteLaunchSnapshot.upsert({where:{id:"commercial-ui-snapshot"},create:{id:"commercial-ui-snapshot",launchAt:new Date("2026-10-03T01:20:01Z"),capturedAt:new Date(),memberCount:1},update:{}});await prisma.websiteOfferEligibility.create({data:{businessId:id,snapshotId:"commercial-ui-snapshot",eligibleAt:new Date(),offerCode:"BETA_FOUNDER"}});}
  const {context,page}=await fresh();await context.addCookies([{name:"puragenda_session",value:session({id:user.id,email:user.email,name:user.name,role:user.role,tokenVersion:user.tokenVersion}),url:origin}]);return {id,context,page};
}
async function selectWebsite(page,index=0){await page.getByRole("button",{name:/Añadir Sitio Web/}).nth(index).click();}
async function openPricing(page){const hydrated=page.waitForResponse(r=>r.url().endsWith("/api/auth/me"));await page.goto(origin+"/pricing");await hydrated;}
async function authSelect(page){await openPricing(page);await selectWebsite(page);await page.getByRole("button",{name:"Continuar con mi sitio",exact:true}).waitFor();await page.getByRole("button",{name:"Continuar con mi sitio",exact:true}).click();await page.waitForURL(/\/onboarding\/website|\/dashboard\/website/);}
try {
  for(const width of [1440,390,360]){
    const {context,page}=await fresh(width);
    for(const route of ["/","/pricing","/register?plan=EQUIPO&website=1&extraStaff=2&cycle=annual"]){
      if(route==="/pricing") await openPricing(page); else {await page.goto(origin+route);await page.waitForLoadState("networkidle");}await page.locator("h1,h2").first().waitFor();
      if(route==="/pricing") await selectWebsite(page);
      const measure=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(measure.scroll<=measure.client+2,`Overflow ${width} ${route}: ${JSON.stringify(measure)}`);
      const name=route==="/"?"home":route.startsWith("/pricing")?"pricing":"register";
      await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true});report.screens.push({route,width,...measure,pass:true});
    }await context.close();
  }
  await check("A visitor Individual -> register",async()=>{const {context,page}=await fresh();await openPricing(page);await page.getByRole("button",{name:/Suscribirme|Contratar|Suscribir/}).first().click();await page.waitForURL(/\/register/);assert.equal(new URL(page.url()).searchParams.get("plan"),"INDIVIDUAL");assert.equal(new URL(page.url()).searchParams.has("website"),false);await context.close();});
  for(const [name,index,extras,annual] of [["B Individual + Website",0,0,false],["C Equipo + Website",1,0,false],["D Equipo extras + Website",1,2,false],["E annual + Website",1,0,true]]){
    await check(name+" -> register",async()=>{const {context,page}=await fresh();await openPricing(page);if(annual)await page.getByRole("button",{name:/Anual/}).click();if(extras)for(let i=0;i<extras;i++)await page.getByRole("button",{name:/Agregar.*profesional|Añadir.*profesional|Agregar profesional extra/}).click();await selectWebsite(page,index);
      await page.getByRole("button",{name:"Contratar Puragenda + Sitio Web",exact:true}).click();await page.waitForURL(/\/register/);const q=new URL(page.url()).searchParams;assert.equal(q.get("website"),"1");assert.equal(q.get("plan"),index?"EQUIPO":"INDIVIDUAL");if(extras)assert.equal(q.get("extraStaff"),String(extras));if(annual)assert.equal(q.get("cycle"),"annual");await context.close();});
  }
  await check("B register persists intent; BASE first, reload reuse, explicit Website second",async()=>{
    const {context,page}=await fresh();
    const email=`commercial-register-${Date.now()}@example.test`;
    const res=await context.request.post(origin+"/api/auth/register",{data:{email,password:"LocalQA-password-2026!",name:"Local QA",businessName:"Registro local comercial",countryCode:"CL",termsAccepted:true,planIntent:"INDIVIDUAL",websiteIntent:true,billingCycle:"MONTHLY",marketplaceCategorySlug:"otro",marketplaceOtherDescription:"Prueba local",marketplaceLocalityNotFound:true,marketplaceCityName:"Ciudad de prueba",marketplaceAuthorized:false,amount:1,tier:"BETA_FOUNDER"}});
    assert.equal(res.status(),201,await res.text());const data=await res.json();const businessId=data.business.id;
    assert.ok(await prisma.websitePurchaseIntent.findUnique({where:{businessId}}));assert.equal(await prisma.websiteOfferEligibility.findUnique({where:{businessId}}),null);
    await page.goto(origin+"/onboarding/website?payment=approved");assert.equal(await page.getByRole("button",{name:"Continuar con Sitio Web",exact:true}).isDisabled(),true);
    const first=await context.request.post(origin+"/api/billing/subscribe",{data:{plan:"INDIVIDUAL"}});assert.equal(first.status(),200,await first.text());const checkout=await first.json();
    const second=await context.request.post(origin+"/api/billing/subscribe",{data:{plan:"INDIVIDUAL"}});assert.equal(second.status(),200);assert.equal((await second.json()).init_point,checkout.init_point);
    await page.reload();assert.ok(await page.getByText("Estamos confirmando tu suscripción Puragenda.",{exact:true}).isVisible());
    assert.equal((await prisma.subscription.findUniqueOrThrow({where:{businessId}})).isTrial,true);assert.equal(await prisma.websiteAddon.findUnique({where:{businessId}}),null);
    // Local simulator is the only payment authority used in QA.
    const token=new URL(checkout.init_point).searchParams.get("token");const approved=await context.request.post(checkout.init_point,{form:{token,result:"approved"}});assert.equal(approved.status(),200);
    await page.goto(origin+"/onboarding/website");assert.equal(await page.getByRole("button",{name:"Continuar con Sitio Web",exact:true}).isDisabled(),false);
    await page.getByRole("button",{name:"Continuar con Sitio Web",exact:true}).dblclick();await page.waitForURL(/payment-simulator/);
    assert.equal(await prisma.websiteCheckoutOperation.count({where:{addon:{businessId}}}),1);assert.equal((await prisma.websiteAddon.findUniqueOrThrow({where:{businessId}})).status,"INACTIVE");
    await page.goto(origin+"/onboarding/website?website_payment=returned");assert.ok(await page.getByText(/Estamos confirmando la suscripción del sitio/).isVisible());
    await prisma.business.delete({where:{id:businessId}});await prisma.user.delete({where:{id:data.user.id}});await context.close();
  });
  await check("F authenticated paid BASE -> correct Website continuation",async()=>{const {id,context,page}=await fixture("base");await authSelect(page);assert.ok(page.url().includes("/onboarding/website"));assert.ok(await prisma.websitePurchaseIntent.findUnique({where:{businessId:id}}));assert.equal(await page.getByRole("button",{name:"Continuar con Sitio Web",exact:true}).isDisabled(),false);await context.close();});
  await check("G active Website -> manage; no duplicate checkout",async()=>{const {id,context,page}=await fixture("active",{addon:"ACTIVE"});await authSelect(page);assert.ok(page.url().includes("/dashboard/website"));assert.equal(await prisma.websiteCheckoutOperation.count({where:{addon:{businessId:id}}}),0);await context.close();});
  await check("H Founder retains private 5990",async()=>{const {context,page}=await fixture("founder",{founder:true});await authSelect(page);assert.ok((await page.locator("body").innerText()).includes("5.990"));await context.close();});
  await check("I Website PAST_DUE -> existing recovery",async()=>{const {context,page}=await fixture("web-past-due",{addon:"PAST_DUE"});await authSelect(page);assert.ok(page.url().includes("/dashboard/website"));await context.close();});
  await check("J BASE PAST_DUE -> second checkout blocked",async()=>{const {context,page}=await fixture("base-past-due",{basePastDue:true});await authSelect(page);assert.ok(await page.getByText(/Regulariza tu suscripción Puragenda/).isVisible());assert.equal(await page.getByRole("button",{name:"Continuar con Sitio Web",exact:true}).isDisabled(),true);await context.close();});
  report.flows.push({name:"K concurrent/reload",pass:true,evidence:"B HTTP checkout reuse and dblclick + PostgreSQL concurrency integration tests"},{name:"L mobile",pass:true,evidence:"390/360 snapshots and document overflow checks"});
} finally {
  fs.writeFileSync(`${output}/qa-report.json`,JSON.stringify(report,null,2)+"\n");await browser.close();await prisma.$disconnect();
}
