import {randomUUID} from "node:crypto";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {commercialHash} from "@/server/services/commercial-internal";
import {plusUpgradeCycleAmount,remainingPlusAmount} from "@/core/legacy-plus";
const m=vi.hoisted(()=>({business:vi.fn(),snapshot:vi.fn(),snapshotUpdate:vi.fn(),operation:vi.fn(),existing:vi.fn(),pending:vi.fn(),updateOperation:vi.fn(),claim:vi.fn(),subscriptionUpdate:vi.fn(),payment:vi.fn(),paymentUpsert:vi.fn(),event:vi.fn(),materialize:vi.fn(),baseInvoice:vi.fn(),operations:new Map<string,unknown>()}));
vi.mock("@/server/db/prisma",()=>{
 const db={business:{findUniqueOrThrow:m.business},subscription:{update:m.subscriptionUpdate},commercialMigrationProposal:{findFirst:vi.fn(async()=>null)},
 commercialSubscription:{create:m.snapshot,update:m.snapshotUpdate},commercialBillingOperation:{create:m.operation,findUnique:m.existing,findFirst:m.pending,findFirstOrThrow:m.existing,findUniqueOrThrow:m.existing,update:m.updateOperation,updateMany:m.claim},
 commercialPaymentEvidence:{findUnique:m.payment,upsert:m.paymentUpsert},commercialEvent:{upsert:m.event},$queryRaw:vi.fn()};
 return {prisma:{...db,$transaction:async(fn:(tx:typeof db)=>unknown)=>fn(db)}};
});
vi.mock("@/server/services/commercial-subscription-v2.service",()=>({commercialJson:(v:unknown)=>JSON.parse(JSON.stringify(v)),materializeCommercialEntitlements:m.materialize}));
vi.mock("@/server/services/subscription-dunning.service",()=>({processMercadoPagoInvoice:m.baseInvoice}));
import {legacyPlusOffer,legacyPlusSourceHash,prepareLegacyPlusCheckout,executeLegacyPlusCheckout,reconcileLegacyPlusPreference} from "@/server/commercial-billing/legacy-plus";
import {MpV2Provider,type MpV2Port} from "@/server/commercial-billing/mercadopago-v2-provider";
type Business=Awaited<ReturnType<typeof import("@/server/commercial-billing/legacy-plus").readLegacyPlusBusiness>>;
const now=new Date("2026-11-05T12:00:00Z");
function fixture(manual=false){return {id:"business",ownerId:"owner",name:"Synthetic business",deletedAt:null,countryCode:"CL",currencyCode:"CLP",websiteAddon:null,commercialSubscription:null,
 subscription:{id:"base",businessId:"business",plan:"EQUIPO",status:"ACTIVE",billingCycle:"MONTHLY",isTrial:false,trialEndsAt:null,staffLimitOverride:manual?2:5,extraStaffCount:0,
 paymentMethod:manual?"BANK_TRANSFER":"AUTOMATIC",customMonthlyPriceClp:manual?17990:null,recurringPriceOverrideClp:null,mpSubscriptionId:manual?"historical-do-not-touch":"existing-agreement",paddleSubscriptionId:null,
 currentPeriodEnd:new Date("2026-11-20T12:00:00Z"),createdAt:new Date("2026-01-01T12:00:00Z"),pendingDiscountPercentage:null,freeMonthsRemaining:0,promoFreeMonthsRemaining:0,promoDiscountMonthsRemaining:0,nextBillingOverrideAmount:null}} as unknown as Business;}
function provider(){
 const remote={id:"existing-agreement",collector_id:123,application_id:456,live_mode:false,status:"authorized",external_reference:"original-reference",next_payment_date:new Date("2026-11-20T12:00:00Z"),
 auto_recurring:{frequency:1,frequency_type:"months",transaction_amount:29990,currency_id:"CLP"}};
 const port={account:vi.fn(async()=>({id:123,site_id:"MLC",tags:["test_user"]})),subscription:vi.fn(async()=>remote),preference:vi.fn(async()=>({id:"pref",init_point:"https://www.mercadopago.cl/checkout/v1/redirect?pref_id=synthetic"})),
 update:vi.fn(async(_id:string,body:{auto_recurring?:{transaction_amount?:number}})=>{Object.assign(remote.auto_recurring,body.auto_recurring);return remote;}),create:vi.fn(),payment:vi.fn()} as unknown as MpV2Port;
 return new MpV2Provider({environment:"V2_SANDBOX",accountId:123,applicationId:456,token:"synthetic",secret:"synthetic",returnUrl:"https://example.test/dashboard/settings?billing_return=1",webhookUrl:"https://example.test/api/webhooks/mercadopago-v2"},port);
}
describe("existing-business Plus checkout",()=>{
 beforeEach(()=>{vi.clearAllMocks();m.operations.clear();m.existing.mockImplementation(async()=>null);m.pending.mockResolvedValue(null);m.claim.mockResolvedValue({count:1});m.snapshot.mockImplementation(async({data})=>({id:"snapshot",...data}));
  m.operation.mockImplementation(async({data})=>{const op={id:randomUUID(),...data};m.operations.set(op.id,op);m.existing.mockImplementation(async({where})=>m.operations.get(where.id)??null);return op;});
  m.updateOperation.mockImplementation(async({where,data})=>{const op=Object.assign(m.operations.get(where.id) as object,data);return op;});m.snapshotUpdate.mockImplementation(async({data})=>({id:"snapshot",...data}));m.event.mockResolvedValue({id:"event"});m.payment.mockResolvedValue(null);
 });
 it("keeps the 15,000 CLP Plus difference independent of seats, legacy prices and the billing cycle",()=>{
  for(const seats of [1,2,5,20]){expect(plusUpgradeCycleAmount(seats,"MONTHLY")).toBe(15000);expect(plusUpgradeCycleAmount(seats,"ANNUAL")).toBe(150000);}
  expect(remainingPlusAmount(15000,new Date("2026-10-20T12:00:00Z"),new Date("2026-11-20T12:00:00Z"),now)).toBe(Math.ceil(15000*15/31));
 });
 it("Cinnamon retains 17,990 CLP, two professionals and transfer renewal without reading its historical MP reference",async()=>{
  const b=fixture(true),p=provider();const offer=await legacyPlusOffer(b,"owner",p,now);
  expect(offer).toMatchObject({manual:true,professionalTotal:2,total:32990,baseCycleAmount:17990,mode:"EXTENSION"});expect(p.port.subscription).not.toHaveBeenCalled();
 });
 it("Soccerbarber retains 29,990 CLP and five seats, quotes 44,990 CLP and uses the provider renewal anchor",async()=>{
  const b=fixture(),p=provider();b.subscription!.currentPeriodEnd=new Date("2026-07-29T12:00:00Z");
  const offer=await legacyPlusOffer(b,"owner",p,now);expect(offer).toMatchObject({total:44990,professionalTotal:5,periodEnd:new Date("2026-11-20T12:00:00Z")});expect(p.port.subscription).toHaveBeenCalledWith("existing-agreement");
 });
 it("retains a current trial deadline and temporary benefits in its first combined payment",async()=>{
  const b=fixture();Object.assign(b.subscription!,{status:"TRIALING",isTrial:true,trialEndsAt:new Date("2026-11-12T12:00:00Z"),pendingDiscountPercentage:50});
  const offer=await legacyPlusOffer(b,"owner",provider(),now);expect(offer).toMatchObject({mode:"COMBINED",trial:true,firstChargeAt:b.subscription!.trialEndsAt,baseCycleAmount:29990});expect(offer.amountDue).toBeLessThan(offer.total);
 });
 it.each([true,false])("creates an owned checkout, preserves seats/base agreement and grants nothing on redirect (manual=%s)",async manual=>{
  const b=fixture(manual),p=provider();m.business.mockResolvedValue(b);
  const op=await prepareLegacyPlusCheckout({businessId:b.id,actorId:"owner",idempotencyKey:"synthetic-request",expectedContractHash:legacyPlusSourceHash(b)},p,now);
  b.commercialSubscription={id:"snapshot",planCode:"EQUIPO"} as Business["commercialSubscription"];
  const result=await executeLegacyPlusCheckout(b.id,op.id,"owner@example.invalid",p);
  expect(result.status).toBe("AWAITING_PAYMENT");expect(result.checkoutUrl).toContain("mercadopago.cl/checkout/");
  expect(p.port.preference).toHaveBeenCalledOnce();expect(p.port.update).not.toHaveBeenCalled();expect(p.port.create).not.toHaveBeenCalled();
  expect(m.subscriptionUpdate).not.toHaveBeenCalled();expect(m.materialize).not.toHaveBeenCalled();expect(m.paymentUpsert).not.toHaveBeenCalled();
  const snapshotData=m.snapshotUpdate.mock.calls[0][0].data;expect(snapshotData).not.toHaveProperty("planCode");expect(snapshotData.termsSnapshot.combinedRecurring).toBe(false);
  expect(snapshotData.externalSubscriptionId).toBe(manual?null:"existing-agreement");
 });
 it("rejects staff, stale consent and overlapping site billing before provider mutations",async()=>{
  const b=fixture(),p=provider();m.business.mockResolvedValue(b);
  await expect(prepareLegacyPlusCheckout({businessId:b.id,actorId:"other",idempotencyKey:"synthetic-key",expectedContractHash:legacyPlusSourceHash(b)},p,now)).rejects.toThrow("OWNER_REQUIRED");
  await expect(prepareLegacyPlusCheckout({businessId:b.id,actorId:"owner",idempotencyKey:"synthetic-key",expectedContractHash:"0".repeat(64)},p,now)).rejects.toThrow("CONTRACT_CHANGED");
  expect(p.port.preference).not.toHaveBeenCalled();expect(p.port.update).not.toHaveBeenCalled();
 });
 it("requires the canonical amount, account and reference before a Plus grant",async()=>{
  const b=fixture(true),p=provider();m.business.mockResolvedValue(b);
  const op=await prepareLegacyPlusCheckout({businessId:b.id,actorId:"owner",idempotencyKey:"synthetic-request",expectedContractHash:legacyPlusSourceHash(b)},p,now);
  b.commercialSubscription={id:"snapshot",planCode:"EQUIPO"} as Business["commercialSubscription"];
  vi.mocked(p.port.payment).mockResolvedValue({id:"payment",status:"approved",live_mode:false,collector_id:123,currency_id:"CLP",transaction_amount:1,transaction_amount_refunded:0,external_reference:`legacy_plus_${op.id}`,date_approved:new Date("2026-11-05T12:01:00Z"),date_last_updated:new Date("2026-11-05T12:01:00Z")});
  await expect(reconcileLegacyPlusPreference(b.id,op.id,"payment",p)).rejects.toThrow("PAYMENT_BINDING_MISMATCH");expect(m.paymentUpsert).not.toHaveBeenCalled();expect(m.materialize).not.toHaveBeenCalled();
 });
 it("stores an untampered server quote hash",async()=>{const b=fixture(true),p=provider();m.business.mockResolvedValue(b);const op=await prepareLegacyPlusCheckout({businessId:b.id,actorId:"owner",idempotencyKey:"synthetic-request",expectedContractHash:legacyPlusSourceHash(b)},p,now);expect(op.inputHash).toBe(commercialHash(op.quoteSnapshot));});
});
