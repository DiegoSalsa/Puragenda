import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const wire = vi.hoisted(()=>({owner:"",business:"",get:vi.fn(async()=>({id:"audit05-legacy",status:"authorized",next_payment_date:new Date(Date.now()+365*86400000).toISOString()})),search:vi.fn(async()=>({results:[]}))}));
vi.mock("mercadopago",async original=>({...await original<object>(),PreApproval:class{get=wire.get;},Invoice:class{search=wire.search;}}));
vi.mock("@/server/auth/user-session",()=>({getApiSessionUser:async()=>({id:wire.owner})}));
vi.mock("@/server/services/business.service",()=>({getBusinessForUser:async()=>({id:wire.business,countryCode:"CL"})}));
import { prisma } from "@/server/db/prisma";
import { POST } from "@/app/api/billing/verify/route";
import { fixture, businesses } from "../fixtures/audit05-billing";
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
});
