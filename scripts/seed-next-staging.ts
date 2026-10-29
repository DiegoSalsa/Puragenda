import fs from "node:fs";
import {randomBytes} from "node:crypto";
import bcrypt from "bcrypt";
import {prisma} from "../src/server/db/prisma";
import {contactFixture} from "../tests/fixtures/contact-flow";
import {growthFixture} from "../tests/fixtures/puri-growth";
import {quoteCommercialPlan,COMMERCIAL_CATALOG_VERSION} from "../src/core/commercial-catalog";
async function main(){
 const plus=await contactFixture({trial:true,prepare:false,maximum:3}),basic=await growthFixture({history:false,trial:true});
 const password="RC-"+randomBytes(12).toString("hex"),now=new Date(),end=new Date(+now+30*86400000);
 const accounts=[];
 for(const[fixture,plan,label]of[[plus,"PURAGENDA_PLUS","Plus"],[basic,"PURAGENDA","Básico"]]as const){
  const q=quoteCommercialPlan({catalogVersion:COMMERCIAL_CATALOG_VERSION,plan,professionalTotal:1});
  const email=plan==="PURAGENDA_PLUS"?"plus@rc.example.invalid":"basic@rc.example.invalid";
  await prisma.user.update({where:{id:fixture.user.id},data:{email,password:await bcrypt.hash(password,10),name:`Responsable sintético ${label}`}});
  await prisma.business.update({where:{id:fixture.businessId},data:{name:`Negocio RC ${label}`,countryCode:"CL",currencyCode:"CLP",timezone:"America/Santiago"}});
  await prisma.subscription.update({where:{businessId:fixture.businessId},data:{plan,status:"TRIALING",isTrial:true,trialEndsAt:end,currentPeriodEnd:end,staffLimitOverride:1}});
  await prisma.commercialSubscription.update({where:{businessId:fixture.businessId},data:{planCode:plan,status:"TRIALING",trialStart:now,trialEnd:end,basePriceClp:q.baseMonthly,totalPriceClp:q.monthlyTotal,termsSnapshot:{origin:"registration_v2",syntheticStaging:true}}});
  const staff=await prisma.staff.create({data:{businessId:fixture.businessId,userId:fixture.user.id,name:`Profesional sintético ${label}`,services:{connect:{id:fixture.service.id}}}});
  await prisma.staffLocation.create({data:{staffId:staff.id,locationId:fixture.location.id}});
  for(let dayOfWeek=0;dayOfWeek<7;dayOfWeek++)await prisma.staffSchedule.create({data:{staffId:staff.id,dayOfWeek,startTime:"09:00",endTime:"17:00"}});
  await prisma.appointment.updateMany({where:{businessId:fixture.businessId},data:{staffId:staff.id}});
  // The fixture was originally analyzed with legacy virtual agendas. Preserve
  // that history, but retire its cache/suppression slots before real HTTP QA.
  for(const row of await prisma.puriGrowthRun.findMany({where:{businessId:fixture.businessId}}))await prisma.puriGrowthRun.update({where:{id:row.id},data:{analysisKey:row.analysisKey+":seed"}});
  for(const row of await prisma.puriGrowthSignal.findMany({where:{businessId:fixture.businessId}}))await prisma.puriGrowthSignal.update({where:{id:row.id},data:{status:"EXPIRED",expiresAt:now,dedupeKey:row.dedupeKey+":seed",materialHash:row.materialHash+":seed"}});
  accounts.push({plan,email,password,businessId:fixture.businessId,slug:fixture.businessId});
 }
 fs.writeFileSync("staging-accounts.private.json",JSON.stringify({synthetic:true,accounts,plusRecommendation:{id:plus.rec.id,input:plus.input}},null,2),{mode:0o600});
 console.log(JSON.stringify({seeded:true,accounts:accounts.map(({plan})=>plan),trialDays:30,syntheticOnly:true}));
}
main().catch(error=>{fs.writeFileSync("staging-seed-error.private.log",String(error?.stack??error),{mode:0o600});console.error("NEXT_STAGING_SEED_FAILED");process.exitCode=1;}).finally(()=>prisma.$disconnect());
