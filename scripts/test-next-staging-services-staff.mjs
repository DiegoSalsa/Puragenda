import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { localCommercialDatabase } from "./commercial-migrations.mjs";
const state=JSON.parse(fs.readFileSync("scratch/next-staging/current.json","utf8"));
const target=path.resolve(state.target);assert(target.startsWith(path.resolve("scratch/next-staging")+path.sep));
const env=JSON.parse(fs.readFileSync(path.join(target,"staging-runtime.private.json"),"utf8"));
const url=localCommercialDatabase(env.DATABASE_URL);assert.equal(new URL(url).hostname,"127.0.0.1");assert(new URL(url).pathname.startsWith("/puragenda_commercial_test_rc"));
assert.equal(env.NEXT_STAGING_NETWORK_GUARD,"1");assert.equal(env.CONTACT_FLOW_PRODUCTION_ENABLED,"0");assert.equal(env.CONTACT_FLOW_EXTERNAL_RELEASE,"false");assert(!env.RESEND_API_KEY&&!env.GOOGLE_CLIENT_SECRET&&!env.MERCADOPAGO_ACCESS_TOKEN);
const accounts=JSON.parse(fs.readFileSync(path.join(target,"staging-accounts.private.json"),"utf8"));assert(accounts.synthetic);
const origin=state.httpOrigin;assert.equal(origin,"http://127.0.0.1:3128");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url})});let cookie="";const checks=[];
function check(name,ok){assert(ok,name);checks.push(name);console.log("PASS "+name);}
async function call(route,body,method=body===undefined?"GET":"POST",headers={}){
 const response=await fetch(origin+route,{method,redirect:"manual",headers:{Origin:origin,Cookie:cookie,"Content-Type":"application/json",...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await response.text();return{response,text,body:response.headers.get("content-type")?.includes("application/json")?JSON.parse(text):null};
}
async function action(name,args){
 const manifest=JSON.parse(fs.readFileSync(path.join(target,".next-websites-qa/dev/server/server-reference-manifest.json"),"utf8"));
 const id=Object.entries(manifest.node).find(([,e])=>e.exportedName===name&&e.filename?.endsWith("dashboard.actions.ts"))?.[0];assert(id,"Compiled action required: "+name);
 const r=await call("/dashboard/staff",args,"POST",{"next-action":id,"Content-Type":"text/plain;charset=UTF-8"});assert.equal(r.response.status,200);
 const lines=r.text.split("\n"),root=JSON.parse(lines.find(l=>l.startsWith("0:")).slice(2));let value=root.a;
 if(typeof value==="string"&&value.startsWith("$@")){const prefix=value.slice(2)+":";value=JSON.parse(lines.filter(l=>l.startsWith(prefix)).at(-1).slice(prefix.length));}return value;
}
try{
 const login=await call("/api/auth/login",{email:"registro-plus-20261028@rc.example.invalid",password:accounts.accounts[0].password});assert.equal(login.response.status,200);cookie=login.response.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
 const business=await db.business.findFirstOrThrow({where:{owner:{email:"registro-plus-20261028@rc.example.invalid"}}});
 const location=await db.businessLocation.findFirstOrThrow({where:{businessId:business.id,isActive:true},orderBy:{isPrimary:"desc"}});
 const created=await call("/api/dashboard/services",{name:"Servicio Auditoría 03 "+randomUUID().slice(0,6),duration:30,price:1000,optionCategories:[{name:"Modalidad",isRequired:false,maxSelections:1,alternatives:[{name:"A domicilio",priceDelta:200,durationDelta:5,isHomeService:true}]}]});assert.equal(created.response.status,201);let service=created.body;
 const categoryId=service.optionCategories[0].id,alternativeId=service.optionCategories[0].alternatives[0].id;
 check("Service creation persists option IDs",!!alternativeId&&service.catalogVersion===0);
 const staffEmail=`audit03-${randomUUID()}@rc.example.invalid`;
 const createdStaff=await action("createStaffAction",[{name:"Profesional Auditoría 03",email:staffEmail,serviceIds:[service.id],locationIds:[location.id]}]);assert(!createdStaff.error,createdStaff.error);
 const staff=await db.staff.findFirstOrThrow({where:{businessId:business.id,email:staffEmail},include:{locations:true,schedule:true}});
 check("Authenticated professional creation assigns the selected branch and closed initial hours",staff.locations.length===1&&staff.locations[0].locationId===location.id&&staff.schedule.length===7&&staff.schedule.every(d=>!d.isWorking));
 await action("saveStaffScheduleAction",[staff.id,Array.from({length:7},(_,dayOfWeek)=>({dayOfWeek,startTime:"10:00",endTime:"19:00",isWorking:true})),location.id]);
 const payload={name:service.name,duration:30,price:1000,optionCategories:service.optionCategories,expectedCatalogVersion:service.catalogVersion};
 const edits=await Promise.all(["A","B"].map(suffix=>call(`/api/dashboard/services/${service.id}`,{...payload,description:suffix},"PUT")));
 check("Two HTTP catalog edits yield one winner and one stale 409",JSON.stringify(edits.map(r=>r.response.status).sort())==="[200,409]");service=edits.find(r=>r.response.status===200).body;
 check("HTTP edits preserve category and alternative identifiers",service.optionCategories[0].id===categoryId&&service.optionCategories[0].alternatives[0].id===alternativeId);
 const date=new Date(Date.now()+6*86400000).toISOString().slice(0,10);
 const available=await call("/api/dashboard/availability",{mode:"services",locationId:location.id,serviceIds:[service.id],staffId:staff.id,selectedOptionAlternativeIds:[alternativeId],fromDate:date,days:1});assert.equal(available.response.status,200);const slot=available.body.days[0].slots[0];assert(slot);
 const appointmentPayload={serviceId:service.id,staffId:staff.id,locationId:location.id,startTime:slot.startTime,customerName:"Cliente Auditoría",customerEmail:"audit03-client@rc.example.invalid",selectedOptionAlternativeIds:[alternativeId],sendConfirmation:false};
 const booked=await call("/api/dashboard/appointments",appointmentPayload);assert.equal(booked.response.status,201);const appointment=booked.body;
 const blocked=await action("deleteStaffAction",[staff.id]);check("HTTP deactivation reports one future booking and preserves its professional",blocked.error?.includes("1 reserva(s)")&&(await db.staff.findUniqueOrThrow({where:{id:staff.id}})).isActive);
 const before=await db.appointment.findUniqueOrThrow({where:{id:appointment.id}});
 const archived=await call(`/api/dashboard/services/${service.id}`,undefined,"DELETE");assert.equal(archived.response.status,200);
 check("HTTP archival preserves the complete existing reservation",JSON.stringify(await db.appointment.findUniqueOrThrow({where:{id:appointment.id}}))===JSON.stringify(before));
 const internal=await call("/api/dashboard/services");const external=await call(`/api/business/${business.slug}/services`);
 check("Archived service remains in dashboard and disappears from the public catalog",internal.body.some(s=>s.id===service.id&&!s.isActive)&&!external.body.some(s=>s.id===service.id));
 const direct=await call(`/api/business/${business.slug}/book`,{...appointmentPayload,customerPhone:"+56911111111",customerAddress:"Dirección sintética",endTime:appointment.endTime},"POST",{"x-api-key":business.apiKey,"Idempotency-Key":randomUUID()});
 check("Direct HTTP booking cannot use an archived service",direct.response.status>=400&&direct.response.status<500);
 const restored=await call(`/api/dashboard/services/${service.id}`,{isActive:true},"PATCH");assert.equal(restored.response.status,200);service=await db.service.findUniqueOrThrow({where:{id:service.id}});
 check("HTTP restoration makes the service bookable again",(await call(`/api/business/${business.slug}/services` )).body.some(s=>s.id===service.id));
 const retired=await call(`/api/dashboard/services/${service.id}`,{name:service.name,duration:60,price:9000,optionCategories:[],expectedCatalogVersion:service.catalogVersion},"PUT");assert.equal(retired.response.status,200);
 const moved=await call(`/api/dashboard/appointments/${appointment.id}`,{...appointmentPayload,startTime:new Date(new Date(appointment.startTime).getTime()+3600000).toISOString(),expectedUpdatedAt:appointment.updatedAt},"PUT");
 check("HTTP rescheduling with retired home option keeps contracted price, duration and snapshots",moved.response.status===200&&moved.body.totalPrice===appointment.totalPrice&&moved.body.totalDuration===appointment.totalDuration&&JSON.stringify(moved.body.selectedOptions)===JSON.stringify(appointment.selectedOptions));
 // Fixture state transition only; no provider payment or calendar operation.
 await db.appointment.update({where:{id:appointment.id},data:{status:"COMPLETED"}});
 const deactivated=await action("deleteStaffAction",[staff.id]);check("HTTP deactivation preserves identity and historical assignment",deactivated.success&&(await db.appointment.findUniqueOrThrow({where:{id:appointment.id}})).staffId===staff.id&&!(await db.staff.findUniqueOrThrow({where:{id:staff.id}})).isActive);
 const reactivated=await action("toggleStaffActiveAction",[staff.id]);check("HTTP reactivation retains schedules and assignments within capacity",reactivated.success&&(await db.staffSchedule.count({where:{staffId:staff.id}}))===7);
 const foreign=await db.service.findFirst({where:{businessId:{not:business.id}}});if(foreign)check("HTTP rejects another tenant's service",(await call(`/api/dashboard/services/${foreign.id}`,undefined,"DELETE")).response.status===404);
 fs.mkdirSync("scratch/audit-03",{recursive:true});fs.writeFileSync("scratch/audit-03/http-services-staff.json",JSON.stringify({checks,passed:checks.length,externalProviderIO:false},null,2));
}finally{await db.$disconnect();}
