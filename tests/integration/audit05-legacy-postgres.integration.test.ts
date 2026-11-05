import { randomUUID,createHmac } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const wire = vi.hoisted(()=>({owner:"",business:"",get:vi.fn(async()=>({id:"audit05-legacy",status:"authorized",next_payment_date:new Date(Date.now()+365*86400000).toISOString()})),update:vi.fn(async()=>({status:"authorized"})),search:vi.fn(async()=>({results:[]}))}));
vi.mock("mercadopago",async original=>({...await original<object>(),PreApproval:class{get=wire.get;update=wire.update;},Invoice:class{search=wire.search;}}));
vi.mock("@/server/auth/user-session",()=>({getApiSessionUser:async()=>({id:wire.owner})}));
vi.mock("@/server/services/business.service",()=>({getBusinessForUser:async()=>({id:wire.business,countryCode:"CL"})}));
import { prisma } from "@/server/db/prisma";
import { POST } from "@/app/api/billing/verify/route";
import { advanceBillingBenefitAfterAuthorized } from "@/server/services/subscription-billing.service";
import { POST as webhook } from "@/app/api/webhooks/mercadopago/route";
import { fixture, businesses } from "../fixtures/audit05-billing";
import { activatePrize } from "@/server/services/affiliate.service";
const suite=describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
suite("Audit05 legacy authorization HTTP boundary with PostgreSQL",()=>{
  afterAll(async()=>{await prisma.business.deleteMany({where:{id:{in:businesses}}});await prisma.$disconnect();});
  it.each(["INACTIVE","TRIALING","PAST_DUE","ACTIVE"] as const)("05-05 authorized without invoice preserves %s and never invents paid time",async status=>{
    const f=await fixture();wire.owner=f.user.id;wire.business=f.business.id;
    const end=new Date(Date.now()+86400000), trialEndsAt=status==="TRIALING"?end:null;
    await prisma.subscription.update({where:{businessId:f.business.id},data:{plan:"INDIVIDUAL",mpSubscriptionId:"audit05-legacy",status,isTrial:status==="TRIALING",trialEndsAt,currentPeriodEnd:status==="ACTIVE"?end:null,paymentFailedAt:status==="PAST_DUE"?new Date():null}});
    const before=await prisma.subscription.findUniqueOrThrow({where:{businessId:f.business.id}});
    const response=await POST(new NextRequest("http://127.0.0.1/api/billing/verify",{method:"POST"}));
    expect(response.status).toBe(200);
    const after=await prisma.subscription.findUniqueOrThrow({where:{businessId:f.business.id}});
    expect(after.status).toBe(before.status);expect(after.isTrial).toBe(before.isTrial);expect(after.currentPeriodEnd).toEqual(before.currentPeriodEnd);expect(after.trialEndsAt).toEqual(before.trialEndsAt);
  });
  it("05-02 duplicate approved legacy invoice consumes a free month once",async()=>{
    const f=await fixture();await prisma.subscription.update({where:{businessId:f.business.id},data:{plan:"INDIVIDUAL",mpSubscriptionId:"audit05-legacy",freeMonthsRemaining:3}});
    const sub=await prisma.subscription.findUniqueOrThrow({where:{businessId:f.business.id}}), invoiceKey=randomUUID();
    await prisma.subscription.update({where:{id:sub.id},data:{lastInvoiceId:invoiceKey,lastPaymentStatus:"approved"}});
    await advanceBillingBenefitAfterAuthorized(sub.id,invoiceKey,10);
    await advanceBillingBenefitAfterAuthorized(sub.id,invoiceKey,10);
    expect((await prisma.subscription.findUniqueOrThrow({where:{id:sub.id}})).freeMonthsRemaining).toBe(2);
  });
  it.each(["INACTIVE","TRIALING","PAST_DUE","ACTIVE"] as const)("05-05 signed authorized webhook preserves %s without a paid invoice",async status=>{
    const f=await fixture(),id=randomUUID(),end=new Date(Date.now()+86400000);
    await prisma.subscription.update({where:{businessId:f.business.id},data:{plan:"INDIVIDUAL",mpSubscriptionId:id,status,isTrial:status==="TRIALING",trialEndsAt:status==="TRIALING"?end:null,currentPeriodEnd:status==="ACTIVE"?end:null,paymentFailedAt:status==="PAST_DUE"?new Date():null}});
    wire.get.mockResolvedValue({id,status:"authorized",next_payment_date:new Date(Date.now()+365*86400000).toISOString()});
    const secret="synthetic-audit05-webhook",ts=String(Date.now()),requestId=randomUUID(),signature=createHmac("sha256",secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest("hex");
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET",secret);
    const before=await prisma.subscription.findUniqueOrThrow({where:{businessId:f.business.id}});
    const response=await webhook(new NextRequest(`http://127.0.0.1/api/webhooks/mercadopago?data.id=${id}&type=subscription_preapproval`,{method:"POST",headers:{"content-type":"application/json","x-request-id":requestId,"x-signature":`ts=${ts},v1=${signature}`},body:JSON.stringify({data:{id}})}));
    expect(response.status).toBe(200);
    const after=await prisma.subscription.findUniqueOrThrow({where:{businessId:f.business.id}});
    expect(after.status).toBe(before.status);expect(after.currentPeriodEnd).toEqual(before.currentPeriodEnd);expect(after.isTrial).toBe(before.isTrial);
  });
  it("05-02 concurrent legacy prize activations reserve only one benefit",async()=>{
    const f=await fixture();await prisma.subscription.update({where:{businessId:f.business.id},data:{plan:"INDIVIDUAL",mpSubscriptionId:randomUUID()}});
    const affiliate=await prisma.affiliate.create({data:{businessId:f.business.id,referralCode:randomUUID()}});
    const prizes=await Promise.all([10,50].map(percentage=>prisma.prize.create({data:{affiliateId:affiliate.id,type:"PERCENTAGE",percentage,name:"Synthetic legacy prize"}})));
    wire.update.mockImplementation(async()=>{await new Promise(resolve=>setTimeout(resolve,30));return {status:"authorized"};});
    const results=await Promise.all(prizes.map(p=>activatePrize(f.business.id,p.id)));
    expect(results.filter(r=>r.success)).toHaveLength(1);
    expect(await prisma.prize.count({where:{affiliateId:affiliate.id,status:"ACTIVE"}})).toBe(1);
  });
  it("05-02 legacy free months are not spent before the first confirmed charge",async()=>{
    const f=await fixture();await prisma.subscription.update({where:{businessId:f.business.id},data:{plan:"INDIVIDUAL",mpSubscriptionId:randomUUID()}});
    const affiliate=await prisma.affiliate.create({data:{businessId:f.business.id,referralCode:randomUUID()}});
    const prize=await prisma.prize.create({data:{affiliateId:affiliate.id,type:"FREE_MONTH",freeMonths:3,name:"Synthetic legacy quarter"}});
    expect((await activatePrize(f.business.id,prize.id)).success).toBe(true);
    expect((await prisma.subscription.findUniqueOrThrow({where:{businessId:f.business.id}})).freeMonthsRemaining).toBe(3);
  });
  it("05-02 uncertain legacy PUT and unmatched invoice preserve the complete reward",async()=>{
    const f=await fixture();await prisma.subscription.update({where:{businessId:f.business.id},data:{plan:"INDIVIDUAL",mpSubscriptionId:randomUUID()}});
    const affiliate=await prisma.affiliate.create({data:{businessId:f.business.id,referralCode:randomUUID()}});
    const prize=await prisma.prize.create({data:{affiliateId:affiliate.id,type:"FREE_MONTH",freeMonths:3,name:"Synthetic uncertain quarter"}});
    wire.update.mockImplementationOnce(async()=>{throw new Error("synthetic timeout after PUT");});
    expect((await activatePrize(f.business.id,prize.id)).success).toBe(false);
    const sub=await prisma.subscription.findUniqueOrThrow({where:{businessId:f.business.id}}),invoiceKey=randomUUID();
    await prisma.subscription.update({where:{id:sub.id},data:{lastInvoiceId:invoiceKey,lastPaymentStatus:"approved"}});
    await advanceBillingBenefitAfterAuthorized(sub.id,invoiceKey,100000);
    expect((await prisma.subscription.findUniqueOrThrow({where:{id:sub.id}})).freeMonthsRemaining).toBe(3);
    expect(await prisma.prize.findUnique({where:{id:prize.id}})).toMatchObject({status:"ACTIVE"});
  });
});
