import { randomUUID, createHmac } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { contactFixture, deleteContactFixture } from "../fixtures/contact-flow";
import { configureProductionContactFlow, syntheticCapacityReader } from "../fixtures/contact-flow-production";
import { prepareCampaign, authorizeCampaign } from "@/server/contact-flow/campaigns";
import { runContactWorker } from "@/server/contact-flow/worker";
import { runCommercialTick } from "@/server/commercial-worker";
import * as contactEvents from "@/server/contact-flow/events";
import { ResendContactProvider } from "@/server/contact-flow/providers";
import { refreshResendCapacity, RESEND_CAPACITY_STATE, type CapacityReader } from "@/server/contact-flow/resend-capacity";
import { receiveResendEvent } from "@/server/contact-flow/events";
import { enrollmentToken, unsubscribe } from "@/server/contact-flow/tokens";
import { ensureFirstPaidPlusAlert, FIRST_PAID_PLUS_ALERT } from "@/server/contact-flow/first-paid-plus";
import { productionResendBaseConfiguration, contactReleaseApprovalBindings } from "@/server/contact-flow/resend-release";
import { createRegistrationContract } from "@/server/services/commercial-trial.service";
import { MpV2Provider, type MpV2Port, type MpV2Subscription } from "@/server/commercial-billing/mercadopago-v2-provider";
import { prepareMpV2Operation, executeMpV2Operation, reconcileMpV2Invoice } from "@/server/commercial-billing/mercadopago-v2";

const suite=describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const fixtures:Awaited<ReturnType<typeof contactFixture>>[]=[],extraBusinesses:string[]=[],extraUsers:string[]=[];
async function ready(options:{trial?:boolean;maximum?:number}={}) {
  const f=await contactFixture({...options,prepare:false});fixtures.push(f);
  await prisma.commercialSubscription.update({where:{businessId:f.businessId},data:{termsSnapshot:{origin:"registration_v2"}}});
  configureProductionContactFlow({enabled:true});
  const c=await prepareCampaign(f.scope,f.input),v=await prisma.cfVersion.findFirstOrThrow({where:{campaignId:c.id}});
  await authorizeCampaign(f.scope,c.id,v.contentHash,v.version,true);
  await refreshResendCapacity(new Date(),syntheticCapacityReader());
  return {...f,campaignId:c.id};
}
function sender() { return vi.spyOn(ResendContactProvider.prototype,"send").mockImplementation(async()=>({outcome:"ACCEPTED",providerId:randomUUID(),idempotent:true})); }
async function rows(businessId:string) { return prisma.cfMessage.findMany({where:{businessId},include:{outbox:true,enrollment:true}}); }
async function receipt(providerId:string,type:string,secret=Buffer.from("synthetic-late-webhook-secret")) {
  const id=randomUUID(),ts=String(Math.floor(Date.now()/1000)),raw=JSON.stringify({type,created_at:new Date().toISOString(),data:{email_id:providerId,from:"contacto@contacto.puragenda.cl"}});
  const headers=new Headers({"svix-id":id,"svix-timestamp":ts,"svix-signature":"v1,"+createHmac("sha256",secret).update(`${id}.${ts}.${raw}`).digest("base64")});
  return receiveResendEvent(raw,headers);
}

async function paymentFixture(plan:"PURAGENDA"|"PURAGENDA_PLUS"="PURAGENDA_PLUS",environment:"V2_PRODUCTION"|"V2_SANDBOX"="V2_PRODUCTION") {
  const user=await prisma.user.create({data:{email:randomUUID()+"@example.invalid",password:"synthetic",name:"Synthetic paid owner"}});extraUsers.push(user.id);
  const business=await prisma.business.create({data:{name:"Synthetic paid business",slug:randomUUID(),apiKey:randomUUID(),ownerId:user.id,countryCode:"CL",currencyCode:"CLP"}});extraBusinesses.push(business.id);
  await prisma.$transaction(tx=>createRegistrationContract(tx,{businessId:business.id,plan,professionalTotal:1,billingCycle:"MONTHLY",trialEligible:true,now:new Date(Date.now()-40*86400000)}));
  const subscriptions=new Map<string,MpV2Subscription>(),payments=new Map<string,unknown>();
  const port:MpV2Port={account:async()=>({id:123,site_id:"MLC",tags:environment==="V2_SANDBOX"?["test_user"]:[]}),subscription:async id=>subscriptions.get(id),
    create:async body=>{const id=randomUUID(),s={id,collector_id:123,application_id:456,status:"authorized",external_reference:body.external_reference!,live_mode:environment==="V2_PRODUCTION",auto_recurring:{...body.auto_recurring!},init_point:`https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=${id}`} as MpV2Subscription;subscriptions.set(id,s);return s;},
    update:async()=>{throw new Error("UNEXPECTED_UPDATE");},preference:async()=>{throw new Error("UNEXPECTED_PREFERENCE");},payments:async()=>({results:[]}),search:async()=>({results:[]}),invoice:async()=>null,invoices:async()=>({results:[]}),invoicesForPayment:async()=>({results:[]}),payment:async id=>payments.get(id)};
  const provider=new MpV2Provider({environment,accountId:123,applicationId:456,token:"synthetic",secret:"synthetic",returnUrl:"https://www.puragenda.cl/dashboard/settings",webhookUrl:"https://www.puragenda.cl/api/webhooks/mercadopago-v2"},port);
  const prepared=await prepareMpV2Operation({businessId:business.id,actorId:user.id,action:"SUBSCRIBE",idempotencyKey:randomUUID()},provider,new Date(Date.now()-60000));
  await executeMpV2Operation(business.id,prepared.id,user.email,provider);
  const op=await prisma.commercialBillingOperation.findUniqueOrThrow({where:{id:prepared.id}});
  async function reconcile(status="approved") {
    const id=randomUUID(),when=new Date(Date.now()-1000),remote=subscriptions.get(op.providerSubscriptionId!)!;
    payments.set(id,{id,status,live_mode:environment==="V2_PRODUCTION",collector_id:123,currency_id:"CLP",transaction_amount:op.recurringAmountMinor,external_reference:remote.external_reference,date_approved:status==="approved"?when:null,date_last_updated:when});
    return reconcileMpV2Invoice({id:randomUUID(),preapproval_id:remote.id,debit_date:when,currency_id:"CLP",transaction_amount:op.recurringAmountMinor,payment:{id}},provider);
  }
  return {business,user,op,reconcile};
}

suite("Contact Flow Free production controls / isolated PostgreSQL",()=>{
  beforeEach(async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>{throw new Error("UNEXPECTED_EXTERNAL_NETWORK");}));
    // Other serialized suites leave platform buckets in this disposable DB.
    await prisma.cfQuotaBucket.deleteMany({where:{businessId:null}});
    await prisma.puriBudgetBucket.deleteMany({where:{businessId:null}});
    await prisma.commercialWorkerState.deleteMany({where:{key:RESEND_CAPACITY_STATE}});
  });
  afterEach(async()=>{
    vi.restoreAllMocks();
    for(const f of fixtures.splice(0).reverse())await deleteContactFixture(f);
    await prisma.business.deleteMany({where:{id:{in:extraBusinesses.splice(0)}}});await prisma.user.deleteMany({where:{id:{in:extraUsers.splice(0)}}});
    await prisma.cfQuotaBucket.deleteMany({where:{businessId:null}});await prisma.commercialWorkerState.deleteMany({where:{key:RESEND_CAPACITY_STATE}});
    vi.unstubAllEnvs();vi.unstubAllGlobals();
  });
  afterAll(()=>prisma.$disconnect());
  it.each([false,true])("dispatches an entitled Plus business (trial=%s) and settles only once",async trial=>{
    const f=await ready({trial,maximum:2}),send=sender();
    await Promise.all([runContactWorker({businessId:f.businessId,limit:2}),runContactWorker({businessId:f.businessId,limit:2})]);
    expect(send).toHaveBeenCalledTimes(2);expect((await rows(f.businessId)).every(m=>m.state==="ACCEPTED")).toBe(true);
    await runContactWorker({businessId:f.businessId});expect(send).toHaveBeenCalledTimes(2);
    expect(await prisma.cfQuotaBucket.findUnique({where:{key:`global:day:${new Date().toISOString().slice(0,10)}`}})).toMatchObject({consumed:2,reserved:0,limit:10});
  });
  it("runs the complete production tick without invoking the older sandbox-only reconciler",async()=>{
    const f=await ready({maximum:1}),send=sender();
    const receipts=vi.spyOn(contactEvents,"reconcileResendDeliveries").mockResolvedValue({reconciled:0,simulated:false});
    await prisma.commercialWorkerState.deleteMany({where:{key:"PURAGENDA_NEXT"}});
    try {
      const result=await runCommercialTick();expect(result).toMatchObject({processed:1,billingApplied:0,billingFailed:0,stageErrors:[],receiptReconciliationFailed:false,budgetMs:20000});expect(send).toHaveBeenCalledOnce();
      expect(await prisma.commercialWorkerState.findUnique({where:{key:"PURAGENDA_NEXT"}})).toMatchObject({leaseOwner:null,leaseUntil:null,lastError:null});
      expect((await rows(f.businessId))[0].state).toBe("ACCEPTED");
      const successful=await prisma.commercialWorkerState.findUniqueOrThrow({where:{key:"PURAGENDA_NEXT"}});
      receipts.mockRejectedValue(new Error("synthetic receipt provider unavailable"));
      expect(await runCommercialTick()).toMatchObject({receiptReconciliationFailed:true});
      const partial=await prisma.commercialWorkerState.findUniqueOrThrow({where:{key:"PURAGENDA_NEXT"}});
      expect(partial).toMatchObject({leaseUntil:null,leaseOwner:null,lastError:"CONTACT_RECEIPT_RECONCILIATION_REQUIRED"});
      expect(partial.lastSuccessAt).toEqual(successful.lastSuccessAt);
    } finally { await prisma.commercialWorkerState.deleteMany({where:{key:"PURAGENDA_NEXT"}}); }
  });
  it.each(["basic","expired"])("blocks %s without deleting campaign data",async reason=>{
    const f=await ready({trial:true,maximum:1}),send=sender();
    await prisma.commercialSubscription.update({where:{businessId:f.businessId},data:reason==="basic"?{planCode:"PURAGENDA"}:{trialEnd:new Date(Date.now()-1000)}});
    await runContactWorker({businessId:f.businessId});expect(send).not.toHaveBeenCalled();expect(await prisma.cfCampaign.count({where:{businessId:f.businessId}})).toBe(1);
  });
  it("preserves the queue and attempt budget when transactional headroom is exhausted",async()=>{
    const f=await ready({maximum:1}),send=sender();
    await prisma.commercialWorkerState.delete({where:{key:RESEND_CAPACITY_STATE}});await refreshResendCapacity(new Date(),syntheticCapacityReader(60));
    await runContactWorker({businessId:f.businessId});expect(send).not.toHaveBeenCalled();
    expect((await rows(f.businessId))[0]).toMatchObject({state:"QUEUED",outbox:{state:"PENDING",attempts:0,lastError:"TRANSACTIONAL_CAPACITY_RESERVED"}});
    await prisma.commercialWorkerState.delete({where:{key:RESEND_CAPACITY_STATE}});await refreshResendCapacity(new Date(),syntheticCapacityReader(0));
    await prisma.cfOutbox.updateMany({where:{businessId:f.businessId},data:{nextAttemptAt:new Date()}});await runContactWorker({businessId:f.businessId});expect(send).toHaveBeenCalledOnce();
  });
  it.each(["daily","monthly"])("stops at the global %s limit without dispatching",async period=>{
    const f=await ready({maximum:1}),send=sender(),date=new Date().toISOString().slice(0,10),key=period==="daily"?`global:day:${date}`:`global:month:${date.slice(0,7)}`,limit=period==="daily"?10:200;
    await prisma.cfQuotaBucket.create({data:{key,kind:period==="daily"?"GLOBAL_DAY":"GLOBAL_MONTH",period:period==="daily"?date:date.slice(0,7),limit,consumed:limit}});
    await runContactWorker({businessId:f.businessId});expect(send).not.toHaveBeenCalled();expect((await rows(f.businessId))[0].outbox?.lastError).toBe("QUOTA_EXHAUSTED");
  });
  it("invalidates a stale or failed snapshot and serializes refreshes",async()=>{
    const f=await ready({maximum:1}),send=sender();
    await prisma.commercialWorkerState.update({where:{key:RESEND_CAPACITY_STATE},data:{lastError:"RESEND_CAPACITY_UNAVAILABLE"}});
    const failing=syntheticCapacityReader();failing.usage.mockRejectedValue(new Error("offline"));await refreshResendCapacity(new Date(),failing);
    await runContactWorker({businessId:f.businessId});expect(send).not.toHaveBeenCalled();expect((await rows(f.businessId))[0].outbox?.attempts).toBe(0);
    const reader=syntheticCapacityReader();await prisma.commercialWorkerState.delete({where:{key:RESEND_CAPACITY_STATE}});
    await Promise.all(Array.from({length:5},()=>refreshResendCapacity(new Date(),reader)));expect(reader.usage).toHaveBeenCalledOnce();
  });
  it.each(["monthly-capacity","disabled-webhook","missing-event","unverified-domain"])("defers safely for %s without spending attempts",async reason=>{
    const f=await ready({maximum:1}),send=sender(),reader=syntheticCapacityReader();
    if(reason==="monthly-capacity")reader.usage.mockImplementation(async()=>({emails:{daily:{used:0,limit:100,resets_at:new Date(Date.now()+3600000).toISOString()},monthly:{used:2000,limit:3000,resets_at:new Date(Date.now()+86400000).toISOString()}}}));
    if(reason==="disabled-webhook")reader.webhook.mockResolvedValue({endpoint:"https://www.puragenda.cl/api/contact-flow/webhooks/resend",status:"disabled",events:[]});
    if(reason==="missing-event")reader.webhook.mockImplementation(async()=>({endpoint:"https://www.puragenda.cl/api/contact-flow/webhooks/resend",status:"enabled",events:["email.sent"]}));
    if(reason==="unverified-domain")reader.domain.mockResolvedValue({name:"contacto.puragenda.cl",status:"pending"});
    await prisma.commercialWorkerState.delete({where:{key:RESEND_CAPACITY_STATE}});await refreshResendCapacity(new Date(),reader);await runContactWorker({businessId:f.businessId});
    expect(send).not.toHaveBeenCalled();expect((await rows(f.businessId))[0]).toMatchObject({state:"QUEUED",outbox:{state:"PENDING",attempts:0,lastError:reason==="monthly-capacity"?"TRANSACTIONAL_CAPACITY_RESERVED":"RESEND_CAPACITY_UNKNOWN"}});
  });
  it.each([-120000,120000])("refuses a stale or future snapshot while another worker refreshes (%s ms)",async delta=>{
    const f=await ready({maximum:1}),send=sender(),row=await prisma.commercialWorkerState.findUniqueOrThrow({where:{key:RESEND_CAPACITY_STATE}});
    await prisma.commercialWorkerState.update({where:{key:row.key},data:{summary:{...row.summary as object,fetchedAt:new Date(Date.now()+delta).toISOString()},leaseOwner:"synthetic-other-refresher",leaseUntil:new Date(Date.now()+30000)}});
    await runContactWorker({businessId:f.businessId});expect(send).not.toHaveBeenCalled();expect((await rows(f.businessId))[0]).toMatchObject({state:"QUEUED",outbox:{state:"PENDING",attempts:0,lastError:"RESEND_CAPACITY_UNKNOWN"}});
  });
  it("pauses and resumes an authorized queue without recreating its messages",async()=>{
    const f=await ready({maximum:1}),send=sender(),[before]=await rows(f.businessId);
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_ENABLED","0");await runContactWorker({businessId:f.businessId});expect(send).not.toHaveBeenCalled();
    expect((await rows(f.businessId))[0]).toMatchObject({id:before.id,state:"QUEUED",outbox:{state:"PENDING",attempts:0}});
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_ENABLED","1");await prisma.cfOutbox.updateMany({where:{businessId:f.businessId},data:{nextAttemptAt:new Date()}});await runContactWorker({businessId:f.businessId});
    expect(send).toHaveBeenCalledOnce();expect((await rows(f.businessId))[0]).toMatchObject({id:before.id,state:"ACCEPTED"});
  });
  it("holds an ambiguous retry when credentials change during a Pro transition",async()=>{
    const f=await ready({maximum:1}),send=sender();send.mockResolvedValueOnce({outcome:"UNKNOWN",idempotent:true,code:"PROVIDER_TIMEOUT"});
    await runContactWorker({businessId:f.businessId});expect(send).toHaveBeenCalledOnce();
    const approval=JSON.parse(process.env.CONTACT_FLOW_PRODUCTION_APPROVAL_JSON!);vi.stubEnv("CONTACT_FLOW_PRODUCTION_RESEND_API_KEY","re_synthetic_rotated_sender");
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_APPROVAL_JSON",JSON.stringify({...approval,...contactReleaseApprovalBindings(productionResendBaseConfiguration())}));
    await refreshResendCapacity(new Date(),syntheticCapacityReader());await prisma.cfOutbox.updateMany({where:{businessId:f.businessId},data:{nextAttemptAt:new Date()}});await runContactWorker({businessId:f.businessId});
    expect(send).toHaveBeenCalledOnce();expect((await rows(f.businessId))[0]).toMatchObject({state:"QUEUED",outbox:{state:"PENDING",attempts:1,lastError:"RESEND_CREDENTIAL_CHANGED"}});
  });
  it("accepts a Pro capacity configuration while retaining an unattempted Free campaign",async()=>{
    const f=await ready({maximum:1}),send=sender(),[before]=await rows(f.businessId),approval=JSON.parse(process.env.CONTACT_FLOW_PRODUCTION_APPROVAL_JSON!);
    vi.stubEnv("CONTACT_FLOW_PROVIDER_CAPACITY_MODE","shared_pro");
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_APPROVAL_JSON",JSON.stringify({...approval,...contactReleaseApprovalBindings(productionResendBaseConfiguration())}));
    const reader:CapacityReader=syntheticCapacityReader();reader.usage=async()=>({emails:{daily:{used:100,limit:null,resets_at:null},monthly:{used:100,limit:50000,resets_at:new Date(Date.now()+86400000).toISOString()}}});
    await refreshResendCapacity(new Date(),reader);await runContactWorker({businessId:f.businessId});
    expect(send).toHaveBeenCalledOnce();expect((await rows(f.businessId))[0]).toMatchObject({id:before.id,state:"ACCEPTED"});expect(await prisma.cfCampaign.count({where:{businessId:f.businessId}})).toBe(1);
  });
  it("admits only one final global slot across different businesses and concurrent workers",async()=>{
    const a=await ready({maximum:1}),b=await ready({maximum:1}),send=sender(),day=new Date().toISOString().slice(0,10);
    await prisma.cfQuotaBucket.create({data:{key:`global:day:${day}`,kind:"GLOBAL_DAY",period:day,limit:10,consumed:9}});
    await Promise.all([runContactWorker({businessId:a.businessId}),runContactWorker({businessId:b.businessId})]);
    expect(send).toHaveBeenCalledOnce();expect(await prisma.cfQuotaBucket.findUnique({where:{key:`global:day:${day}`}})).toMatchObject({consumed:10,reserved:0});
    expect(await prisma.cfMessage.count({where:{businessId:{in:[a.businessId,b.businessId]},state:"QUEUED"}})).toBe(1);
  });
  it.each(["day","month","trial"])("enforces the business %s allowance inside the global allowance",async kind=>{
    const f=await ready({trial:kind==="trial",maximum:1}),send=sender(),day=new Date().toISOString().slice(0,10),sub=await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.businessId}});
    const key=kind==="trial"?`${f.businessId}:trial-${sub.trialStart!.toISOString()}`:`${f.businessId}:${kind}:${kind==="day"?day:day.slice(0,7)}`,limit=kind==="trial"?30:kind==="day"?10:150;
    await prisma.cfQuotaBucket.create({data:{key,businessId:f.businessId,kind:kind==="trial"?"BUSINESS_TRIAL":kind==="day"?"BUSINESS_DAY":"BUSINESS_MONTH",period:kind==="trial"?`trial-${sub.trialStart!.toISOString()}`:kind==="day"?day:day.slice(0,7),limit,consumed:limit}});
    await runContactWorker({businessId:f.businessId});expect(send).not.toHaveBeenCalled();expect((await rows(f.businessId))[0].outbox?.lastError).toBe("QUOTA_EXHAUSTED");
  });
  it("keeps signed receipts and opt-outs working after the release and feature switches close",async()=>{
    const f=await ready({maximum:1});sender();await runContactWorker({businessId:f.businessId});const [m]=await rows(f.businessId);
    const token=await prisma.$transaction(tx=>enrollmentToken(tx,m.enrollmentId,f.businessId,"UNSUBSCRIBE",new Date(Date.now()+3600000)));
    const secret=Buffer.from("synthetic-late-webhook-secret");vi.stubEnv("CONTACT_FLOW_PRODUCTION_RESEND_WEBHOOK_SECRET","whsec_"+secret.toString("base64"));vi.stubEnv("CONTACT_FLOW_PRODUCTION_ENABLED","0");vi.stubEnv("PURAGENDA_NEXT_ENABLED","0");vi.stubEnv("CONTACT_FLOW_LAB_ENABLED","0");
    const id=randomUUID(),ts=String(Math.floor(Date.now()/1000)),raw=JSON.stringify({type:"email.delivered",created_at:new Date().toISOString(),data:{email_id:m.providerId,from:"contacto@contacto.puragenda.cl"}});
    const headers=new Headers({"svix-id":id,"svix-timestamp":ts,"svix-signature":"v1,"+createHmac("sha256",secret).update(`${id}.${ts}.${raw}`).digest("base64")});
    await expect(receiveResendEvent(raw,headers)).resolves.toMatchObject({accepted:true});await expect(receiveResendEvent(raw,headers)).resolves.toEqual({duplicate:true});
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_RESEND_WEBHOOK_SECRET","");
    await unsubscribe(token);await unsubscribe(token);expect(await prisma.cfSuppression.count({where:{businessId:f.businessId,reason:"UNSUBSCRIBE"}})).toBe(1);
  });
  it("records delays and negative receipts after shutdown without touching another tenant",async()=>{
    const a=await ready({maximum:1}),b=await ready({maximum:1}),send=sender();await runContactWorker({businessId:a.businessId});await runContactWorker({businessId:b.businessId});
    const [m]=await rows(a.businessId),[other]=await rows(b.businessId),secret=Buffer.from("synthetic-late-webhook-secret");
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_PREVIOUS_WEBHOOK_SECRET","whsec_"+secret.toString("base64"));
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_RESEND_WEBHOOK_SECRET","whsec_"+Buffer.from("synthetic-new-secret").toString("base64"));
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_ENABLED","0");vi.stubEnv("PURAGENDA_NEXT_ENABLED","0");vi.stubEnv("CONTACT_FLOW_DELIVERY_MODE","simulation");
    for(const type of ["email.delivery_delayed","email.bounced","email.complained","email.delivered","email.suppressed"])await expect(receipt(m.providerId!,type,secret)).resolves.toMatchObject({accepted:true});
    expect(await prisma.cfAudit.count({where:{businessId:a.businessId,event:"RESEND_DELIVERY_DELAYED"}})).toBe(1);
    expect(await prisma.cfMessage.findUnique({where:{id:m.id}})).toMatchObject({state:"COMPLAINED"});
    expect(await prisma.cfMessage.findUnique({where:{id:other.id}})).toMatchObject({state:"ACCEPTED"});
    expect(await prisma.cfSuppression.count({where:{businessId:a.businessId}})).toBeGreaterThan(0);expect(await prisma.cfSuppression.count({where:{businessId:b.businessId}})).toBe(0);expect(send).toHaveBeenCalledTimes(2);
  });
  it("does not alert for authorization without collection, pending/rejected money, basic or sandbox payments",async()=>{
    const f=await paymentFixture();expect(await ensureFirstPaidPlusAlert()).toBeNull();await f.reconcile("in_process");expect(await ensureFirstPaidPlusAlert()).toBeNull();await f.reconcile("rejected");expect(await ensureFirstPaidPlusAlert()).toBeNull();
    await (await paymentFixture("PURAGENDA")).reconcile();await (await paymentFixture("PURAGENDA_PLUS","V2_SANDBOX")).reconcile();expect(await ensureFirstPaidPlusAlert()).toBeNull();
  });
  it("creates a single internal alert after the real reconciliation path confirms production Plus money",async()=>{
    const f=await paymentFixture();await f.reconcile();const alerts=await Promise.all(Array.from({length:6},()=>ensureFirstPaidPlusAlert()));
    expect(new Set(alerts.map(a=>a?.id)).size).toBe(1);expect(await prisma.commercialEvent.count({where:FIRST_PAID_PLUS_ALERT})).toBe(1);expect(alerts[0]).toMatchObject({operation:"REVIEW_RESEND_PRO",businessId:f.business.id,details:{automaticPurchase:false}});
  });
});
