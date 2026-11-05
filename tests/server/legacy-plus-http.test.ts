import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const m=vi.hoisted(()=>({user:vi.fn(),identity:vi.fn(),read:vi.fn(),offer:vi.fn(),prepare:vi.fn(),execute:vi.fn(),provider:vi.fn(),state:vi.fn()}));
vi.mock("@/server/auth/user-session",()=>({getApiSessionUser:m.user}));
vi.mock("@/server/services/business.service",()=>({getBusinessForUser:m.identity}));
vi.mock("@/server/auth/demo-session",()=>({isDemoAccountEmail:(email:string)=>email==="demo@example.invalid"}));
vi.mock("@/server/db/prisma",()=>({prisma:{commercialBillingOperation:{findFirst:vi.fn(async()=>null)}}}));
vi.mock("@/server/services/commercial-plan-access",()=>({isRegistrationV2Contract:()=>false,getCommercialPlanAccess:m.state}));
vi.mock("@/server/commercial-billing/mercadopago-v2-provider",()=>({createMpV2Provider:m.provider}));
vi.mock("@/server/commercial-billing/legacy-plus",()=>({readLegacyPlusBusiness:m.read,legacyPlusOffer:m.offer,prepareLegacyPlusCheckout:m.prepare,executeLegacyPlusCheckout:m.execute,
 reconcileLegacyPlusOperation:vi.fn(),legacyPlusOperationView:vi.fn(),cancelLegacyPlus:vi.fn()}));
import {handleLegacyPlusCommand,legacyPlusDashboardState} from "@/server/commercial-billing/legacy-plus-http";
const body={action:"UPGRADE",accepted:true,idempotencyKey:"synthetic-key",expectedContractHash:"a".repeat(64)};
function request(input:unknown=body,origin="https://example.test"){return new NextRequest("https://example.test/api/dashboard/subscription/billing",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(input)});}
describe("existing-business checkout permissions",()=>{
 beforeEach(()=>{vi.resetAllMocks();m.user.mockResolvedValue({id:"owner",email:"owner@example.invalid"});m.identity.mockResolvedValue({id:"business",ownerId:"owner"});m.read.mockResolvedValue({id:"business",subscription:{plan:"EQUIPO"},commercialSubscription:null});
 m.provider.mockReturnValue({config:{environment:"V2_SANDBOX"}});m.prepare.mockResolvedValue({id:"operation"});m.execute.mockResolvedValue({checkoutUrl:"https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=synthetic"});m.state.mockResolvedValue({snapshot:null});m.offer.mockResolvedValue({kind:"LEGACY_PLUS",contractHash:"a".repeat(64)});});
 it("requires same-origin, an authenticated user and ownership before provider access",async()=>{
  expect((await handleLegacyPlusCommand(request(body,"https://evil.invalid")))?.status).toBe(403);
  m.user.mockResolvedValue(null);expect((await handleLegacyPlusCommand(request()))?.status).toBe(401);
  m.user.mockResolvedValue({id:"staff"});expect((await handleLegacyPlusCommand(request()))?.status).toBe(403);expect(m.provider).not.toHaveBeenCalled();
 });
 it.each([{...body,amount:1},{...body,businessId:"other"},{...body,accepted:false},{...body,professionals:1}])("rejects forged checkout terms",async input=>{
  expect((await handleLegacyPlusCommand(request(input)))?.status).toBe(400);expect(m.prepare).not.toHaveBeenCalled();
 });
 it("derives the business/actor from the session and returns the real provider URL",async()=>{
  const r=await handleLegacyPlusCommand(request());expect(r?.status).toBe(200);expect((await r!.json()).checkoutUrl).toContain("sandbox.mercadopago.cl/checkout/");
  expect(m.prepare).toHaveBeenCalledWith({businessId:"business",actorId:"owner",idempotencyKey:body.idempotencyKey,expectedContractHash:body.expectedContractHash},expect.anything());
 });
 it("keeps the public demo read-only without hiding the checkout review",async()=>{
  m.user.mockResolvedValue({id:"owner",email:"demo@example.invalid"});expect((await handleLegacyPlusCommand(request()))?.status).toBe(403);expect(m.provider).not.toHaveBeenCalled();
  const r=await legacyPlusDashboardState(request());expect(r?.status).toBe(200);expect(await r!.json()).toMatchObject({kind:"LEGACY_PLUS",demo:true,enabled:false});
 });
});
