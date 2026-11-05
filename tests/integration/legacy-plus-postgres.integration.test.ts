import {randomUUID} from "node:crypto";
import {afterAll,afterEach,describe,expect,it,vi} from "vitest";
import {prisma} from "@/server/db/prisma";
import {MpV2Provider,type MpV2Port} from "@/server/commercial-billing/mercadopago-v2-provider";
import {readLegacyPlusBusiness,legacyPlusSourceHash,prepareLegacyPlusCheckout,executeLegacyPlusCheckout,reconcileLegacyPlusPreference,reconcileLegacyPlusInvoice,cancelLegacyPlus} from "@/server/commercial-billing/legacy-plus";
import {getCommercialPlanAccess} from "@/server/services/commercial-plan-access";
import {resolveWebsiteCommercialAccess} from "@/server/websites/commercial-access";
import {recordManualSubscriptionPayment} from "@/server/services/commercial-subscription.service";
vi.mock("@/server/email/send",()=>({sendSubscriptionPaymentFailedEmail:vi.fn(),sendSubscriptionPaymentRecoveredEmail:vi.fn()}));
vi.mock("@/server/services/subscription-payment-notification.service",()=>({notifySubscriptionPayment:vi.fn()}));
vi.mock("@/server/services/affiliate.service",()=>({incrementPaidReferrals:vi.fn()}));
vi.mock("@/server/services/platform-discount.service",()=>({markPlatformDiscountApplied:vi.fn()}));
vi.mock("mercadopago",async original=>({...await original<typeof import("mercadopago")>(),PreApproval:class{update=vi.fn(async()=>({}));}}));
const suite=describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL),ids:string[]=[],users:string[]=[];
function fakeProvider(){
 const subscriptions=new Map<string,Record<string,unknown>>(),payments=new Map<string,Record<string,unknown>>(),invoices=new Map<string,Record<string,unknown>>();
 const port:MpV2Port={account:vi.fn(async()=>({id:123,site_id:"MLC",tags:["test_user"]})),subscription:vi.fn(async id=>subscriptions.get(id)),
  create:vi.fn(async body=>{const id=randomUUID(),v={id,collector_id:123,application_id:456,live_mode:false,status:"pending",external_reference:body.external_reference,
   auto_recurring:body.auto_recurring,init_point:`https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=${id}`};subscriptions.set(id,v);return v;}),
  update:vi.fn(async(id,body)=>{const v=subscriptions.get(id)!;Object.assign(v,{...body,auto_recurring:{...(v.auto_recurring as object),...body.auto_recurring}});subscriptions.set(id,v);return v;}),
  preference:vi.fn(async()=>({id:randomUUID(),init_point:"https://www.mercadopago.cl/checkout/v1/redirect?pref_id=synthetic"})),payment:async id=>payments.get(id),
  invoice:async id=>invoices.get(id),invoices:async id=>({results:[...invoices.values()].filter(i=>i.preapproval_id===id)}),invoicesForPayment:async id=>({results:[...invoices.values()].filter(i=>(i.payment as {id:string})?.id===id)}),
  search:async ref=>({results:[...subscriptions.values()].filter(v=>v.external_reference===ref)}),payments:async ref=>({results:[...payments.values()].filter(v=>v.external_reference===ref)})};
 const provider=new MpV2Provider({environment:"V2_SANDBOX",accountId:123,applicationId:456,token:"synthetic",secret:"synthetic",returnUrl:"https://example.test/dashboard/settings?billing_return=1",webhookUrl:"https://example.test/api/webhooks/mercadopago-v2"},port);
 return {provider,port,subscriptions,payments,invoices};
}
async function fixture(manual=false,trial=false){
 const user=await prisma.user.create({data:{email:`${randomUUID()}@example.invalid`,name:"Synthetic Plus owner",password:"synthetic-not-a-login"}});users.push(user.id);
 const business=await prisma.business.create({data:{name:"Synthetic legacy Plus",slug:randomUUID(),apiKey:randomUUID(),ownerId:user.id,countryCode:"CL",currencyCode:"CLP"}});ids.push(business.id);
 const sub=await prisma.subscription.create({data:{businessId:business.id,plan:"EQUIPO",status:trial?"TRIALING":"ACTIVE",billingCycle:"MONTHLY",isTrial:trial,
  trialEndsAt:trial?new Date(Date.now()+7*86400000):null,staffLimitOverride:manual?2:5,paymentMethod:manual?"BANK_TRANSFER":"AUTOMATIC",customMonthlyPriceClp:manual?17990:null,
  currentPeriodEnd:new Date(Date.now()+15*86400000),mpSubscriptionId:manual?"historical-reference":randomUUID()}});
 const f=fakeProvider();if(!manual)f.subscriptions.set(sub.mpSubscriptionId!,{id:sub.mpSubscriptionId,collector_id:123,application_id:456,live_mode:false,status:trial?"pending":"authorized",external_reference:"original_base",next_payment_date:sub.currentPeriodEnd,
  auto_recurring:{frequency:1,frequency_type:"months",transaction_amount:29990,currency_id:"CLP"},init_point:`https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=${sub.mpSubscriptionId}`});
 const now=new Date(Date.now()-1000),source=await readLegacyPlusBusiness(business.id),hash=legacyPlusSourceHash(source);
 const op=await prepareLegacyPlusCheckout({businessId:business.id,actorId:user.id,idempotencyKey:randomUUID(),expectedContractHash:hash},f.provider,now);
 return {...f,business,user,sub,op,source};
}
function payment(f:Awaited<ReturnType<typeof fixture>>,amount=f.op.expectedPaymentMinor!,status="approved"){
 const id=randomUUID(),when=new Date();f.payments.set(id,{id,status,collector_id:123,live_mode:false,currency_id:"CLP",transaction_amount:amount,transaction_amount_refunded:0,
  external_reference:`legacy_plus_${f.op.id}`,date_approved:when,date_last_updated:when});return id;
}
suite("existing-business Plus checkout against isolated Postgres",()=>{
 afterEach(()=>vi.unstubAllEnvs());
 afterAll(async()=>{await prisma.business.deleteMany({where:{id:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();});
 it.each([true,false])("opens checkout without changing the base or granting Plus; canonical payment grants once (manual=%s)",async manual=>{
  const f=await fixture(manual);expect((await getCommercialPlanAccess(f.business.id)).has("contact_flow")).toBe(false);
  const result=await executeLegacyPlusCheckout(f.business.id,f.op.id,f.user.email,f.provider);expect(result.checkoutUrl).toContain("mercadopago.cl/checkout/");
  expect(await prisma.subscription.findUnique({where:{id:f.sub.id}})).toEqual(f.sub);expect((await getCommercialPlanAccess(f.business.id)).has("contact_flow")).toBe(false);
  expect(f.port.create).not.toHaveBeenCalled();expect(f.port.update).not.toHaveBeenCalled();
  const id=payment(f);await reconcileLegacyPlusPreference(f.business.id,f.op.id,id,f.provider);await reconcileLegacyPlusPreference(f.business.id,f.op.id,id,f.provider);
  expect(await prisma.commercialPaymentEvidence.count({where:{paymentId:id}})).toBe(1);expect((await getCommercialPlanAccess(f.business.id)).has("contact_flow")).toBe(true);
  expect((await resolveWebsiteCommercialAccess(f.business.id)).source).toBe("PLUS_INCLUDED");
  const current=await prisma.subscription.findUniqueOrThrow({where:{id:f.sub.id}});expect(current).toEqual(f.sub);
  if(manual)expect(f.port.subscription).not.toHaveBeenCalled();else expect((await f.provider.subscription(f.sub.mpSubscriptionId!)).auto_recurring.transaction_amount).toBe(44990);
 });
 it("requires valid amounts and grants no Plus for pending/rejected payments",async()=>{
  const f=await fixture(true);await executeLegacyPlusCheckout(f.business.id,f.op.id,f.user.email,f.provider);
  await expect(reconcileLegacyPlusPreference(f.business.id,f.op.id,payment(f,1),f.provider)).rejects.toThrow("PAYMENT_BINDING_MISMATCH");
  await reconcileLegacyPlusPreference(f.business.id,f.op.id,payment(f,f.op.expectedPaymentMinor!,"pending"),f.provider);
  expect((await getCommercialPlanAccess(f.business.id)).has("website.editor")).toBe(false);
 });
 it("recovers a provider timeout without creating a second checkout",async()=>{
  const f=await fixture(true);vi.mocked(f.port.preference).mockRejectedValueOnce(new Error("timeout after remote success"));
  expect((await executeLegacyPlusCheckout(f.business.id,f.op.id,f.user.email,f.provider)).status).toBe("UNKNOWN");
  expect((await executeLegacyPlusCheckout(f.business.id,f.op.id,f.user.email,f.provider)).status).toBe("UNKNOWN");expect(f.port.preference).toHaveBeenCalledOnce();
 });
 it("keeps the original pending agreement and trial deadline instead of creating another subscription",async()=>{
  const f=await fixture(false,true);const before=f.sub.trialEndsAt;
  const result=await executeLegacyPlusCheckout(f.business.id,f.op.id,f.user.email,f.provider);expect(result.checkoutUrl).toContain(f.sub.mpSubscriptionId!);
  expect(f.port.create).not.toHaveBeenCalled();expect(f.port.update).toHaveBeenCalledOnce();
  const current=await prisma.subscription.findUniqueOrThrow({where:{id:f.sub.id}});expect(current.trialEndsAt).toEqual(before);expect(current.mpSubscriptionId).toBe(f.sub.mpSubscriptionId);
  expect((await f.provider.subscription(f.sub.mpSubscriptionId!)).auto_recurring.start_date).toEqual(before);
 });
 it("processes a canonical renewal once without touching existing professional count",async()=>{
  vi.stubEnv("PURAGENDA_NEXT_ENABLED","1");const f=await fixture();await executeLegacyPlusCheckout(f.business.id,f.op.id,f.user.email,f.provider);
  await reconcileLegacyPlusPreference(f.business.id,f.op.id,payment(f),f.provider);
  const id=payment(f,44990),when=new Date(),invoice={id:randomUUID(),preapproval_id:f.sub.mpSubscriptionId!,debit_date:when.toISOString(),currency_id:"CLP",transaction_amount:44990,payment:{id,status:"approved"}};
  f.payments.get(id)!.external_reference="original_base";f.invoices.set(invoice.id,invoice);
  expect(await reconcileLegacyPlusInvoice(invoice,f.provider)).toBe(true);expect(await reconcileLegacyPlusInvoice(invoice,f.provider)).toBe(true);
  expect(await prisma.commercialPaymentEvidence.count({where:{paymentId:id}})).toBe(1);
  expect((await prisma.subscription.findUniqueOrThrow({where:{id:f.sub.id}})).staffLimitOverride).toBe(5);
 });
 it("records a received transfer for the retained base plus the accepted extension",async()=>{
  vi.stubEnv("PURAGENDA_NEXT_ENABLED","1");const f=await fixture(true);await executeLegacyPlusCheckout(f.business.id,f.op.id,f.user.email,f.provider);
  await reconcileLegacyPlusPreference(f.business.id,f.op.id,payment(f),f.provider);
  const from=f.sub.currentPeriodEnd!,through=new Date(+from+30*86400000);
  const input={businessId:f.business.id,reference:randomUUID(),amountClp:32990,paidFrom:from.toISOString(),paidThrough:through.toISOString(),expectedPeriodEnd:from.toISOString()};
  const dry=await recordManualSubscriptionPayment(input,false);expect(dry.blockers).toEqual([]);
  await recordManualSubscriptionPayment(input,true);expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.business.id}})).periodEnd).toEqual(through);
  expect((await prisma.subscription.findUniqueOrThrow({where:{id:f.sub.id}})).customMonthlyPriceClp).toBe(17990);
 });
 it("cancels only Plus renewal and keeps paid access and the base subscription",async()=>{
  const f=await fixture();await executeLegacyPlusCheckout(f.business.id,f.op.id,f.user.email,f.provider);await reconcileLegacyPlusPreference(f.business.id,f.op.id,payment(f),f.provider);
  await cancelLegacyPlus(f.business.id,f.user.id,f.provider);
  expect((await f.provider.subscription(f.sub.mpSubscriptionId!)).auto_recurring.transaction_amount).toBe(29990);
  expect((await getCommercialPlanAccess(f.business.id)).has("contact_flow")).toBe(true);expect(await prisma.subscription.findUnique({where:{id:f.sub.id}})).toEqual(f.sub);
 });
 it("revokes only Plus after a full refund and leaves the base agreement untouched",async()=>{
  const f=await fixture(true);await executeLegacyPlusCheckout(f.business.id,f.op.id,f.user.email,f.provider);const id=payment(f);await reconcileLegacyPlusPreference(f.business.id,f.op.id,id,f.provider);
  Object.assign(f.payments.get(id)!,{status:"refunded",transaction_amount_refunded:f.op.expectedPaymentMinor!,date_last_updated:new Date(Date.now()+1)});
  await reconcileLegacyPlusPreference(f.business.id,f.op.id,id,f.provider);
  const access=await getCommercialPlanAccess(f.business.id);expect(access.allowed).toBe(true);expect(access.has("contact_flow")).toBe(false);expect(await prisma.subscription.findUnique({where:{id:f.sub.id}})).toEqual(f.sub);
 });
});
