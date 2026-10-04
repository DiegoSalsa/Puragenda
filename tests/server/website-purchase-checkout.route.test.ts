import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m=vi.hoisted(()=>({user:vi.fn(),business:vi.fn(),subscription:vi.fn(),intent:vi.fn(),save:vi.fn(),claim:vi.fn(),finish:vi.fn(),unknown:vi.fn(),create:vi.fn()}));
vi.mock("@/server/auth/user-session",()=>({getApiSessionUser:m.user}));
vi.mock("@/server/services/business.service",()=>({getBusinessForUser:m.business}));
vi.mock("@/server/lib/rate-limit",()=>({billingLimiter:{check:()=>null}}));
vi.mock("@/server/db/prisma",()=>({prisma:{subscription:{findUnique:m.subscription,upsert:m.save},websitePurchaseIntent:{findUnique:m.intent}}}));
vi.mock("@/server/websites/purchase-intent",()=>({claimBundleBaseCheckout:m.claim,finishBundleBaseCheckout:m.finish,markBundleBaseUnknown:m.unknown}));
vi.mock("@/server/lib/mercadopago",()=>({mpClient:{}}));
vi.mock("mercadopago",()=>({PreApproval:class{create=m.create;get=vi.fn();}}));
vi.mock("@/server/lib/paddle",()=>({getPaddleCheckoutItems:vi.fn()}));
vi.mock("@/server/services/platform-discount.service",()=>({quotePlatformDiscount:vi.fn(),reservePlatformDiscount:vi.fn()}));
import { POST } from "@/app/api/billing/subscribe/route";
describe("bundle BASE provider contract",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN","local-mock-never-sent");vi.stubEnv("LOCAL_PAYMENT_SIMULATOR","false");vi.stubEnv("NEXT_PUBLIC_APP_URL","https://example.test");
    m.user.mockResolvedValue({id:"owner",email:"local@example.test"});m.business.mockResolvedValue({id:"business",ownerId:"owner",countryCode:"CL",name:"Local QA",currencyCode:"CLP"});
    m.subscription.mockResolvedValue({plan:"EQUIPO",billingCycle:"ANNUAL",extraStaffCount:2,status:"TRIALING",isTrial:true,trialEndsAt:new Date(Date.now()+86400000)});
    m.intent.mockResolvedValue({businessId:"business"});m.claim.mockResolvedValue({reused:false,key:"local-operation"});
    m.create.mockResolvedValue({id:"local-base",init_point:"https://www.mercadopago.cl/local-checkout"});m.save.mockResolvedValue({id:"subscription"});m.finish.mockResolvedValue(undefined);m.unknown.mockResolvedValue(undefined);
  });
  function request(body:unknown={plan:"EQUIPO",extraStaffCount:2}){return new NextRequest("https://example.test/api/billing/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});}
  it("annual BASE charges only its catalog amount every twelve months, Website separate",async()=>{
    const res=await POST(request({plan:"EQUIPO",extraStaffCount:2,amount:1,tier:"BETA_FOUNDER",websitePrice:1}));expect(res.status).toBe(200);
    expect(m.create).toHaveBeenCalledWith({body:expect.objectContaining({auto_recurring:{frequency:12,frequency_type:"months",transaction_amount:359900,currency_id:"CLP"},back_url:"https://example.test/onboarding/website",external_reference:"base-bundle:local-operation"})});
    expect(m.finish).toHaveBeenCalledWith("business","local-operation","local-base","https://www.mercadopago.cl/local-checkout");
  });
  it("reusing a pending BASE checkout never creates or mutates another agreement",async()=>{
    m.claim.mockResolvedValue({reused:true,url:"https://www.mercadopago.cl/existing",key:"existing"});
    const res=await POST(request());expect(await res.json()).toMatchObject({init_point:"https://www.mercadopago.cl/existing",reused:true});expect(m.create).not.toHaveBeenCalled();expect(m.save).not.toHaveBeenCalled();
  });
  it("persisted BASE plan, extras and cadence reject forged TEST checkout inputs",async()=>{
    const res=await POST(request({plan:"TEST",extraStaffCount:20,amount:1}));expect(res.status).toBe(200);
    expect(m.create).toHaveBeenCalledWith({body:expect.objectContaining({auto_recurring:expect.objectContaining({transaction_amount:359900,frequency:12})})});
    expect(m.save).toHaveBeenCalledWith(expect.objectContaining({update:expect.objectContaining({plan:"EQUIPO",extraStaffCount:2})}));
  });
  it("provider uncertainty leaves a durable UNKNOWN claim instead of silently retrying",async()=>{
    m.create.mockRejectedValue({status:503});const res=await POST(request());expect(res.status).toBeGreaterThanOrEqual(400);expect(m.unknown).toHaveBeenCalledWith("business","local-operation");expect(m.save).not.toHaveBeenCalled();
  });
  it("does not let staff purchase for the business owner",async()=>{
    m.user.mockResolvedValue({id:"staff",email:"local@example.test"});const res=await POST(request());expect(res.status).toBe(403);expect(m.create).not.toHaveBeenCalled();expect(m.claim).not.toHaveBeenCalled();
  });
});
