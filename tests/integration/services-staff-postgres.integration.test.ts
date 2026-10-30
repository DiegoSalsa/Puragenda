import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: async () => ({ id: "audit03-owner", role: "ADMIN" }), getApiSessionUser: async () => ({ id: "audit03-owner", role: "ADMIN" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/email/send", () => ({ sendStaffInviteEmail: vi.fn().mockResolvedValue(undefined) }));
import { NextRequest } from "next/server";
import type { AppointmentStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createService, updateService, deleteService, getServiceByIdAndBusiness, setServiceActive } from "@/server/services/service.service";
import { createStaffAction, deleteStaffAction, toggleStaffActiveAction } from "@/server/actions/dashboard.actions";
import { loadBookingContext, toBookingCatalog } from "@/server/booking/read.service";
import { getBusinessForUser } from "@/server/services/business.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { canManageGoogleConnection } from "@/server/services/google-calendar-access.service";
import { getGoogleCalendarBusySlots } from "@/server/services/google-calendar.service";
import { resolveManagedAppointment, validateAppointmentReschedule } from "@/server/services/appointment-management.service";
import { DELETE, PATCH, PUT } from "@/app/api/dashboard/services/[id]/route";
import { issueManualGiftCard } from "@/server/services/gift-card.service";
import { createRegistrationContract } from "@/server/services/commercial-trial.service";

const raw=process.env.COMMERCIAL_V2_TEST_DATABASE_URL;
const enabled=!!raw && ["127.0.0.1","localhost"].includes(new URL(raw).hostname) && /^\/puragenda_commercial_test_[a-z0-9]+$/.test(new URL(raw).pathname);
const businessId="audit03-business";
async function catalog(){return createService({businessId,name:"Original",description:"",duration:30,price:100,optionCategories:[{name:"Tipo",isRequired:false,maxSelections:1,alternatives:[{name:"A",priceDelta:10,durationDelta:5,isHomeService:false}]}]});}
describe.skipIf(!enabled)("audit 03 services and staff with PostgreSQL",()=>{
 beforeEach(async()=>{
  await prisma.business.deleteMany({where:{id:{in:[businessId,"audit03-other"]}}});
  await prisma.user.deleteMany({where:{email:{endsWith:"@audit03.invalid"}}});
  await prisma.user.upsert({where:{id:"audit03-owner"},update:{},create:{id:"audit03-owner",email:"owner@audit03.invalid",name:"Owner",password:"disabled",role:"ADMIN"}});
  await prisma.business.create({data:{id:businessId,ownerId:"audit03-owner",slug:"audit03",name:"Audit",timezone:"UTC",allowSameDayBookings:true,apiKey:"synthetic-audit03",subscription:{create:{plan:"EQUIPO",status:"ACTIVE"}},locations:{create:{id:"audit03-location",slug:"principal",name:"Principal",timezone:"UTC",isActive:true}}}});
  await prisma.locationHours.createMany({data:Array.from({length:7},(_,dayOfWeek)=>({locationId:"audit03-location",dayOfWeek,startTime:"09:00",endTime:"18:00",isOpen:true}))});
 });
 afterAll(async()=>{await prisma.business.deleteMany({where:{id:{in:[businessId,"audit03-other"]}}});await prisma.user.deleteMany({where:{email:{endsWith:"@audit03.invalid"}}});await prisma.$disconnect();});
 it("archives a service without losing completed appointments and client references",async()=>{
  const s=await catalog();const c=await prisma.client.create({data:{businessId,name:"Client",email:"client@audit03.invalid"}});
  const a=await prisma.appointment.create({data:{businessId,serviceId:s.id,clientId:c.id,customerName:"Client",customerEmail:c.email,startTime:new Date("2026-01-01T10:00Z"),endTime:new Date("2026-01-01T10:30Z"),status:"COMPLETED",totalPrice:110,depositAmount:30,paymentStatus:"APPROVED",mpPaymentId:"synthetic-payment",mpPreferenceId:"synthetic-preference",depositReceiptPublicId:"synthetic-receipt",depositReceiptOriginalName:"comprobante.pdf"}});
  await deleteService(s.id,businessId);
  expect(await prisma.appointment.findUnique({where:{id:a.id}})).toMatchObject({serviceId:s.id,clientId:c.id,totalPrice:110,depositAmount:30,paymentStatus:"APPROVED"});
  expect(await prisma.appointment.findUnique({where:{id:a.id}})).toEqual(a);
  expect(await prisma.client.findUnique({where:{id:c.id}})).toEqual(c);
  expect((await prisma.appointment.aggregate({where:{businessId,status:"COMPLETED"},_sum:{totalPrice:true,depositAmount:true}}))._sum).toEqual({totalPrice:110,depositAmount:30});
  expect(await getServiceByIdAndBusiness(s.id,businessId)).toMatchObject({isActive:false});
 });
 it("preserves category and alternative IDs through a name edit",async()=>{
  const s=await catalog();const edited=await updateService(s.id,{name:"Renamed",optionCategories:s.optionCategories},businessId,0);
  expect(edited.optionCategories[0].id).toBe(s.optionCategories[0].id);expect(edited.optionCategories[0].alternatives[0].id).toBe(s.optionCategories[0].alternatives[0].id);
 });
 it("deactivates staff preserving identity, schedule and historical assignment",async()=>{
  const s=await catalog();const staff=await prisma.staff.create({data:{businessId,name:"Professional",schedule:{create:{dayOfWeek:1,startTime:"09:00",endTime:"17:00"}}}});
  const a=await prisma.appointment.create({data:{businessId,serviceId:s.id,staffId:staff.id,customerName:"Client",customerEmail:"client@audit03.invalid",startTime:new Date("2026-01-01T10:00Z"),endTime:new Date("2026-01-01T10:30Z"),status:"COMPLETED"}});
  expect(await deleteStaffAction(staff.id)).toMatchObject({success:true});
  expect(await prisma.staff.findUnique({where:{id:staff.id}})).toMatchObject({isActive:false,name:"Professional"});expect((await prisma.appointment.findUniqueOrThrow({where:{id:a.id}})).staffId).toBe(staff.id);expect(await prisma.staffSchedule.count({where:{staffId:staff.id}})).toBe(1);
 });
 it("assigns the sole active branch atomically on creation",async()=>{
  expect(await createStaffAction({name:"New",email:"new@audit03.invalid"})).toMatchObject({success:true});
  const s=await prisma.staff.findFirstOrThrow({where:{businessId,email:"new@audit03.invalid"},include:{locations:{include:{schedule:true}}}});
  expect(s.locations).toHaveLength(1);expect(s.locations[0].locationId).toBe("audit03-location");
 });
 it("keeps future appointments untouched and excludes archived services from public, website and MCP shared catalogs",async()=>{
  const service=await catalog();const a=await futureAppointment(service.id);await deleteService(service.id,businessId);
  expect(await prisma.appointment.findUnique({where:{id:a.id}})).toEqual(a);
  expect(toBookingCatalog(await loadBookingContext(businessId)).services).toEqual([]);
  await setServiceActive(service.id,businessId,true);expect(toBookingCatalog(await loadBookingContext(businessId)).services.map(s=>s.id)).toContain(service.id);
 });
 it("refuses physical deletion before cascades even for a service with no restrictive dependents",async()=>{
  const s=await catalog();await expect(prisma.service.delete({where:{id:s.id}})).rejects.toThrow("CATALOG_HISTORY_REQUIRES_ARCHIVAL");
  expect(await getServiceByIdAndBusiness(s.id,businessId)).not.toBeNull();
 });
 it("blocks new appointments, secondary services and recurring contracts after archival",async()=>{
  const s=await catalog(),other=await catalog();await deleteService(s.id,businessId);
  await expect(futureAppointment(s.id)).rejects.toThrow("SERVICE_NOT_BOOKABLE");
  await expect(futureAppointment(other.id,undefined,[s.id])).rejects.toThrow("SERVICE_NOT_BOOKABLE");
  const plan=await prisma.recurringPlan.create({data:{serviceId:s.id}});
  await expect(prisma.recurringBooking.create({data:{businessId,serviceId:s.id,recurringPlanId:plan.id,customerName:"C",customerEmail:"c@audit03.invalid",selectedDays:[1],selectedTimes:{"1":"10:00"},startDate:new Date(),endDate:new Date(Date.now()+86400000),durationMonths:1}})).rejects.toThrow("SERVICE_NOT_BOOKABLE");
 });
 it("preserves recurring contracts and allows sessions contracted before archival",async()=>{
  const s=await catalog();const plan=await prisma.recurringPlan.create({data:{serviceId:s.id}});
  const recurring=await prisma.recurringBooking.create({data:{businessId,serviceId:s.id,recurringPlanId:plan.id,customerName:"C",customerEmail:"c@audit03.invalid",selectedDays:[1],selectedTimes:{"1":"10:00"},startDate:new Date(),endDate:new Date(Date.now()+86400000),durationMonths:1,status:"ACTIVE"}});
  await deleteService(s.id,businessId);
  expect(await prisma.recurringBooking.findUnique({where:{id:recurring.id}})).toEqual(recurring);
  await expect(prisma.appointment.create({data:{businessId,serviceId:s.id,recurringBookingId:recurring.id,customerName:"C",customerEmail:"c@audit03.invalid",startTime:tomorrow(),endTime:new Date(tomorrow().getTime()+1800000)}})).resolves.toBeTruthy();
 });
 it("keeps production order snapshots and rejects new orders for an archived service",async()=>{
  const s=await catalog();const data={businessId,serviceId:s.id,orderNumber:"AUDIT03-1",customerName:"C",customerEmail:"c@audit03.invalid",customerPhone:"123456789",petName:"P",petDetails:"D",productionWeek:tomorrow(),totalPrice:110,depositAmount:30,balanceAmount:80};
  const order=await prisma.productionOrder.create({data});await deleteService(s.id,businessId);
  expect(await prisma.productionOrder.findUnique({where:{id:order.id}})).toEqual(order);
  await expect(prisma.productionOrder.create({data:{...data,orderNumber:"AUDIT03-2"}})).rejects.toThrow("SERVICE_NOT_BOOKABLE");
 });
 it("serializes archival against an uncommitted booking without deleting the winning reservation",async()=>{
  const s=await catalog();let release!:()=>void,inserted!:()=>void;const barrier=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>inserted=r);
  const booking=prisma.$transaction(async tx=>{const a=await tx.appointment.create({data:{businessId,serviceId:s.id,customerName:"C",customerEmail:"c@audit03.invalid",startTime:tomorrow(),endTime:new Date(tomorrow().getTime()+1800000)}});inserted();await barrier;return a;});
  await ready;const archival=deleteService(s.id,businessId);release();const [a]=await Promise.all([booking,archival]);
  expect(await prisma.appointment.findUnique({where:{id:a.id}})).not.toBeNull();await expect(futureAppointment(s.id,undefined,[],60)).rejects.toThrow("SERVICE_NOT_BOOKABLE");
 });
 it("rejects cross-business archive, restoration and option edits without mutating the catalog",async()=>{
  const s=await catalog();await expect(deleteService(s.id,"other")).rejects.toThrow();await expect(setServiceActive(s.id,"other",true)).rejects.toThrow();await expect(updateService(s.id,{name:"Tampered"},"other",0)).rejects.toThrow("no encontrado");
  expect((await getServiceByIdAndBusiness(s.id,businessId))?.name).toBe("Original");
 });
 it("preserves IDs, option timestamps and snapshots on price-only changes",async()=>{
  const s=await catalog();const a=await futureAppointment(s.id);await prisma.appointment.update({where:{id:a.id},data:{selectedOptions:[{alternativeId:s.optionCategories[0].alternatives[0].id,alternativeName:"A",priceDelta:10,durationDelta:5}]}});
  const edited=await updateService(s.id,{price:500,optionCategories:s.optionCategories},businessId,0);
  expect(edited.optionCategories).toEqual(s.optionCategories);expect((await prisma.appointment.findUniqueOrThrow({where:{id:a.id}})).selectedOptions).toMatchObject([{alternativeName:"A",priceDelta:10}]);
 });
 it("edits an existing option, adds a new ID and retires removed alternatives without deleting rows",async()=>{
  const s=await catalog(),c=s.optionCategories[0],old=c.alternatives[0];
  const added=await updateService(s.id,{optionCategories:[{...c,alternatives:[{...old,name:"Updated",priceDelta:20},{name:"B",priceDelta:0,durationDelta:0,isHomeService:false}]}]},businessId,0);
  expect(added.optionCategories[0].alternatives[0].id).toBe(old.id);const newId=added.optionCategories[0].alternatives[1].id;expect(newId).not.toBe(old.id);
  const retired=await updateService(s.id,{optionCategories:[{...c,alternatives:[added.optionCategories[0].alternatives[1]]}]},businessId,1);
  expect(retired.optionCategories[0].alternatives.map(a=>a.id)).toEqual([newId]);expect(await prisma.serviceOptionAlternative.findUnique({where:{id:old.id}})).toMatchObject({isActive:false,name:"Updated"});
  await expect(updateService(s.id,{optionCategories:[{...c,alternatives:[old]}]},businessId,2)).rejects.toThrow("inválida o retirada");
 });
 it("reorders categories while preserving identities and rejects unknown, duplicate or moved identifiers",async()=>{
  const s=await catalog(),c=s.optionCategories[0];const changed=await updateService(s.id,{optionCategories:[{name:"New",isRequired:false,maxSelections:1,alternatives:[{name:"B",priceDelta:0,durationDelta:0,isHomeService:false}]},c]},businessId,0);
  expect(changed.optionCategories[1].id).toBe(c.id);
  await expect(updateService(s.id,{optionCategories:[{...c,id:"foreign"}]},businessId,1)).rejects.toThrow("Categoría inválida");
  await expect(updateService(s.id,{optionCategories:[c,c]},businessId,1)).rejects.toThrow("Categoría inválida");
  await expect(updateService(s.id,{optionCategories:[{...changed.optionCategories[0],alternatives:c.alternatives}]},businessId,1)).rejects.toThrow("Alternativa inválida");
  await expect(createService({businessId,name:"Copy",description:"",price:1,duration:30,optionCategories:[c]})).rejects.toThrow("reutilizar");
 });
 it("allows exactly one of two stale simultaneous catalog edits",async()=>{
  const s=await catalog();const r=await Promise.allSettled(["One","Two"].map(name=>updateService(s.id,{name,optionCategories:s.optionCategories},businessId,0)));
  expect(r.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(r.filter(r=>r.status==="rejected")).toHaveLength(1);expect((await getServiceByIdAndBusiness(s.id,businessId))?.catalogVersion).toBe(1);
 });
 it("blocks staff deactivation with future appointments and keeps all assignments",async()=>{
  const s=await catalog(),staff=await prisma.staff.create({data:{businessId,name:"Future"}});const a=await futureAppointment(s.id,staff.id);
  expect(await deleteStaffAction(staff.id)).toMatchObject({error:expect.stringContaining("1 reserva(s)")});expect((await prisma.staff.findUniqueOrThrow({where:{id:staff.id}})).isActive).toBe(true);expect((await prisma.appointment.findUniqueOrThrow({where:{id:a.id}})).staffId).toBe(staff.id);
  expect(await toggleStaffActiveAction(staff.id)).toHaveProperty("error");
 });
 it("serializes staff deactivation against an uncommitted future booking",async()=>{
  const s=await catalog(),staff=await prisma.staff.create({data:{businessId,name:"Race"}});let release!:()=>void,inserted!:()=>void;const barrier=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>inserted=r);
  const booking=prisma.$transaction(async tx=>{await tx.appointment.create({data:{businessId,serviceId:s.id,staffId:staff.id,customerName:"C",customerEmail:"c@audit03.invalid",startTime:tomorrow(),endTime:new Date(tomorrow().getTime()+1800000)}});inserted();await barrier;});
  await ready;const change=deleteStaffAction(staff.id);release();const [,r]=await Promise.all([booking,change]);expect(r).toHaveProperty("error");expect((await prisma.staff.findUniqueOrThrow({where:{id:staff.id}})).isActive).toBe(true);
 });
 it("preserves associated accounts and Calendar links while revoking membership access",async()=>{
  const user=await prisma.user.create({data:{email:"member@audit03.invalid",name:"Member",password:"disabled",role:"ADMIN"}});
  const staff=await prisma.staff.create({data:{businessId,name:"Member",userId:user.id}});
  const connection=await prisma.googleCalendarConnection.create({data:{businessId,staffId:staff.id,userId:user.id,scope:"STAFF",scopeKey:`staff:${staff.id}`,googleEmail:user.email,accessTokenEncrypted:"synthetic-disabled"}});
  await deleteStaffAction(staff.id);expect(await prisma.googleCalendarConnection.findUnique({where:{id:connection.id}})).toEqual(connection);expect(await prisma.user.findUnique({where:{id:user.id}})).toEqual(user);
  expect(await getBusinessForUser(user.id)).toBeNull();expect(await getEffectiveBusinessPermissions(user,{id:businessId,ownerId:"audit03-owner"})).toEqual([]);
  expect(await canManageGoogleConnection(user,{id:businessId,ownerId:"audit03-owner"},connection)).toBe(false);expect(await getGoogleCalendarBusySlots(staff.id,tomorrow(),new Date(tomorrow().getTime()+1800000),businessId)).toEqual([]);
  await toggleStaffActiveAction(staff.id);expect(await getBusinessForUser(user.id)).toMatchObject({id:businessId});
 });
 it.each(["PURAGENDA","PURAGENDA_PLUS"] as const)("honors %s capacity with two simultaneous activations for one seat",async plan=>{
  await prisma.subscription.delete({where:{businessId}});await prisma.$transaction(tx=>createRegistrationContract(tx,{businessId,plan,professionalTotal:1,billingCycle:"MONTHLY",trialEligible:true}));
  const a=await prisma.staff.create({data:{businessId,name:"A",isActive:false}}),b=await prisma.staff.create({data:{businessId,name:"B",isActive:false}});
  const r=await Promise.all([toggleStaffActiveAction(a.id),toggleStaffActiveAction(b.id)]);expect(r.filter(r=>"success" in r)).toHaveLength(1);expect(r.filter(r=>"error" in r)).toHaveLength(1);expect(await prisma.staff.count({where:{businessId,isActive:true}})).toBe(1);
 });
 it("does not reactivate staff from another business",async()=>{expect(await toggleStaffActiveAction("foreign-staff")).toHaveProperty("error");});
 it("creates multiple branch assignments once, starts with closed schedules and rolls back invalid branches",async()=>{
  await prisma.businessLocation.create({data:{id:"audit03-second",businessId,name:"Second",slug:"second",timezone:"UTC",isActive:true}});
  expect(await createStaffAction({name:"Missing",email:"missing@audit03.invalid"})).toHaveProperty("error");
  expect(await createStaffAction({name:"Wrong",email:"wrong@audit03.invalid",locationIds:["foreign"]})).toHaveProperty("error");
  expect(await prisma.user.findUnique({where:{email:"wrong@audit03.invalid"}})).toBeNull();
  expect(await createStaffAction({name:"Multi",email:"multi@audit03.invalid",locationIds:["audit03-location","audit03-second","audit03-second"]})).toMatchObject({success:true});
  const staff=await prisma.staff.findFirstOrThrow({where:{businessId,email:"multi@audit03.invalid"},include:{locations:true,schedule:true}});expect(staff.locations).toHaveLength(2);expect(staff.schedule).toHaveLength(7);expect(staff.schedule.every(d=>!d.isWorking)).toBe(true);
 });
 it("keeps zero-location legacy creation and rejects inactive locations without orphan accounts",async()=>{
  await prisma.businessLocation.update({where:{id:"audit03-location"},data:{isActive:false}});expect(await createStaffAction({name:"Inactive",email:"inactive@audit03.invalid",locationIds:["audit03-location"]})).toHaveProperty("error");expect(await prisma.user.findUnique({where:{email:"inactive@audit03.invalid"}})).toBeNull();
  await prisma.businessLocation.deleteMany({where:{businessId}});expect(await createStaffAction({name:"Legacy",email:"legacy@audit03.invalid"})).toMatchObject({success:true});
 });
 it("runs real service HTTP handlers with tenant scope, stale edit conflict, archival and restore",async()=>{
  const s=await catalog();expect((await DELETE(req("DELETE"),ctx(s.id))).status).toBe(200);expect((await PATCH(req("PATCH",{isActive:true}),ctx(s.id))).status).toBe(200);
  const body={name:"Changed",price:200,duration:30,optionCategories:s.optionCategories,expectedCatalogVersion:0};expect((await PUT(req("PUT",body),ctx(s.id))).status).toBe(409);
  expect((await PUT(req("PUT",{...body,expectedCatalogVersion:2}),ctx(s.id))).status).toBe(200);expect((await DELETE(req("DELETE"),ctx("foreign"))).status).toBe(404);
 });

 it("preserves purchased service gift cards, entitlement IDs and template snapshots",async()=>{
  const s=await catalog();const template=await prisma.giftCardTemplate.create({data:{businessId,name:"Gift",type:"SERVICE",salePrice:100,currencyCode:"CLP",services:{create:{serviceId:s.id,quantity:2}}}});
  await issueManualGiftCard({businessId,templateId:template.id,paymentMethod:"MANUAL",buyerName:"C",buyerEmail:"c@audit03.invalid",deliveryMode:"SELF"});
  const before=await Promise.all([prisma.giftCardPurchase.findMany({where:{businessId}}),prisma.giftCardServiceEntitlement.findMany({where:{giftCard:{businessId}}})]);
  await deleteService(s.id,businessId);expect(await Promise.all([prisma.giftCardPurchase.findMany({where:{businessId}}),prisma.giftCardServiceEntitlement.findMany({where:{giftCard:{businessId}}})])).toEqual(before);
  await expect(issueManualGiftCard({businessId,templateId:template.id,paymentMethod:"MANUAL",buyerName:"C",buyerEmail:"c@audit03.invalid",deliveryMode:"SELF"})).rejects.toThrow("archivado");
 });
 it("rejects IDs of categories and alternatives belonging to another tenant",async()=>{
  const s=await catalog();await prisma.business.create({data:{id:"audit03-other",name:"Other",slug:"audit03-other",apiKey:"synthetic-other"}});
  const foreign=await createService({businessId:"audit03-other",name:"Other",description:"",duration:30,price:10,optionCategories:[{name:"Foreign",isRequired:false,maxSelections:1,alternatives:[{name:"Foreign",priceDelta:0,durationDelta:0,isHomeService:false}]}]});
  await expect(updateService(s.id,{optionCategories:foreign.optionCategories},businessId,0)).rejects.toThrow("Categoría inválida");
  await expect(updateService(s.id,{optionCategories:[{...s.optionCategories[0],alternatives:foreign.optionCategories[0].alternatives}]},businessId,0)).rejects.toThrow("Alternativa inválida");
  expect(await createStaffAction({name:"Foreign",email:"foreign@audit03.invalid",locationIds:["other-location"]})).toHaveProperty("error");
 });
 it("keeps existing options on a name-only edit and retires a removed category without deleting its options",async()=>{
  const s=await catalog();const renamed=await updateService(s.id,{name:"Renamed"},businessId,0);expect(renamed.optionCategories).toEqual(s.optionCategories);
  await updateService(s.id,{optionCategories:[]},businessId,1);expect(await prisma.serviceOptionCategory.findUnique({where:{id:s.optionCategories[0].id}})).toMatchObject({isActive:false});expect(await prisma.serviceOptionAlternative.findUnique({where:{id:s.optionCategories[0].alternatives[0].id}})).toMatchObject({isActive:false});
  await expect(updateService(s.id,{optionCategories:s.optionCategories},businessId,2)).rejects.toThrow("retirada");
 });
 it("keeps contracted totals, home options and discounts when moving a booking after option retirement",async()=>{
  const s=await catalog();const staff=await prisma.staff.create({data:{businessId,name:"Mover",locations:{create:{locationId:"audit03-location"}},schedule:{create:Array.from({length:7},(_,dayOfWeek)=>({dayOfWeek,startTime:"09:00",endTime:"18:00",isWorking:true}))}}});
  const alt=s.optionCategories[0].alternatives[0];const snapshot=[{serviceId:s.id,serviceName:s.name,categoryId:s.optionCategories[0].id,categoryName:"Tipo",alternativeId:alt.id,alternativeName:"Originally contracted",priceDelta:10,durationDelta:5,isHomeService:true}];
  const a=await prisma.appointment.create({data:{businessId,serviceId:s.id,staffId:staff.id,locationId:"audit03-location",customerName:"C",customerEmail:"c@audit03.invalid",startTime:tomorrow(),endTime:new Date(tomorrow().getTime()+2100000),totalDuration:35,totalPrice:90,originalTotalPrice:110,discountAmount:20,selectedOptions:snapshot}});
  await updateService(s.id,{price:900,duration:60,optionCategories:[]},businessId,0);await deleteService(s.id,businessId);const start=new Date(tomorrow().getTime()+3600000),end=new Date(start.getTime()+2100000);
  await expect(validateAppointmentReschedule({...a,service:s},start,end,"audit03-location",prisma,false)).resolves.toBeUndefined();
  const moved=await resolveManagedAppointment({id:businessId,timezone:"UTC"},{serviceId:s.id,staffId:staff.id,locationId:"audit03-location",startTime:start.toISOString(),selectedOptionAlternativeIds:[alt.id],customerName:"Client",customerEmail:"c@audit03.invalid",customerPhone:"",internalNotes:"",sendConfirmation:false},a.id);
  expect(moved).toMatchObject({value:{totalPrice:90,totalDuration:35,selectedOptions:snapshot,preserveContract:true}});
  expect(await prisma.appointment.findUnique({where:{id:a.id}})).toEqual(a);
 });
 it("blocks staff with a live recurring contract even if future sessions are not yet materialized",async()=>{
  const s=await catalog(),staff=await prisma.staff.create({data:{businessId,name:"Recurring"}}),plan=await prisma.recurringPlan.create({data:{serviceId:s.id}});
  await prisma.recurringBooking.create({data:{businessId,serviceId:s.id,staffId:staff.id,recurringPlanId:plan.id,customerName:"C",customerEmail:"c@audit03.invalid",selectedDays:[1],selectedTimes:{"1":"10:00"},startDate:new Date(),endDate:new Date(Date.now()+86400000),durationMonths:1,status:"PAUSED"}});
  expect(await deleteStaffAction(staff.id)).toMatchObject({error:expect.stringContaining("1 plan(es)")});
 });
 it("respects a pending contracted seat reduction when reactivating",async()=>{
  await prisma.subscription.delete({where:{businessId}});const contract=await prisma.$transaction(tx=>createRegistrationContract(tx,{businessId,plan:"PURAGENDA_PLUS",professionalTotal:2,billingCycle:"MONTHLY",trialEligible:true}));
  await prisma.staff.create({data:{businessId,name:"Active"}});const inactive=await prisma.staff.create({data:{businessId,name:"Inactive",isActive:false}});
  await prisma.commercialBillingOperation.create({data:{businessId,subscriptionId:contract.id,provider:"NONE",environment:"V2_SANDBOX",kind:"CONTRACT_CHANGE",strategy:"NEXT_RENEWAL",status:"SCHEDULED",idempotencyKey:"audit03-reduction",inputHash:"synthetic",previousContractHash:"synthetic",targetPlanCode:"PURAGENDA_PLUS",targetProfessionalTotal:1,quoteSnapshot:{},recurringAmountMinor:1,effectiveAt:tomorrow()}});
  expect(await toggleStaffActiveAction(inactive.id)).toMatchObject({error:expect.stringContaining("límite de 1")});
 });
 it("rolls back user, professional and schedules if a branch assignment fails late in creation",async()=>{
  await prisma.$executeRawUnsafe(`CREATE FUNCTION audit03_reject_location() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic assignment failure'; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER audit03_reject_location BEFORE INSERT ON "StaffLocation" FOR EACH ROW EXECUTE FUNCTION audit03_reject_location()`);
  try { expect(await createStaffAction({name:"Rollback",email:"rollback@audit03.invalid"})).toHaveProperty("error");expect(await prisma.user.findUnique({where:{email:"rollback@audit03.invalid"}})).toBeNull();expect(await prisma.staff.count({where:{businessId}})).toBe(0); }
  finally {await prisma.$executeRawUnsafe(`DROP TRIGGER audit03_reject_location ON "StaffLocation"`);await prisma.$executeRawUnsafe(`DROP FUNCTION audit03_reject_location()`);}
 });

 it("reactivation is idempotent when two tabs activate the same inactive professional",async()=>{
  const staff=await prisma.staff.create({data:{businessId,name:"Same",isActive:false}});
  const r=await Promise.all([toggleStaffActiveAction(staff.id,true),toggleStaffActiveAction(staff.id,true)]);
  expect(r.every(r=>"success" in r)).toBe(true);expect((await prisma.staff.findUniqueOrThrow({where:{id:staff.id}})).isActive).toBe(true);
 });
 it("revokes one membership while preserving the same user's active access in another business",async()=>{
  const user=await prisma.user.create({data:{email:"shared@audit03.invalid",name:"Shared",password:"disabled",role:"ADMIN"}});
  const staff=await prisma.staff.create({data:{businessId,name:"Shared",userId:user.id}});
  await prisma.business.create({data:{id:"audit03-other",name:"Other",slug:"audit03-other",apiKey:"synthetic-other",staff:{create:{name:"Shared",userId:user.id}}}});
  await deleteStaffAction(staff.id);expect(await getBusinessForUser(user.id)).toMatchObject({id:"audit03-other"});expect(await getEffectiveBusinessPermissions(user,{id:businessId,ownerId:"audit03-owner"})).toEqual([]);expect((await getEffectiveBusinessPermissions(user,{id:"audit03-other",ownerId:null})).length).toBeGreaterThan(0);
 });

 it.each((["delete", "toggle"] as const).flatMap(action => (["NONE", "APPROVED", "REJECTED"] as const).map(paymentStatus => ({ action, paymentStatus }))))("blocks deactivation of a current CHECKED_IN session via $action with payment $paymentStatus", async ({ action, paymentStatus }) => {
  const { staff, appointment } = await staffSession("CHECKED_IN", 20 * 60_000, paymentStatus);
  const result = action === "delete" ? await deleteStaffAction(staff.id) : await toggleStaffActiveAction(staff.id, false);
  expect(result).toMatchObject({ error: expect.stringContaining("1 reserva(s)") });
  expect((await prisma.staff.findUniqueOrThrow({ where: { id: staff.id } })).isActive).toBe(true);
  expect(await prisma.appointment.findUnique({ where: { id: appointment.id } })).toEqual(appointment);
 });
 it.each((["COMPLETED", "NO_SHOW", "CANCELLED"] as const).flatMap(status => ["historical", "current interval"].map(interval => ({ status, interval }))))("allows deactivation with $status in a $interval without changing the appointment", async ({ status, interval }) => {
  const { staff, appointment } = await staffSession(status, interval === "historical" ? -60_000 : 20 * 60_000);
  expect(await deleteStaffAction(staff.id)).toMatchObject({ success: true });
  expect((await prisma.staff.findUniqueOrThrow({ where: { id: staff.id } })).isActive).toBe(false);
  expect(await prisma.appointment.findUnique({ where: { id: appointment.id } })).toEqual(appointment);
 });
 it("does not block deactivation for an elapsed CHECKED_IN session", async () => {
  const { staff, appointment } = await staffSession("CHECKED_IN", -60_000);
  expect(await deleteStaffAction(staff.id)).toMatchObject({ success: true });
  expect(await prisma.appointment.findUnique({ where: { id: appointment.id } })).toEqual(appointment);
 });
 it("keeps the legacy exclusion of rejected pending bookings", async () => {
  const { staff, appointment } = await staffSession("PENDING", 20 * 60_000, "REJECTED");
  expect(await deleteStaffAction(staff.id)).toMatchObject({ success: true });
  expect(await prisma.appointment.findUnique({ where: { id: appointment.id } })).toEqual(appointment);
 });
 it.each([
  { before: "CONFIRMED", after: "CHECKED_IN" },
  { before: "CHECKED_IN", after: "COMPLETED" },
 ] as const)("protects deactivation while an uncommitted $before -> $after transition is in progress", async ({ before, after }) => {
  const { staff, appointment } = await staffSession(before);
  let release!: () => void, updated!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const ready = new Promise<void>(resolve => { updated = resolve; });
  const transition = prisma.$transaction(async tx => {
    const changed = await tx.appointment.update({ where: { id: appointment.id }, data: { status: after } });
    updated(); await barrier; return changed;
  });
  try {
    await Promise.race([ready, transition]);
    expect(await deleteStaffAction(staff.id)).toMatchObject({ error: expect.stringContaining("1 reserva(s)") });
    expect((await prisma.staff.findUniqueOrThrow({ where: { id: staff.id } })).isActive).toBe(true);
    expect(await prisma.appointment.findUnique({ where: { id: appointment.id } })).toEqual(appointment);
  } finally { release(); await transition; }
  const changed = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
  expect(changed).toEqual({ ...appointment, status: after, updatedAt: changed.updatedAt });
  expect(await deleteStaffAction(staff.id)).toMatchObject(after === "COMPLETED" ? { success: true } : { error: expect.stringContaining("1 reserva(s)") });
  expect(await prisma.appointment.findUnique({ where: { id: appointment.id } })).toEqual(changed);
 });

});

function tomorrow(){const d=new Date(Date.now()+86400000);d.setUTCHours(10,0,0,0);return d;}
async function futureAppointment(serviceId:string,staffId?:string,additionalServiceIds:string[]=[],offsetMinutes=0){const start=new Date(tomorrow().getTime()+offsetMinutes*60000);return prisma.appointment.create({data:{businessId,serviceId,staffId,additionalServiceIds,locationId:"audit03-location",customerName:"C",customerEmail:"c@audit03.invalid",startTime:start,endTime:new Date(start.getTime()+1800000),totalDuration:30,totalPrice:100}});}
function req(method:string,body?:object){return new NextRequest("http://localhost/api/dashboard/services/fixture",{method,...(body?{headers:{"content-type":"application/json"},body:JSON.stringify(body)}:{})});}
function ctx(id:string){return {params:Promise.resolve({id})};}

async function staffSession(status: AppointmentStatus, endOffset = 20 * 60_000, paymentStatus: PaymentStatus = "NONE") {
 const service = await catalog();
 const staff = await prisma.staff.create({ data: { businessId, name: "Session professional" } });
 const now = Date.now();
 const appointment = await prisma.appointment.create({ data: { businessId, serviceId: service.id, staffId: staff.id, customerName: "Session Client", customerEmail: "session@audit03.invalid", startTime: new Date(now + Math.min(-10 * 60_000, endOffset - 30 * 60_000)), endTime: new Date(now + endOffset), status, paymentStatus, totalPrice: 100 } });
 return { staff, appointment };
}
