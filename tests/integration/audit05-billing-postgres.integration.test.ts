import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { fixture, checkout, invoiceFor, businesses } from "../fixtures/audit05-billing";
import { prepareMpV2Operation, executeMpV2Operation, reconcileMpV2Invoice, reconcileMpV2Operation } from "@/server/commercial-billing/mercadopago-v2";
import { billingPeriodEnd } from "@/core/commercial-billing-policy";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { applyReferralCode, incrementPaidReferrals, activatePrize } from "@/server/services/affiliate.service";
import { refreshMpV2Dunning } from "@/server/commercial-billing/mercadopago-v2-dunning";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { cancelMpV2Renewal } from "@/server/commercial-billing/mercadopago-v2";
import { runMpV2Recovery } from "@/server/commercial-billing/mercadopago-v2-recovery";

const suite = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
async function paidExpansion(cycle: "MONTHLY" | "ANNUAL" = "MONTHLY") {
  const f = await fixture({plan:"PURAGENDA", professionalTotal:1, billingCycle:cycle});
  const root = await checkout(f), invoice = invoiceFor(f, root);
  await reconcileMpV2Invoice(invoice, f.provider);
  const op = await prepareMpV2Operation({businessId:f.business.id,actorId:f.user.id,idempotencyKey:randomUUID(),action:"CHANGE",selection:{...f.selection,plan:"PURAGENDA_PLUS"}},f.provider);
  await executeMpV2Operation(f.business.id,op.id,f.user.email,f.provider);
  const id = randomUUID();
  f.payments.set(id,{id,status:"approved",collector_id:123,live_mode:false,currency_id:"CLP",transaction_amount:op.expectedPaymentMinor,external_reference:`v2_change_${op.id}`,date_approved:new Date(),date_last_updated:new Date()});
  await reconcileMpV2Operation(f.business.id,op.id,f.provider);
  return {...f,root,invoice,op,payment:f.payments.get(id)!};
}
suite("Audit05 financial regressions with real isolated PostgreSQL",()=>{
  afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
  afterAll(async()=>{await prisma.business.deleteMany({where:{id:{in:businesses}}});await prisma.$disconnect();});
  it.each(["MONTHLY","ANNUAL"] as const)("05-01 preserves a later paid %s renewal after an old expansion refund",async cycle=>{
    const f=await paidExpansion(cycle), start=billingPeriodEnd(f.invoice.debit_date,cycle,f.root.effectiveAt.getUTCDate());
    const renewal=invoiceFor(f,f.root,start,f.op.recurringAmountMinor);
    const now=new Date(+start+60000);await reconcileMpV2Invoice(renewal,f.provider,now);
    Object.assign(f.payment,{status:"refunded",date_last_updated:now});
    await reconcileMpV2Operation(f.business.id,f.op.id,f.provider);
    expect((await getCommercialPlanAccess(f.business.id,now)).has("puri.plus")).toBe(true);
    expect(await prisma.commercialSubscription.findUnique({where:{id:f.sub.id}})).toMatchObject({status:"ACTIVE",lastPaymentStatus:"CONFIRMED",periodStart:start});
  });
  it("05-01 an immediate expansion refund preserves base paid access",async()=>{
    const f=await paidExpansion();Object.assign(f.payment,{status:"refunded",date_last_updated:new Date()});
    await reconcileMpV2Operation(f.business.id,f.op.id,f.provider);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(true);
    expect((await getCommercialPlanAccess(f.business.id)).has("puri.plus")).toBe(false);
  });
  it("05-02 never creates a full-price checkout that silently drops a promised referral discount",async()=>{
    const f=await fixture(), ref=await fixture();
    const affiliate=await prisma.affiliate.create({data:{businessId:ref.business.id,referralCode:randomUUID().toUpperCase()}});
    expect((await applyReferralCode(f.business.id,affiliate.referralCode)).success).toBe(true);
    await expect(checkout(f)).rejects.toThrow("V2_BENEFIT_PROVIDER_VALIDATION_REQUIRED");
    expect(f.port.create).not.toHaveBeenCalled();
    expect(await prisma.subscription.findUnique({where:{businessId:f.business.id}})).toMatchObject({pendingDiscountPercentage:25});
  });
  it("05-02 counts a referred paying business once under concurrent retries",async()=>{
    const f=await fixture(), ref=await fixture();
    const affiliate=await prisma.affiliate.create({data:{businessId:ref.business.id,referralCode:randomUUID().toUpperCase()}});
    await applyReferralCode(f.business.id,affiliate.referralCode);
    await prisma.subscription.update({where:{businessId:f.business.id},data:{plan:"INDIVIDUAL",lastPaymentStatus:"approved",lastPaymentId:randomUUID(),lastInvoiceId:randomUUID()}});
    await Promise.all([incrementPaidReferrals(f.business.id),incrementPaidReferrals(f.business.id)]);
    expect((await prisma.affiliate.findUniqueOrThrow({where:{id:affiliate.id}})).paidReferrals).toBe(1);
  });
  it("05-04 grants only bounded 48h recovery after a previously paid renewal",async()=>{
    const f=await fixture(),root=await checkout(f),first=invoiceFor(f,root);await reconcileMpV2Invoice(first,f.provider);
    const start=billingPeriodEnd(first.debit_date,"MONTHLY",root.effectiveAt.getUTCDate());
    const rejected=invoiceFor(f,root,start,undefined,"rejected");await reconcileMpV2Invoice(rejected,f.provider,new Date(+start+1000));
    expect((await getCommercialPlanAccess(f.business.id,new Date(+start+3600000))).allowed).toBe(true);
    expect((await getCommercialPlanAccess(f.business.id,new Date(+start+49*3600000))).allowed).toBe(false);
  });
  for(const cycle of ["MONTHLY","ANNUAL"] as const) for(const status of ["refunded","charged_back"] as const) for(const renewed of [false,true]) {
    it(`05-01 ${cycle} ${status} renewed=${renewed}: duplicate, out-of-order and concurrent reversal`,async()=>{
      const f=await paidExpansion(cycle);
      const start=billingPeriodEnd(f.invoice.debit_date,cycle,f.root.effectiveAt.getUTCDate()), now=renewed?new Date(+start+60000):new Date();
      if(renewed) await reconcileMpV2Invoice(invoiceFor(f,f.root,start,f.op.recurringAmountMinor),f.provider,now);
      Object.assign(f.payment,{status,date_last_updated:now});
      await Promise.all([reconcileMpV2Operation(f.business.id,f.op.id,f.provider),reconcileMpV2Operation(f.business.id,f.op.id,f.provider)]);
      const access=await getCommercialPlanAccess(f.business.id,now);
      expect(access.allowed).toBe(true);expect(access.has("puri.plus")).toBe(renewed);
      expect(await prisma.commercialPaymentEvidence.count({where:{operationId:f.op.id}})).toBe(renewed?2:1);
      expect(await prisma.commercialBillingOperation.findUnique({where:{id:f.op.id}})).toMatchObject({failureCode:"V2_EXPANSION_REVERSAL_REVIEW_REQUIRED"});
      expect(await prisma.commercialEvent.count({where:{businessId:f.business.id,source:"mp_v2_review"}})).toBe(1);
      Object.assign(f.payment,{status:"approved",date_last_updated:new Date(+now+1000)});
      await reconcileMpV2Operation(f.business.id,f.op.id,f.provider);
      expect((await getCommercialPlanAccess(f.business.id,now)).has("puri.plus")).toBe(renewed);
      await expect(prepareMpV2Operation({businessId:f.business.id,actorId:f.user.id,idempotencyKey:randomUUID(),action:"CHANGE",selection:{...f.selection,professionalTotal:2}},f.provider,now)).rejects.toThrow("V2_COMMERCIAL_REVIEW_REQUIRED");
    });
  }
  for(const billingCycle of ["MONTHLY","ANNUAL"] as const) {
    it.each([10,15,20,30,50,100,300])(`05-02 ${billingCycle} reserves prize %i once without spending free months or modifying recurrence`,async value=>{
      const f=await fixture({plan:"PURAGENDA",professionalTotal:1,billingCycle},true);
      const affiliate=await prisma.affiliate.create({data:{businessId:f.business.id,referralCode:randomUUID(),paidReferrals:1}});
      const prize=await prisma.prize.create({data:{affiliateId:affiliate.id,type:value>=100?"FREE_MONTH":"PERCENTAGE",percentage:value<100?value:null,freeMonths:value>=100?value/100:null,name:"Synthetic prize"}});
      const [a,b]=await Promise.all([activatePrize(f.business.id,prize.id),activatePrize(f.business.id,prize.id)]);
      expect([a,b].filter(x=>x.success)).toHaveLength(1);
      expect(await prisma.subscription.findUnique({where:{businessId:f.business.id}})).toMatchObject({activePrizeId:prize.id,pendingDiscountPercentage:value<100?value:null,freeMonthsRemaining:value>=100?value/100:0});
      expect(await prisma.prize.findUnique({where:{id:prize.id}})).toMatchObject({status:"ACTIVE"});
      await expect(checkout(f)).rejects.toThrow("V2_BENEFIT_PROVIDER_VALIDATION_REQUIRED");
      expect(f.port.create).not.toHaveBeenCalled();expect(f.port.update).not.toHaveBeenCalled();
    });
  }
  it("05-02 preserves an existing referral discount and rejects self referral",async()=>{
    const f=await fixture(), affiliate=await prisma.affiliate.create({data:{businessId:f.business.id,referralCode:randomUUID().toUpperCase()}});
    expect((await applyReferralCode(f.business.id,affiliate.referralCode)).success).toBe(false);
  });
  it("05-02 V2 confirmed payments award a referral once and refunds never make balances negative",async()=>{
    const f=await fixture(),ref=await fixture(),root=await checkout(f),invoice=invoiceFor(f,root);
    const affiliate=await prisma.affiliate.create({data:{businessId:ref.business.id,referralCode:randomUUID()}});
    // Synthetic migrated registration: discount already honored before this contract.
    await prisma.business.update({where:{id:f.business.id},data:{referredByAffiliateId:affiliate.id}});
    await Promise.all([reconcileMpV2Invoice(invoice,f.provider),reconcileMpV2Invoice(invoice,f.provider)]);
    expect(await prisma.affiliate.findUnique({where:{id:affiliate.id}})).toMatchObject({paidReferrals:1,spentTokens:0});
    f.payments.get(invoice.payment.id)!.status="refunded";await reconcileMpV2Invoice(invoice,f.provider);
    expect(await prisma.affiliate.findUnique({where:{id:affiliate.id}})).toMatchObject({paidReferrals:1,spentTokens:0});
  });
  it.each(["pending","rejected"])("05-04 first %s invoice never earns grace",async status=>{
    const f=await fixture(),root=await checkout(f);await reconcileMpV2Invoice(invoiceFor(f,root,undefined,undefined,status),f.provider);
    await refreshMpV2Dunning(f.business.id);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{id:f.sub.id}})).gracePeriodEndsAt).toBeNull();
  });
  it("05-04 retries and two workers cannot move the grace deadline; recovery works after suspension",async()=>{
    const f=await fixture(),root=await checkout(f),first=invoiceFor(f,root);await reconcileMpV2Invoice(first,f.provider);
    const start=billingPeriodEnd(first.debit_date,"MONTHLY",root.effectiveAt.getUTCDate()),now=new Date(+start+1000);
    await Promise.all([refreshMpV2Dunning(f.business.id,now),refreshMpV2Dunning(f.business.id,now)]);
    const before=await prisma.commercialSubscription.findUniqueOrThrow({where:{id:f.sub.id}});
    expect(+before.gracePeriodEndsAt!).toBe(+start+48*3600000);
    const projection=await prisma.subscription.findUniqueOrThrow({where:{businessId:f.business.id}});
    expect(projection.status).toBe("PAST_DUE");expect(hasOperationalSubscriptionAccess(projection,now)).toBe(true);
    await refreshMpV2Dunning(f.business.id,new Date(+start+49*3600000));
    expect((await getCommercialPlanAccess(f.business.id,new Date(+start+49*3600000))).allowed).toBe(false);
    const approved=invoiceFor(f,root,start);
    await reconcileMpV2Invoice(approved,f.provider,new Date(+start+50*3600000));
    expect((await getCommercialPlanAccess(f.business.id,new Date(+start+50*3600000))).allowed).toBe(true);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{id:f.sub.id}})).gracePeriodEndsAt).toBeNull();
  });
  it("05-04 API outage preserves a bounded traceable recovery window",async()=>{
    const f=await fixture(),root=await checkout(f),first=invoiceFor(f,root);await reconcileMpV2Invoice(first,f.provider);
    const start=billingPeriodEnd(first.debit_date,"MONTHLY",root.effectiveAt.getUTCDate()), now=new Date(+start+1000);
    vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(now);
    vi.stubEnv("COMMERCIAL_V2_INTERNAL_WRITES","1");vi.stubEnv("PURAGENDA_MP_V2_RECOVERY_ENABLED","1");vi.stubEnv("PURAGENDA_MP_V2_ENVIRONMENT","sandbox");
    f.port.account=async()=>{throw new Error("synthetic API outage");};
    const result=await runMpV2Recovery(f.provider,{businessId:f.business.id,minimumIntervalMs:0});
    expect(result.failed).toBeGreaterThan(0);expect((await getCommercialPlanAccess(f.business.id,now)).allowed).toBe(true);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{id:f.sub.id}})).gracePeriodEndsAt).toEqual(new Date(+start+48*3600000));
  });
  it("05-04 cancellation during grace removes only the recovery grant",async()=>{
    const f=await fixture(),root=await checkout(f),first=invoiceFor(f,root);await reconcileMpV2Invoice(first,f.provider);
    const start=billingPeriodEnd(first.debit_date,"MONTHLY",root.effectiveAt.getUTCDate()),now=new Date(+start+1000);
    vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(now);await refreshMpV2Dunning(f.business.id,now);
    await cancelMpV2Renewal(f.business.id,f.user.id,f.provider);
    expect((await getCommercialPlanAccess(f.business.id,now)).allowed).toBe(false);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{id:f.sub.id}})).periodEnd).toEqual(start);
  });
  it("partial refund before first reconciliation never grants a full contract",async()=>{
    const f=await fixture(),root=await checkout(f),invoice=invoiceFor(f,root);
    Object.assign(f.payments.get(invoice.payment.id)!,{transaction_amount_refunded:100,status_detail:"partially_refunded"});
    await reconcileMpV2Invoice(invoice,f.provider);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
    expect((await prisma.commercialBillingOperation.findUniqueOrThrow({where:{id:root.id}})).failureCode).toBe("V2_PARTIAL_REFUND_REVIEW_REQUIRED");
    Object.assign(f.payments.get(invoice.payment.id)!,{transaction_amount_refunded:0,status_detail:"accredited",date_last_updated:new Date()});
    await reconcileMpV2Invoice(invoice,f.provider);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
  });
  for(const cycle of ["MONTHLY","ANNUAL"] as const) for(const status of ["refunded","charged_back"] as const) for(const renewed of [false,true]) {
    it(`05-01 base ${cycle} ${status} renewed=${renewed} affects only its own paid period`,async()=>{
      const f=await fixture({plan:"PURAGENDA",professionalTotal:1,billingCycle:cycle}),root=await checkout(f),first=invoiceFor(f,root);
      await reconcileMpV2Invoice(first,f.provider);
      const next=billingPeriodEnd(first.debit_date,cycle,root.effectiveAt.getUTCDate()),now=renewed?new Date(+next+1000):new Date();
      if(renewed) await reconcileMpV2Invoice(invoiceFor(f,root,next),f.provider,now);
      Object.assign(f.payments.get(first.payment.id)!,{status,date_last_updated:now,...(status==="refunded"?{transaction_amount_refunded:root.recurringAmountMinor,status_detail:"partially_refunded"}:{})});
      await reconcileMpV2Invoice(first,f.provider,now);
      expect((await getCommercialPlanAccess(f.business.id,now)).allowed).toBe(renewed);
      expect(await prisma.commercialPaymentEvidence.count({where:{operationId:root.id}})).toBe(renewed?2:1);
    });
  }
  it.each(["MONTHLY","ANNUAL"] as const)("05-03 concurrent %s cycle change never creates a second provider contract",async billingCycle=>{
    const f=await fixture({plan:"PURAGENDA",professionalTotal:1,billingCycle}),root=await checkout(f),first=invoiceFor(f,root);await reconcileMpV2Invoice(first,f.provider);
    const run=()=>prepareMpV2Operation({businessId:f.business.id,actorId:f.user.id,idempotencyKey:randomUUID(),action:"CHANGE",selection:{...f.selection,billingCycle:billingCycle==="MONTHLY"?"ANNUAL":"MONTHLY"}},f.provider);
    const results=await Promise.allSettled([run(),run()]);expect(results.every(x=>x.status==="rejected"&&x.reason.message==="BILLING_CYCLE_CHANGE_REQUIRES_RENEWAL")).toBe(true);
    expect(await prisma.commercialBillingOperation.count({where:{businessId:f.business.id}})).toBe(1);expect(f.port.create).toHaveBeenCalledTimes(1);expect(f.port.update).not.toHaveBeenCalled();
  });
  it.each([undefined,999])("canonical application identity %s cannot authorize another application's contract",async application_id=>{
    const f=await fixture(),root=await checkout(f),invoice=invoiceFor(f,root);
    Object.assign(f.subscriptions.get(root.providerSubscriptionId!)!,{application_id});
    await expect(reconcileMpV2Invoice(invoice,f.provider)).rejects.toThrow();
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
    expect(await prisma.commercialPaymentEvidence.count({where:{businessId:f.business.id}})).toBe(0);
  });
});
