import { COMMERCIAL_PLAN_METADATA } from "@/core/commercial-catalog";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { backfillLegacySubscription } from "@/server/services/commercial-backfill.service";
import { prepareCommercialMigration, approveCommercialMigration, reconcileMigrationPayment,
  reconcileMigrationWebsiteAddon, applyApprovedCommercialMigration, getCommercialMigrationStatus } from "@/server/commercial-migration/service";
import { requestCommercialSeatChange } from "@/server/services/commercial-capacity.service";
import { prepareSandboxBillingOperation } from "@/server/commercial-billing/operations";
import { resolveWebsiteCommercialAccess, resolveWebsiteHostShadow } from "@/server/websites/commercial-access";
import { mpFixture, mpNotification, mpSignature, paddleFixture, paddleNotification, paddleSignature } from "../fixtures/commercial-provider-fixtures";
import { migrationContext } from "@/server/commercial-migration/preview";
import type { Prisma } from "@prisma/client";
const suite = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const businesses: string[] = [], users: string[] = [];
const review = { tax: true, renewal: true, specialTerms: true } as const;
async function legacy(plan: "INDIVIDUAL" | "EQUIPO" | "TEST" = "INDIVIDUAL", options: { addon?: boolean; founder?: boolean; subscription?: Prisma.SubscriptionUncheckedCreateWithoutBusinessInput } = {}) {
  const id = `migration-${randomUUID()}`; businesses.push(id);
  const owner = await prisma.user.create({ data: { name: "Anonymous owner", email: `${id}@example.invalid`, password: "fixture-only", role: "ADMIN" } }); users.push(owner.id);
  await prisma.business.create({ data: { id, name: "Anonymous migration fixture", slug: id, apiKey: randomUUID(), ownerId: owner.id } });
  const renewal = new Date(Date.now()+30_000), external = `fixture-base-${randomUUID()}`;
  await prisma.subscription.create({ data: { businessId: id, plan, status: "ACTIVE", isTrial: false, currentPeriodEnd: renewal,
    mpSubscriptionId: external, ...options.subscription } });
  if (options.addon) await prisma.websiteAddon.create({ data: { businessId: id, provider: "mercadopago", status: "ACTIVE",
    mpSubscriptionId: `fixture-web-${randomUUID()}`, validUntil: renewal } });
  if (options.founder) {
    const snapshot = await prisma.websiteLaunchSnapshot.create({ data: { id: id, launchAt: new Date(Date.now()-Math.floor(Math.random()*1e9)), capturedAt: new Date(), memberCount: 1 } });
    await prisma.websiteOfferEligibility.create({ data: { businessId: id, snapshotId: snapshot.id, eligibleAt: new Date(), offerCode: "BETA_FOUNDER" } });
  }
  await backfillLegacySubscription(id, true);
  const provider = mpFixture(true); provider.state.sub.id = external; provider.state.invoice.preapproval_id = external;
  provider.state.payment.id = Math.floor(Math.random()*1e9)+1000;provider.state.invoice.payment.id=provider.state.payment.id;
  return { businessId: id, actorId: owner.id, renewal, provider, dependencies: { adapter: provider.adapter, fixtureReview: review } };
}
type Fixture = Awaited<ReturnType<typeof legacy>>;
async function prepare(f: Fixture, plan: "PURAGENDA" | "PURAGENDA_PLUS" = "PURAGENDA_PLUS", seats = 1, key = randomUUID()) {
  return prepareCommercialMigration({ businessId: f.businessId, actorId: f.actorId, plan, professionalTotal: seats, effectiveAt: f.renewal, idempotencyKey: key }, f.dependencies);
}
async function approve(f: Fixture, proposal: Awaited<ReturnType<typeof prepare>>) {
  return approveCommercialMigration(f.businessId, f.actorId, proposal.id, proposal.previewHash, true, f.dependencies);
}
async function payment(f: Fixture, proposal: Awaited<ReturnType<typeof prepare>>, now = new Date(f.renewal.getTime()+10)) {
  f.provider.state.sub.external_reference=proposal.id;
  f.provider.state.sub.auto_recurring.transaction_amount=proposal.targetPlanCode === "PURAGENDA_PLUS" ? COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.baseMonthly : 12990;
  const preview = proposal.preview as { target: { monthlyTotal: number } };
  f.provider.state.sub.auto_recurring.transaction_amount=preview.target.monthlyTotal;
  f.provider.state.sub.next_payment_date=new Date(now.getTime()+30*86_400_000).toISOString();
  f.provider.state.invoice.debit_date=f.renewal.toISOString();
  f.provider.state.payment.transaction_amount=preview.target.monthlyTotal;
  f.provider.state.payment.date_last_updated=new Date().toISOString();
  const raw=mpNotification(randomUUID(),"payment",String(f.provider.state.payment.id));
  const observedAt=new Date(Math.max(Date.now(),now.getTime()));
  return { raw, now:observedAt, result: await reconcileMigrationPayment(proposal.id,raw,mpSignature(raw),f.provider.adapter,observedAt) };
}
async function website(f: Fixture) {
  const site=await prisma.businessWebsite.create({data:{businessId:f.businessId,subdomain:f.businessId,status:"PUBLISHED",
    draftConfig:{privateDraft:"keep"},publishedConfig:{publicContent:"keep"},publishedAt:new Date(),templateConfigs:{history:"keep"}}});
  await prisma.websiteDomain.create({data:{websiteId:site.id,hostname:`${f.businessId}.example.org`,status:"ACTIVE",tenantVerifiedAt:new Date(),verificationToken:"fixture-domain-proof"}});
  await prisma.websiteMedia.create({data:{websiteId:site.id,publicId:randomUUID(),secureUrl:`https://example.invalid/${site.id}.png`,width:10,height:10,format:"png",bytes:100,usage:"gallery"}});
  return prisma.businessWebsite.findUniqueOrThrow({where:{id:site.id},include:{domains:true,media:true}});
}
suite("commercial migration, web continuity and real PostgreSQL concurrency",()=>{
  afterAll(async()=>{
    await prisma.business.deleteMany({where:{id:{in:businesses}}});
    await prisma.websiteLaunchSnapshot.deleteMany({where:{id:{in:businesses}}});
    await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();
  });
  it.each(["INDIVIDUAL","EQUIPO"] as const)("prepares and explicitly applies %s to Standard with preserved legacy data",async plan=>{
    const f=await legacy(plan);const source=await prisma.subscription.findUnique({where:{businessId:f.businessId}});
    const p=await prepare(f,"PURAGENDA",plan==="EQUIPO"?5:1);
    expect(p.status).toBe("AWAITING_APPROVAL");expect((await resolveWebsiteCommercialAccess(f.businessId)).editor).toBe(false);
    await approve(f,p);expect((await payment(f,p)).result).toMatchObject({applied:true});
    expect(await prisma.subscription.findUnique({where:{businessId:f.businessId}})).toEqual(source);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.businessId}})).professionalTotal).toBe(plan==="EQUIPO"?5:1);
    expect((await resolveWebsiteCommercialAccess(f.businessId,new Date(f.renewal.getTime()+15))).bookingWidget).toBe(true);
  });
  it.each(["INDIVIDUAL","EQUIPO"] as const)("%s to Plus grants all web rights without creating an add-on",async plan=>{
    const f=await legacy(plan);const p=await prepare(f,"PURAGENDA_PLUS",3);await approve(f,p);
    expect((await resolveWebsiteCommercialAccess(f.businessId)).source).toBe("NONE");
    const {now,result}=await payment(f,p);expect(result).toMatchObject({applied:true});
    expect(await resolveWebsiteCommercialAccess(f.businessId,now)).toMatchObject({source:"PLUS_INCLUDED",editor:true,publish:true,hosting:true,domains:true,media:true,domainPurchaseIncluded:false});
    expect(await prisma.websiteAddon.count({where:{businessId:f.businessId}})).toBe(0);
  });
  it("blocks confirmation by default while provider and tax policies are unresolved",async()=>{
    const f=await legacy();const p=await prepareCommercialMigration({businessId:f.businessId,actorId:f.actorId,plan:"PURAGENDA_PLUS",professionalTotal:1,effectiveAt:f.renewal,idempotencyKey:randomUUID()},{adapter:f.provider.adapter});
    expect(p.status).toBe("BLOCKED");expect(p.reason).toContain("TAX_POLICY_UNRESOLVED");
    await expect(approve(f,p)).rejects.toThrow("PROPOSAL_NOT_CONFIRMABLE");
  });
  it.each([
    {customMonthlyPriceClp:9990,paymentMethod:"BANK_TRANSFER"}, {freeMonthsRemaining:2}, {pendingDiscountPercentage:20},
    {promoName:"preserved",promoDiscountPercentage:15,promoDiscountMonthsRemaining:2}, {paymentMethod:"BANK_TRANSFER",customMonthlyPriceClp:8000},
    {billingCycle:"ANNUAL"}, {status:"TRIALING",isTrial:true,trialEndsAt:new Date(Date.now()+86_400_000)}, {status:"PAST_DUE"}, {status:"CANCELLED"}, {plan:"TEST"}, {hasCountedAsPaidReferral:true},
  ] as Prisma.SubscriptionUncheckedCreateWithoutBusinessInput[])("preserves special legacy terms and blocks unresolved migration %#",async subscription=>{
    const f=await legacy("INDIVIDUAL",{subscription});const original=await prisma.subscription.findUnique({where:{businessId:f.businessId}});
    const p=await prepare(f);expect(p.status).toBe("BLOCKED");
    expect(await prisma.subscription.findUnique({where:{businessId:f.businessId}})).toEqual(original);
  });
  it("keeps founder price reference, offers, domains, media and paid access until verified cancellation",async()=>{
    const f=await legacy("INDIVIDUAL",{addon:true,founder:true});const site=await website(f);
    const addon=await prisma.websiteAddon.findUniqueOrThrow({where:{businessId:f.businessId}});
    const offer=await prisma.websiteOfferEligibility.findUniqueOrThrow({where:{businessId:f.businessId}});
    const p=await prepare(f);expect((p.preview as {website:{addon:{nominalReferencePrice:number}}}).website.addon.nominalReferencePrice).toBe(5990);
    await approve(f,p);
    expect(await resolveWebsiteCommercialAccess(f.businessId)).toMatchObject({source:"LEGACY",editor:true,hosting:true});
    expect((await getCommercialMigrationStatus(f.businessId,p.id,new Date(f.renewal.getTime()+10))).canPrepareBaseProviderChange).toBe(false);
    expect((await payment(f,p)).result).toMatchObject({applied:false,awaitingAddonCancellation:true});
    const webProvider=mpFixture();webProvider.state.sub.id=addon.mpSubscriptionId!;webProvider.state.sub.auto_recurring.transaction_amount=5990;
    webProvider.state.sub.status="authorized";
    expect(await reconcileMigrationWebsiteAddon(p.id,webProvider.adapter,new Date(f.renewal.getTime()+20))).toMatchObject({applied:false,awaitingAddonCancellation:true});
    webProvider.state.sub.status="cancelled";
    expect(await reconcileMigrationWebsiteAddon(p.id,webProvider.adapter,new Date(f.renewal.getTime()+25))).toMatchObject({applied:true});
    expect(await resolveWebsiteCommercialAccess(f.businessId,new Date(f.renewal.getTime()+30))).toMatchObject({source:"PLUS_INCLUDED",hosting:true});
    expect(await prisma.websiteAddon.findUnique({where:{businessId:f.businessId}})).toEqual(addon);
    expect(await prisma.websiteOfferEligibility.findUnique({where:{businessId:f.businessId}})).toEqual(offer);
    expect(await prisma.businessWebsite.findUnique({where:{id:site.id},include:{domains:true,media:true}})).toEqual(site);
    const hosting=await prisma.commercialEntitlement.findFirstOrThrow({where:{businessId:f.businessId,capability:"website.hosting",status:"ACTIVE"}});
    expect(hosting.validTo!.getTime()).toBeGreaterThan(addon.validUntil!.getTime());
  });
  it("UNKNOWN cancellation lookup recovers by canonical read without retrying a mutation",async()=>{
    const f=await legacy("INDIVIDUAL",{addon:true});const p=await prepare(f);await approve(f,p);
    const addon=await prisma.websiteAddon.findUniqueOrThrow({where:{businessId:f.businessId}});const reader=mpFixture();reader.state.sub.id=addon.mpSubscriptionId!;
    const get=reader.port.subscription;reader.port.subscription=async()=>{throw new Error("fixture network timeout");};
    expect(await reconcileMigrationWebsiteAddon(p.id,reader.adapter)).toMatchObject({unknown:true});
    reader.port.subscription=get;reader.state.sub.status="cancelled";
    await reconcileMigrationWebsiteAddon(p.id,reader.adapter);
    expect((await prisma.commercialWebsiteTransition.findUniqueOrThrow({where:{proposalId:p.id}})).status).toBe("CANCELLED_VERIFIED");
    expect(reader.state.calls).toBe(0);expect(f.provider.state.calls).toBe(0);
  });
  it("requires paid period continuity and unresolved checkout reconciliation",async()=>{
    const f=await legacy("INDIVIDUAL",{addon:true});const addon=await prisma.websiteAddon.update({where:{businessId:f.businessId},data:{validUntil:new Date(f.renewal.getTime()+86_400_000)}});
    await prisma.websiteCheckoutOperation.create({data:{id:randomUUID(),addonId:addon.id,state:"UNKNOWN",amount:9990,priceTier:"STANDARD",expiresAt:new Date(Date.now()+86_400_000)}});
    const p=await prepare(f);expect(p.reason).toContain("ADDON_PAID_PERIOD_MUST_CONTINUE");expect(p.reason).toContain("WEBSITE_CHECKOUT_UNRECONCILED");
  });
  it("saves a future paid change without granting rights before its effective date",async()=>{
    const f=await legacy();const p=await prepare(f);await approve(f,p);
    expect((await payment(f,p,new Date())).result).toMatchObject({scheduled:true,applied:false});
    expect((await resolveWebsiteCommercialAccess(f.businessId)).editor).toBe(false);
    expect(await applyApprovedCommercialMigration(f.businessId,p.id,new Date(f.renewal.getTime()+10))).toMatchObject({applied:true});
  });
  it("downgrade preserves web data, suspends shadow host and keeps booking widget",async()=>{
    const f=await legacy();const site=await website(f);const upgrade=await prepare(f);await approve(f,upgrade);const paid=await payment(f,upgrade);
    expect((await resolveWebsiteHostShadow(`${site.subdomain}.puragenda.cl`,paid.now)).state).toBe("AVAILABLE");
    const current=await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.businessId}});f.renewal=current.renewalAt!;
    const p=await prepareCommercialMigration({businessId:f.businessId,actorId:f.actorId,plan:"PURAGENDA",professionalTotal:1,effectiveAt:f.renewal,idempotencyKey:randomUUID()},f.dependencies,paid.now);
    await approve(f,p);
    expect((await resolveWebsiteCommercialAccess(f.businessId,paid.now)).editor).toBe(true);
    f.provider.state.payment.id++;f.provider.state.invoice.payment.id=f.provider.state.payment.id;
    const down=await payment(f,p,new Date(f.renewal.getTime()+10));expect(down.result).toMatchObject({applied:true});
    expect(await resolveWebsiteCommercialAccess(f.businessId,down.now)).toMatchObject({editor:false,publish:false,hosting:false,bookingWidget:true});
    expect(await resolveWebsiteHostShadow(`${site.subdomain}.puragenda.cl`,down.now)).toEqual({state:"SUSPENDED",site:null});
    expect(await prisma.businessWebsite.findUnique({where:{id:site.id},include:{domains:true,media:true}})).toEqual(site);
  });
  it("invalidates obsolete local, provider and price previews",async()=>{
    const f=await legacy();const p=await prepare(f);
    f.provider.state.sub.status="cancelled";
    expect((await approve(f,p)).status).toBe("INVALIDATED");
    const other=await legacy();const p2=await prepare(other);
    await prisma.subscription.update({where:{businessId:other.businessId},data:{extraStaffCount:1}});
    expect((await approve(other,p2)).status).toBe("INVALIDATED");
  });
  it("enforces immutable payloads in PostgreSQL and rejects altered approval hashes/dates",async()=>{
    const f=await legacy();const p=await prepare(f);
    await expect(prisma.commercialMigrationProposal.update({where:{id:p.id},data:{effectiveAt:new Date()}})).rejects.toThrow();
    await expect(prisma.commercialMigrationProposal.update({where:{id:p.id},data:{preview:{target:{monthlyTotal:1}}}})).rejects.toThrow();
    await expect(approveCommercialMigration(f.businessId,f.actorId,p.id,"0".repeat(64),true,f.dependencies)).rejects.toThrow("PREVIEW_HASH_MISMATCH");
    await expect(approveCommercialMigration(f.businessId,f.actorId,p.id,p.previewHash,false,f.dependencies)).rejects.toThrow("EXPLICIT_ACCEPTANCE_REQUIRED");
  });
  it("has one approved contract under concurrent upgrade/downgrade and idempotent retries",async()=>{
    const f=await legacy();const key=randomUUID();const same=await Promise.all([prepare(f,"PURAGENDA_PLUS",1,key),prepare(f,"PURAGENDA_PLUS",1,key)]);
    expect(same[0].id).toBe(same[1].id);
    const other=await prepare(f,"PURAGENDA");
    const approvals=await Promise.allSettled([approve(f,same[0]),approve(f,other)]);expect(approvals.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    const winner=approvals[0].status==="fulfilled"?same[0]:other;
    const double=await Promise.all([approve(f,winner),approve(f,winner)]);expect(double.every(p=>!!p.approvedAt)).toBe(true);
    const done=await payment(f,winner);expect(done.result).toMatchObject({applied:true});
    expect(await reconcileMigrationPayment(winner.id,done.raw,mpSignature(done.raw),f.provider.adapter,done.now)).toMatchObject({duplicate:true});
    expect(await applyApprovedCommercialMigration(f.businessId,winner.id,done.now)).toMatchObject({alreadyApplied:true});
  });
  it("serializes migration against seat changes and billing operations",async()=>{
    const f=await legacy();const p=await prepare(f);await approve(f,p);
    await expect(requestCommercialSeatChange({businessId:f.businessId,idempotencyKey:randomUUID(),requestedProfessionalTotal:2,effectiveAt:f.renewal})).rejects.toThrow("COMMERCIAL_MIGRATION_OPEN");
    await expect(prepareSandboxBillingOperation({businessId:f.businessId,provider:"MERCADO_PAGO",plan:"PURAGENDA_PLUS",professionalTotal:2,strategy:"NEXT_RENEWAL",effectiveAt:f.renewal,idempotencyKey:randomUUID()})).rejects.toThrow("COMMERCIAL_MIGRATION_OPEN");
  });
  it("rejects foreign owner/business, provider mismatch, insufficient payments and invalid signatures",async()=>{
    const f=await legacy();const other=await legacy();const p=await prepare(f);await approve(f,p);
    await expect(approveCommercialMigration(f.businessId,other.actorId,p.id,p.previewHash,true,f.dependencies)).rejects.toThrow("OWNER_REQUIRED");
    await expect(applyApprovedCommercialMigration(other.businessId,p.id)).rejects.toThrow();
    await expect(reconcileMigrationPayment(p.id,"{}",new Headers(),f.provider.adapter)).rejects.toThrow();
    const wrong=mpFixture(true);wrong.state.sub.external_reference=p.id;
    const raw=mpNotification(randomUUID(),"payment");
    await expect(reconcileMigrationPayment(p.id,raw,mpSignature(raw),wrong.adapter)).rejects.toThrow("MIGRATION_PROVIDER_BINDING_MISMATCH");
    f.provider.state.sub.external_reference=p.id;f.provider.state.sub.auto_recurring.transaction_amount=COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.baseMonthly;
    f.provider.state.invoice.debit_date=f.renewal.toISOString();f.provider.state.payment.transaction_amount=1;f.provider.state.payment.date_last_updated=new Date().toISOString();
    const insufficient=mpNotification(randomUUID(),"payment",String(f.provider.state.payment.id));
    await expect(reconcileMigrationPayment(p.id,insufficient,mpSignature(insufficient),f.provider.adapter,new Date(f.renewal.getTime()+10))).rejects.toThrow("MIGRATION_PAYMENT_MISMATCH");
    expect((await resolveWebsiteCommercialAccess(f.businessId)).editor).toBe(false);
  });
  it("refund after application revokes shadow rights and stale payment cannot restore them",async()=>{
    const f=await legacy();const p=await prepare(f);await approve(f,p);const done=await payment(f,p);
    const paidAt=f.provider.state.payment.date_last_updated;
    f.provider.state.payment.status="refunded";f.provider.state.payment.date_last_updated=new Date(Date.now()+2).toISOString();
    let raw=mpNotification(randomUUID(),"payment",String(f.provider.state.payment.id));
    expect(await reconcileMigrationPayment(p.id,raw,mpSignature(raw),f.provider.adapter,done.now)).toMatchObject({reversed:true});
    f.provider.state.payment.status="approved";f.provider.state.payment.date_last_updated=paidAt;
    raw=mpNotification(randomUUID(),"payment",String(f.provider.state.payment.id));
    expect(await reconcileMigrationPayment(p.id,raw,mpSignature(raw),f.provider.adapter,done.now)).toMatchObject({ignored:true});
    expect((await resolveWebsiteCommercialAccess(f.businessId,done.now)).hosting).toBe(false);
  });
  it("rolls back all commercial changes when persistence fails during application",async()=>{
    const f=await legacy();const p=await prepare(f);await approve(f,p);
    const original=await prisma.commercialSubscription.findUniqueOrThrow({where:{businessId:f.businessId}});
    const pool=new pg.Pool({connectionString:process.env.COMMERCIAL_V2_TEST_DATABASE_URL});
    try {
      await pool.query(`CREATE FUNCTION commercial_migration_fixture_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${p.id}' AND NEW.status='APPLIED' THEN RAISE EXCEPTION 'fixture persistence failure'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER commercial_migration_fixture_failure BEFORE UPDATE ON "CommercialMigrationProposal" FOR EACH ROW EXECUTE FUNCTION commercial_migration_fixture_failure();`);
      await expect(payment(f,p)).rejects.toThrow();
      expect(await prisma.commercialSubscription.findUnique({where:{businessId:f.businessId}})).toEqual(original);
      expect(await prisma.commercialMigrationEvidence.count({where:{proposalId:p.id}})).toBe(0);
    } finally {await pool.query('DROP TRIGGER commercial_migration_fixture_failure ON "CommercialMigrationProposal"; DROP FUNCTION commercial_migration_fixture_failure()');await pool.end();}
    expect((await payment(f,p)).result).toMatchObject({applied:true});expect(f.provider.state.calls).toBe(0);
  });
  it("Paddle canonical paid migration reuses signed SDK evidence without mutating items",async()=>{
    const f=await legacy();const provider=paddleFixture("prorated_immediately",true);const sub=provider.state.subscription.id;
    provider.state.immediate=COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.baseMonthly;
    await prisma.subscription.update({where:{businessId:f.businessId},data:{mpSubscriptionId:null,paddleSubscriptionId:sub}});
    await prisma.commercialSubscription.update({where:{businessId:f.businessId},data:{provider:"PADDLE",externalSubscriptionId:sub}});
    f.dependencies={adapter:provider.adapter,fixtureReview:review} as unknown as Fixture["dependencies"];
    const p=await prepare(f);await approve(f,p);
    provider.bind(migrationContext(p.id,f.businessId,{plan:"PURAGENDA_PLUS",professionalTotal:1,effectiveAt:f.renewal},sub),COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.baseMonthly);
    provider.state.transaction.id=`txn_${randomUUID().replaceAll("-", "").slice(0,26)}`;
    provider.state.transaction.billingPeriod={startsAt:f.renewal.toISOString(),endsAt:new Date(f.renewal.getTime()+30*86_400_000).toISOString()};
    provider.state.subscription.currentBillingPeriod=provider.state.transaction.billingPeriod;
    const raw=paddleNotification(randomUUID(),"transaction.completed",provider.state.transaction.id);
    expect(await reconcileMigrationPayment(p.id,raw,paddleSignature(raw),provider.adapter,new Date(f.renewal.getTime()+10))).toMatchObject({applied:true});
    expect(provider.state.calls).toBe(0);
  });
  it("new migration tables keep RLS, revoked grants and tenant constraints",async()=>{
    const f=await legacy(),other=await legacy();const p=await prepare(f);
    await expect(prisma.commercialMigrationEvidence.create({data:{proposalId:p.id,businessId:other.businessId,provider:"MERCADO_PAGO",eventId:randomUUID(),payloadHash:"fixture-hash",
      origin:"CONTRACT_FIXTURE",state:"PENDING",currencyCode:"CLP",providerSubscriptionId:f.provider.state.sub.id,resourceUpdatedAt:new Date()}})).rejects.toThrow();
    const pool=new pg.Pool({connectionString:process.env.COMMERCIAL_V2_TEST_DATABASE_URL});
    try { for (const table of ["CommercialMigrationProposal","CommercialMigrationEvidence","CommercialWebsiteTransition"]) {
      expect((await pool.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',[`"${table}"`])).rows[0].relrowsecurity).toBe(true);
      expect((await pool.query('SELECT has_table_privilege($1,$2,$3) AS allowed',["authenticated",`"${table}"`,"SELECT,INSERT,UPDATE,DELETE"])).rows[0].allowed).toBe(false);
    }} finally {await pool.end();}
  });
  it("a scheduled Paddle add-on cancellation is not a confirmed cancellation",async()=>{
    const f=await legacy("INDIVIDUAL",{addon:true});const reader=paddleFixture();
    await prisma.websiteAddon.update({where:{businessId:f.businessId},data:{provider:"paddle",mpSubscriptionId:null,paddleSubscriptionId:reader.state.subscription.id}});
    const p=await prepare(f);await approve(f,p);
    reader.port.subscription=async()=>({...reader.state.subscription,scheduledChange:{action:"cancel",effectiveAt:f.renewal.toISOString()}});
    expect(await reconcileMigrationWebsiteAddon(p.id,reader.adapter)).toMatchObject({awaitingPayment:true});
    expect((await prisma.commercialWebsiteTransition.findUniqueOrThrow({where:{proposalId:p.id}})).status).toBe("SCHEDULED");
    expect((await getCommercialMigrationStatus(f.businessId,p.id,new Date(f.renewal.getTime()+10))).canPrepareBaseProviderChange).toBe(false);
    expect(reader.state.calls).toBe(0);
  });
  it("a canceled base contract revokes migrated web and a stale paid event cannot restore it",async()=>{
    const f=await legacy();const p=await prepare(f);await approve(f,p);const done=await payment(f,p);
    f.provider.state.sub.status="cancelled";f.provider.state.sub.last_modified=new Date(Date.now()+1).toISOString();
    const raw=mpNotification(randomUUID(),"subscription_preapproval",f.provider.state.sub.id);
    expect(await reconcileMigrationPayment(p.id,raw,mpSignature(raw),f.provider.adapter,done.now)).toMatchObject({lifecycleUpdated:true});
    expect((await resolveWebsiteCommercialAccess(f.businessId,done.now)).hosting).toBe(false);
    f.provider.state.sub.status="authorized";
    const stale=mpNotification(randomUUID(),"payment",String(f.provider.state.payment.id));
    expect(await reconcileMigrationPayment(p.id,stale,mpSignature(stale),f.provider.adapter,done.now)).toMatchObject({ignored:true});
    expect((await resolveWebsiteCommercialAccess(f.businessId,done.now)).hosting).toBe(false);
  });
  it("blocks ambiguous base providers and active-staff reductions",async()=>{
    const f=await legacy();await prisma.subscription.update({where:{businessId:f.businessId},data:{paddleSubscriptionId:`fixture-${randomUUID()}`}});
    await prisma.staff.createMany({data:[{businessId:f.businessId,name:"A"},{businessId:f.businessId,name:"B"}]});
    const p=await prepare(f);expect(p.reason).toContain("MULTIPLE_BASE_PROVIDERS");expect(p.reason).toContain("ACTIVE_STAFF_CONFLICT");
  });
  it("preserves purchased extra-professional capacity and rejects changed provider monetary preview",async()=>{
    const f=await legacy("EQUIPO",{subscription:{extraStaffCount:3}});const p=await prepare(f,"PURAGENDA_PLUS",8);
    expect((p.preview as {current:{contractedProfessionals:number}}).current.contractedProfessionals).toBe(8);
    const original=f.provider.adapter.preview.bind(f.provider.adapter);
    f.provider.adapter.preview=async context=>({...await original(context),expectedPaymentMinor:1});
    expect((await approve(f,p)).status).toBe("INVALIDATED");
  });
  it("rejects old-contract paid periods and permits only one concurrent payment application",async()=>{
    const f=await legacy();const p=await prepare(f);await approve(f,p);
    const done=await payment(f,p,new Date());expect(done.result).toMatchObject({scheduled:true});
    f.provider.state.invoice.debit_date=new Date(f.renewal.getTime()-86_400_000).toISOString();
    const old=mpNotification(randomUUID(),"payment",String(f.provider.state.payment.id));
    await expect(reconcileMigrationPayment(p.id,old,mpSignature(old),f.provider.adapter,new Date())).rejects.toThrow("MIGRATION_PAYMENT_MISMATCH");
    f.provider.state.invoice.debit_date=f.renewal.toISOString();
    const raw=mpNotification(randomUUID(),"payment",String(f.provider.state.payment.id));const now=new Date(f.renewal.getTime()+10);
    const results=await Promise.all([reconcileMigrationPayment(p.id,raw,mpSignature(raw),f.provider.adapter,now),reconcileMigrationPayment(p.id,raw,mpSignature(raw),f.provider.adapter,now)]);
    expect(results.filter(r=>r.applied)).toHaveLength(1);expect(results.filter(r=>"duplicate" in r&&r.duplicate)).toHaveLength(1);
  });
});
