import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { createCommercialSubscriptionSnapshot } from "@/server/services/commercial-subscription-v2.service";
import { reconcileCommercialEvent } from "@/server/services/commercial-reconciliation.service";
import { getCommercialEntitlementShadow } from "@/server/services/commercial-entitlements.service";
import { prepareSandboxBillingOperation, previewSandboxBillingOperation, executeSandboxBillingOperation,
  processSandboxBillingWebhook, resolveUnknownSandboxOperation, applyPaidSandboxOperation } from "@/server/commercial-billing/operations";
import { mpFixture, mpSignature, mpNotification, paddleFixture, paddleNotification, paddleSignature } from "../fixtures/commercial-provider-fixtures";
import type { BillingContext } from "@/server/commercial-billing/contracts";
import { quoteCommercialPlan } from "@/core/commercial-catalog";
function uniqueMp() {
  const f=mpFixture();const paymentId=Math.floor(Math.random()*1_000_000_000)+1000;
  f.state.payment.id=paymentId;f.state.invoice.payment.id=paymentId;return f;
}
function uniquePaddle() {
  const f=paddleFixture();f.state.transaction.id=`txn_${randomUUID().replaceAll("-", "").slice(0,26)}`;return f;
}
const local = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const ids:string[]=[];
const before=()=>new Date(Date.now()-1000);const future=()=>new Date(Date.now()+30*86_400_000);
async function fixture(provider:"PADDLE"|"MERCADO_PAGO", active=false, plus=false, seats=1) {
  const id=`billing-${randomUUID()}`;ids.push(id);
  await prisma.business.create({data:{id,name:"Anonymous billing fixture",slug:id,apiKey:randomUUID()}});
  const external=provider==="PADDLE"?`sub_${"1".repeat(26)}`:"fixture-mp-contract";
  const plan=plus?"PURAGENDA_PLUS":"PURAGENDA";
  const snapshot=await createCommercialSubscriptionSnapshot({businessId:id,provider,plan,professionalTotal:seats,
    billingCycle:"MONTHLY",status:"PENDING_PAYMENT",termsSnapshot:{sandboxFixture:true,frozenBenefit:{source:"anonymous",value:25}},
    effectiveFrom:new Date(Date.now()-120000),periodEnd:future(),renewalAt:future(),externalSubscriptionId:active?external:null});
  if(active) await reconcileCommercialEvent({}, {verifyAndFetch:async()=>({businessId:id,subscriptionId:snapshot.snapshotId,provider,
    eventId:randomUUID(),reference:external,kind:"PAYMENT_CONFIRMED",amountClp:quoteCommercialPlan({catalogVersion:"puragenda-next-v1",plan,professionalTotal:seats}).monthlyTotal,currencyCode:"CLP",
    occurredAt:new Date(Date.now()-5000),periodStart:new Date(Date.now()-10000),periodEnd:future()})});
  return {businessId:id,subscriptionId:snapshot.snapshotId};
}
async function intent(f:Awaited<ReturnType<typeof fixture>>, provider:"PADDLE"|"MERCADO_PAGO", plan="PURAGENDA_PLUS",seats=1) {
  const now=before();return prepareSandboxBillingOperation({...f,provider,plan,professionalTotal:seats,strategy:"IMMEDIATE",idempotencyKey:randomUUID(),effectiveAt:now},now);
}
function context(op:Awaited<ReturnType<typeof intent>>):BillingContext {
  return {operationId:op.id,businessId:op.businessId,quote:quoteCommercialPlan({catalogVersion:"puragenda-next-v1",plan:op.targetPlanCode,professionalTotal:op.targetProfessionalTotal}),
    strategy:op.strategy as "IMMEDIATE"|"NEXT_RENEWAL",effectiveAt:op.effectiveAt,providerSubscriptionId:op.providerSubscriptionId};
}
local("billing V2 actual PostgreSQL with signed contract fixtures",()=>{
  beforeAll(()=>{vi.stubEnv("COMMERCIAL_V2_SANDBOX_WRITES","1");});
  afterAll(async()=>{await prisma.business.deleteMany({where:{id:{in:ids}}});await prisma.$disconnect();vi.unstubAllEnvs();});
  it("MP authorization does not grant rights; approved canonical invoice/payment does",async()=>{
    const f=await fixture("MERCADO_PAGO");const op=await intent(f,"MERCADO_PAGO");const provider=uniqueMp();
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid");
    expect((await getCommercialEntitlementShadow(f.businessId)).commercialAccess).toBe(false);
    provider.state.payment.transaction_amount=22990;provider.state.payment.date_last_updated=new Date().toISOString();
    const raw=mpNotification(randomUUID(),"payment",String(provider.state.payment.id));
    const concurrent=await Promise.all([processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter),processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter)]);
    expect(concurrent.filter(result=>"applied" in result && result.applied)).toHaveLength(1);
    expect(concurrent.filter(result=>"duplicate" in result && result.duplicate)).toHaveLength(1);
    const shadow=await getCommercialEntitlementShadow(f.businessId);expect(shadow.capabilities).toContain("puri.plus");
    expect(await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter)).toMatchObject({duplicate:true});
    expect(provider.state.calls).toBe(1);
    expect((await prisma.commercialPaymentEvidence.findFirstOrThrow({where:{operationId:op.id}})).origin).toBe("CONTRACT_FIXTURE");
  });
  it("two execute calls create one external operation, and timeout cannot trigger a second create",async()=>{
    const f=await fixture("MERCADO_PAGO");const op=await intent(f,"MERCADO_PAGO");const provider=uniqueMp();provider.state.timeout=true;
    await previewSandboxBillingOperation(op.id,provider.adapter);
    await Promise.all([executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid"),executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid")]);
    expect(provider.state.calls).toBe(1);
    expect((await prisma.commercialBillingOperation.findUniqueOrThrow({where:{id:op.id}})).status).toBe("UNKNOWN");
    await executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid");expect(provider.state.calls).toBe(1);
    expect((await resolveUnknownSandboxOperation(op.id,provider.adapter)).status).toBe("AWAITING_PAYMENT");
    expect((await getCommercialEntitlementShadow(f.businessId)).commercialAccess).toBe(false);
  });
  it("does not retry a mutation if local persistence fails after the provider accepted it",async()=>{
    const f=await fixture("MERCADO_PAGO");const op=await intent(f,"MERCADO_PAGO");const provider=uniqueMp();
    await previewSandboxBillingOperation(op.id,provider.adapter);
    const pool=new pg.Pool({connectionString:process.env.COMMERCIAL_V2_TEST_DATABASE_URL});
    try{
      await pool.query(`CREATE FUNCTION commercial_fixture_reject_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.id='${op.id}' AND NEW.status='AWAITING_PAYMENT' THEN RAISE EXCEPTION 'fixture disk failure'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER commercial_fixture_reject_acceptance BEFORE UPDATE ON "CommercialBillingOperation" FOR EACH ROW EXECUTE FUNCTION commercial_fixture_reject_acceptance();`);
      expect((await executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid")).status).toBe("UNKNOWN");
      await executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid");expect(provider.state.calls).toBe(1);
    }finally{await pool.query('DROP TRIGGER commercial_fixture_reject_acceptance ON "CommercialBillingOperation"; DROP FUNCTION commercial_fixture_reject_acceptance()');await pool.end();}
  });
  it("rejects an insufficient amount, a pending payment and a bad signature without rights",async()=>{
    const f=await fixture("MERCADO_PAGO");const op=await intent(f,"MERCADO_PAGO");const provider=uniqueMp();
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid");
    provider.state.payment.date_last_updated=new Date().toISOString();provider.state.payment.transaction_amount=1;
    let raw=mpNotification(randomUUID(),"payment",String(provider.state.payment.id));expect(await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter)).toMatchObject({outcome:"REJECTED"});
    provider.state.payment.status="pending";provider.state.payment.transaction_amount=22990;
    raw=mpNotification(randomUUID(),"payment",String(provider.state.payment.id));expect(await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter)).toMatchObject({outcome:"UNKNOWN"});
    await expect(processSandboxBillingWebhook(raw,new Headers(),provider.adapter)).rejects.toThrow();
    expect((await getCommercialEntitlementShadow(f.businessId)).commercialAccess).toBe(false);
  });
  it("Paddle applies a prorated paid upgrade using provider settlement separately from recurring price",async()=>{
    const f=await fixture("PADDLE",true);const op=await intent(f,"PADDLE");const provider=uniquePaddle();
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter);
    provider.bind(context(op),1000);
    const raw=paddleNotification(randomUUID(),"transaction.completed",provider.state.transaction.id);const result=await processSandboxBillingWebhook(raw,paddleSignature(raw),provider.adapter);
    expect(result).toMatchObject({applied:true});
    const snapshot=await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.businessId}});
    expect(snapshot.totalPriceClp).toBe(22990);expect((await prisma.commercialPaymentEvidence.findFirstOrThrow({where:{operationId:op.id}})).amountMinor).toBe(1000);
    expect((await getCommercialEntitlementShadow(f.businessId)).capabilities).toContain("puri.plus");
  });
  it("Paddle subscription update without a completed transaction never grants new seats",async()=>{
    const f=await fixture("PADDLE",true);const op=await intent(f,"PADDLE","PURAGENDA",2);const provider=uniquePaddle();
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter);provider.bind(context(op));provider.state.transaction.status="past_due";
    const raw=paddleNotification(randomUUID(),"transaction.completed",provider.state.transaction.id);await processSandboxBillingWebhook(raw,paddleSignature(raw),provider.adapter);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.businessId}})).professionalTotal).toBe(1);
  });
  it("Paddle paid downgrade preserves website data and frozen benefits",async()=>{
    const f=await fixture("PADDLE",true,true);const op=await intent(f,"PADDLE","PURAGENDA");const provider=uniquePaddle();
    const website=await prisma.businessWebsite.create({data:{businessId:f.businessId,subdomain:`fixture-${randomUUID().slice(0,8)}`,draftConfig:{keep:"content"}}});
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter);provider.bind(context(op));
    const raw=paddleNotification(randomUUID(),"transaction.completed",provider.state.transaction.id);await processSandboxBillingWebhook(raw,paddleSignature(raw),provider.adapter);
    expect((await getCommercialEntitlementShadow(f.businessId)).capabilities).not.toContain("puri.plus");
    expect(await prisma.businessWebsite.findUnique({where:{id:website.id}})).toEqual(website);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.businessId}})).termsSnapshot).toMatchObject({frozenBenefit:{value:25}});
  });
  it("Paddle timed-out new transaction stays unknown without a safe reference search",async()=>{
    const f=await fixture("PADDLE");const op=await intent(f,"PADDLE");const provider=uniquePaddle();provider.state.timeout=true;
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter);
    expect((await resolveUnknownSandboxOperation(op.id,provider.adapter)).status).toBe("UNKNOWN");
    await executeSandboxBillingOperation(op.id,provider.adapter);expect(provider.state.calls).toBe(1);
  });
  it.each(["refunded","charged_back"])("revokes shadow access on %s and ignores a stale approval",async status=>{
    const f=await fixture("MERCADO_PAGO");const op=await intent(f,"MERCADO_PAGO");const provider=uniqueMp();
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid");
    provider.state.payment.transaction_amount=22990;provider.state.payment.date_last_updated=new Date().toISOString();
    let raw=mpNotification(randomUUID(),"payment",String(provider.state.payment.id));await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter);
    const paidDate=provider.state.payment.date_last_updated;
    provider.state.payment.status=status;provider.state.payment.date_last_updated=new Date().toISOString();
    raw=mpNotification(randomUUID(),"payment",String(provider.state.payment.id));expect(await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter)).toMatchObject({reversed:true});
    provider.state.payment.status="approved";provider.state.payment.date_last_updated=paidDate;
    raw=mpNotification(randomUUID(),"payment",String(provider.state.payment.id));await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter);
    expect((await getCommercialEntitlementShadow(f.businessId)).commercialAccess).toBe(false);
  });
  it("canonical cancellation revokes shadow access and a stale approval cannot restore it",async()=>{
    const f=await fixture("MERCADO_PAGO");const op=await intent(f,"MERCADO_PAGO");const provider=uniqueMp();
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid");
    provider.state.payment.transaction_amount=22990;provider.state.payment.date_last_updated=new Date().toISOString();
    let raw=mpNotification(randomUUID(),"payment",String(provider.state.payment.id));
    await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter);
    expect((await getCommercialEntitlementShadow(f.businessId)).commercialAccess).toBe(true);
    provider.state.sub.status="cancelled";
    provider.state.sub.last_modified=new Date(Date.now()+1).toISOString();
    const observedAt=()=>new Date(Math.max(Date.now(),new Date(provider.state.sub.last_modified).getTime()));
    raw=mpNotification(randomUUID(),"subscription_preapproval",provider.state.sub.id);
    expect(await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter,observedAt())).toMatchObject({lifecycleUpdated:true});
    expect(await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter,observedAt())).toMatchObject({duplicate:true});
    expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.businessId}})).status).toBe("CANCELLED");
    raw=mpNotification(randomUUID(),"payment",String(provider.state.payment.id));
    expect(await processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter,observedAt())).toMatchObject({outcome:"IGNORED"});
    expect((await getCommercialEntitlementShadow(f.businessId)).commercialAccess).toBe(false);
    expect(provider.state.calls).toBe(1);
  });
  it("scheduled changes cannot execute early and do not change existing rights",async()=>{
    const f=await fixture("PADDLE",true);const provider=uniquePaddle();const effectiveAt=new Date(Date.now()+10000);
    await prisma.commercialSubscription.update({where:{businessId:f.businessId},data:{renewalAt:effectiveAt}});
    const op=await prepareSandboxBillingOperation({...f,provider:"PADDLE",plan:"PURAGENDA_PLUS",professionalTotal:2,strategy:"NEXT_RENEWAL",idempotencyKey:randomUUID(),effectiveAt});
    await previewSandboxBillingOperation(op.id,provider.adapter);
    expect((await executeSandboxBillingOperation(op.id,provider.adapter)).status).toBe("SCHEDULED");expect(provider.state.calls).toBe(0);
    expect((await getCommercialEntitlementShadow(f.businessId)).capabilities).not.toContain("puri.plus");
  });

  it("paid Paddle seat increase updates capacity exactly once",async()=>{
    const f=await fixture("PADDLE",true);const op=await intent(f,"PADDLE","PURAGENDA",2);const provider=uniquePaddle();
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter);provider.bind(context(op));
    const raw=paddleNotification(randomUUID(),"transaction.completed",provider.state.transaction.id);
    await processSandboxBillingWebhook(raw,paddleSignature(raw),provider.adapter);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.businessId}})).professionalTotal).toBe(2);
    expect(await applyPaidSandboxOperation(op.id)).toMatchObject({alreadyApplied:true});
  });
  it("paid seat reduction waits for active-staff conflict resolution and preserves history",async()=>{
    const f=await fixture("PADDLE",true,false,2);const op=await intent(f,"PADDLE","PURAGENDA",1);const provider=uniquePaddle();
    const staff=await prisma.staff.createManyAndReturn({data:[{businessId:f.businessId,name:"A"},{businessId:f.businessId,name:"B"}]});
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter);provider.bind(context(op));
    const raw=paddleNotification(randomUUID(),"transaction.completed",provider.state.transaction.id);
    expect(await processSandboxBillingWebhook(raw,paddleSignature(raw),provider.adapter)).toMatchObject({conflict:true,applied:false});
    await prisma.staff.update({where:{id:staff[1].id},data:{isActive:false}});
    expect(await applyPaidSandboxOperation(op.id)).toMatchObject({applied:true});
    expect(await prisma.staff.count({where:{businessId:f.businessId}})).toBe(2);
  });
  it("new billing tables enforce private grants, environment checks and one open intent",async()=>{
    const f=await fixture("MERCADO_PAGO");const op=await intent(f,"MERCADO_PAGO");
    await expect(intent(f,"MERCADO_PAGO")).rejects.toThrow();
    await expect(prisma.commercialBillingOperation.update({where:{id:op.id},data:{environment:"PRODUCTION"}})).rejects.toThrow();
    const pool=new pg.Pool({connectionString:process.env.COMMERCIAL_V2_TEST_DATABASE_URL});
    try{for(const table of ["CommercialBillingOperation","CommercialPaymentEvidence"]){
      const result=await pool.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',[`"${table}"`]);expect(result.rows[0].relrowsecurity).toBe(true);
      for(const role of ["anon","authenticated"]){const privilege=await pool.query('SELECT has_table_privilege($1,$2,$3) AS allowed',[role,`"${table}"`,"SELECT,INSERT,UPDATE,DELETE"]);expect(privilege.rows[0].allowed).toBe(false);}
    }}finally{await pool.end();}
  });


  it("applies next-renewal terms only after the synthetic clock reaches the paid period",async()=>{
    const f=await fixture("PADDLE",true);const provider=paddleFixture("prorated_immediately",true);
    provider.state.transaction.id=`txn_${randomUUID().replaceAll("-", "").slice(0,26)}`;
    provider.state.immediate=27990;provider.state.recurring=27990;
    const effectiveAt=new Date(Date.now()+10000);
    await prisma.commercialSubscription.update({where:{businessId:f.businessId},data:{renewalAt:effectiveAt,periodEnd:effectiveAt}});
    const op=await prepareSandboxBillingOperation({...f,provider:"PADDLE",plan:"PURAGENDA_PLUS",professionalTotal:2,strategy:"NEXT_RENEWAL",idempotencyKey:randomUUID(),effectiveAt});
    await previewSandboxBillingOperation(op.id,provider.adapter);
    await executeSandboxBillingOperation(op.id,provider.adapter);expect(provider.state.calls).toBe(0);
    await executeSandboxBillingOperation(op.id,provider.adapter,undefined,new Date(effectiveAt.getTime()+1));
    provider.bind(context(op),27990,new Date(effectiveAt.getTime()+2));
    const period={startsAt:effectiveAt.toISOString(),endsAt:new Date(effectiveAt.getTime()+30*86_400_000).toISOString()};
    provider.state.transaction.billingPeriod=period;provider.state.subscription.currentBillingPeriod=period;
    const raw=paddleNotification(randomUUID(),"transaction.completed",provider.state.transaction.id);
    expect(await processSandboxBillingWebhook(raw,paddleSignature(raw),provider.adapter,new Date(effectiveAt.getTime()+5))).toMatchObject({applied:true});
    expect((await getCommercialEntitlementShadow(f.businessId,prisma,new Date(effectiveAt.getTime()+5))).capabilities).toContain("puri.plus");
  });

  it("legacy and cross-business bindings cannot be used to replace agreements",async()=>{
    const f=await fixture("MERCADO_PAGO");const other=await fixture("MERCADO_PAGO");const op=await intent(f,"MERCADO_PAGO");const provider=uniqueMp();
    await previewSandboxBillingOperation(op.id,provider.adapter);await executeSandboxBillingOperation(op.id,provider.adapter,"test@example.invalid");
    provider.state.sub.id="another-tenant-subscription";provider.state.invoice.preapproval_id=provider.state.sub.id;
    const raw=mpNotification(randomUUID(),"payment",String(provider.state.payment.id));await expect(processSandboxBillingWebhook(raw,mpSignature(raw),provider.adapter)).rejects.toThrow("PROVIDER_SUBSCRIPTION_ID_MISMATCH");
    expect((await getCommercialEntitlementShadow(other.businessId)).commercialAccess).toBe(false);
    await prisma.commercialSubscription.update({where:{businessId:other.businessId},data:{termsSnapshot:{legacyAgreement:true}}});
    await expect(intent(other,"MERCADO_PAGO")).rejects.toThrow("SANDBOX_FIXTURE_REQUIRED_LEGACY_UNTOUCHED");
    await expect(applyPaidSandboxOperation(op.id)).rejects.toThrow();
  });
});
