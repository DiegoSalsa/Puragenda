import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>{
  process.env.DATABASE_URL="postgresql://websiteqa@127.0.0.1:55439/websiteqa";
  process.env.DIRECT_URL=process.env.DATABASE_URL;
  process.env.WEBSITE_QA="1"; process.env.WEBSITE_BILLING_SIMULATOR="1";
  process.env.NEXT_PUBLIC_APP_URL="http://localhost:3010";
  return {owner:vi.fn()};
});
vi.mock("@/server/websites/service",()=>({requireWebsiteManager:m.owner}));
import { prisma } from "@/server/db/prisma";
import { claimBundleBaseCheckout, finishBundleBaseCheckout, markBundleBaseUnknown, rememberWebsiteIntent, requireBundlePaidBase } from "@/server/websites/purchase-intent";
import { startMercadoPagoWebsiteCheckout } from "@/server/websites/mercadopago-billing";
import { hasWebsiteEntitlement } from "@/websites/policy";

const enabled=process.env.WEBSITE_PUBLIC_TEST_DATABASE_URL==="postgresql://websiteqa@127.0.0.1:55439/websiteqa";
describe.skipIf(!enabled)("Website purchase with isolated real PostgreSQL and simulated MP",()=>{
  const a="commercial-test-a", b="commercial-test-b", owner="commercial-test-owner";
  const provider={get:vi.fn()};
  beforeAll(async()=>{ await prisma.user.upsert({where:{id:owner},create:{id:owner,email:"commercial-test@example.test",name:"Local QA",password:"not-login"},update:{}}); });
  beforeEach(async()=>{
    vi.stubEnv("WEBSITE_CHECKOUT_ENABLED","1");vi.stubEnv("WEBSITE_PUBLIC_ACQUISITION_ENABLED","1");
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN","local-simulator-no-network");vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET","local-simulator-no-network");
    await prisma.business.deleteMany({where:{id:{in:[a,b]}}});
    for(const id of [a,b]) {await prisma.business.create({data:{id,ownerId:owner,name:id,slug:id,apiKey:id,countryCode:"CL"}});await prisma.subscription.create({data:{businessId:id,plan:"INDIVIDUAL",status:"TRIALING",isTrial:true,trialEndsAt:new Date(Date.now()+30*86400000)}});}
    m.owner.mockImplementation(async()=>({business:await prisma.business.findUniqueOrThrow({where:{id:a}}),user:{id:owner,email:"commercial-test@example.test"}}));
    provider.get.mockReset();provider.get.mockResolvedValue({status:"pending",init_point:"https://www.mercadopago.cl/local-test-checkout"});
  });
  afterAll(async()=>{await prisma.business.deleteMany({where:{id:{in:[a,b]}}});await prisma.user.deleteMany({where:{id:owner}});await prisma.$disconnect();});
  async function selected(id=a) { const business=await prisma.business.findUniqueOrThrow({where:{id}});return rememberWebsiteIntent(business,owner); }
  async function paid() {await prisma.subscription.update({where:{businessId:a},data:{status:"ACTIVE",isTrial:false,currentPeriodEnd:new Date(Date.now()+30*86400000)}});}
  it("selection persists across reads without entitlement or Founder and is idempotent",async()=>{
    const first=await selected();await selected();expect((await prisma.websitePurchaseIntent.findUniqueOrThrow({where:{businessId:a}})).selectedAt).toEqual(first.selectedAt);
    expect(await prisma.websitePurchaseIntent.count({where:{businessId:a}})).toBe(1);
    expect(await prisma.websiteOfferEligibility.findUnique({where:{businessId:a}})).toBeNull();
    expect(await prisma.websiteAddon.findUnique({where:{businessId:a}})).toBeNull();
  });
  it("selection isolates tenants and refuses staff or other countries",async()=>{
    const business=await prisma.business.findUniqueOrThrow({where:{id:a}});
    await expect(rememberWebsiteIntent(business,"other-user")).rejects.toThrow("propietario");
    await expect(rememberWebsiteIntent({...business,countryCode:"AR"},owner)).rejects.toThrow("Chile");
    await selected();expect(await prisma.websitePurchaseIntent.findUnique({where:{businessId:b}})).toBeNull();
  });
  it("concurrent first clicks claim exactly one BASE checkout",async()=>{
    await selected();const results=await Promise.allSettled([claimBundleBaseCheckout(a,provider),claimBundleBaseCheckout(a,provider),claimBundleBaseCheckout(a,provider)]);
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(results.filter(r=>r.status==="rejected")).toHaveLength(2);
    expect((await prisma.websitePurchaseIntent.findUniqueOrThrow({where:{businessId:a}})).baseState).toBe("CREATING");
    expect(provider.get).not.toHaveBeenCalled();
  });
  it("BASE pending reload reuses provider checkout and abandonment grants no Website",async()=>{
    await selected();const claim=await claimBundleBaseCheckout(a,provider);if(!claim||claim.reused)throw Error("claim");
    await finishBundleBaseCheckout(a,claim.key,"mp-local-base","https://www.mercadopago.cl/local-test-checkout");
    expect(await claimBundleBaseCheckout(a,provider)).toMatchObject({reused:true,url:"https://www.mercadopago.cl/local-test-checkout"});
    await expect(requireBundlePaidBase(a)).rejects.toThrow("Confirma el pago");
    expect(hasWebsiteEntitlement(await prisma.websiteAddon.findUnique({where:{businessId:a}}))).toBe(false);
  });
  it("ambiguous BASE response blocks a replacement agreement even after reload",async()=>{
    await selected();const claim=await claimBundleBaseCheckout(a,provider);if(!claim||claim.reused)throw Error("claim");
    await markBundleBaseUnknown(a,claim.key);await expect(claimBundleBaseCheckout(a,provider)).rejects.toThrow("No se creará otro cobro");expect(provider.get).not.toHaveBeenCalled();
  });
  it("BASE past due blocks the second checkout even during grace",async()=>{
    await selected();await prisma.subscription.update({where:{businessId:a},data:{status:"PAST_DUE",isTrial:false,gracePeriodEndsAt:new Date(Date.now()+86400000)}});
    await expect(requireBundlePaidBase(a)).rejects.toThrow("Confirma el pago");
  });
  it("OFF public gate blocks new Standard despite paid BASE",async()=>{
    await selected();await paid();vi.stubEnv("WEBSITE_PUBLIC_ACQUISITION_ENABLED","0");await expect(requireBundlePaidBase(a)).rejects.toThrow("no está habilitada");
  });
  it("BASE first, separate Standard Website second; reload/double click never activate on return",async()=>{
    await selected();await expect(startMercadoPagoWebsiteCheckout()).rejects.toThrow("Confirma el pago");
    await paid();const base=await prisma.subscription.findUniqueOrThrow({where:{businessId:a}});
    const results=await Promise.allSettled([startMercadoPagoWebsiteCheckout(),startMercadoPagoWebsiteCheckout()]);expect(results.some(r=>r.status==="fulfilled")).toBe(true);
    const op=await prisma.websiteCheckoutOperation.findFirstOrThrow({where:{addon:{businessId:a}}});expect(op.amount).toBe(9990);expect(op.priceTier).toBe("STANDARD");expect(op.firstChargeAt).toBeNull();
    const checkout=await startMercadoPagoWebsiteCheckout();expect(checkout.checkoutUrl).toContain(op.id);
    expect(await prisma.websiteCheckoutOperation.count({where:{addon:{businessId:a}}})).toBe(1);
    expect(hasWebsiteEntitlement(await prisma.websiteAddon.findUnique({where:{businessId:a}}))).toBe(false);
    expect(await prisma.subscription.findUniqueOrThrow({where:{businessId:a}})).toEqual(base);
  });
});
