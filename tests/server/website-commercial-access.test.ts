import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({business:vi.fn(),retired:vi.fn(),user:vi.fn(),sessionBusiness:vi.fn(),permission:vi.fn(),member:vi.fn(),location:vi.fn(),site:vi.fn(),domain:vi.fn()}));
vi.mock("@/server/db/prisma",()=>({prisma:{business:{findUnique:mocks.business},commercialWebsiteTransition:{findFirst:mocks.retired},
  staff:{findFirst:mocks.member},businessLocation:{findFirst:mocks.location},businessWebsite:{findUnique:mocks.site,findFirst:mocks.domain}}}));
vi.mock("@/server/auth/user-session",()=>({getCurrentSessionUser:mocks.user}));
vi.mock("@/server/services/business.service",()=>({getBusinessForUser:mocks.sessionBusiness}));
vi.mock("@/server/services/permissions.service",()=>({hasBusinessPermission:mocks.permission}));
import {resolveWebsiteCommercialAccess,evaluateSessionWebsiteAccessShadow,resolveWebsiteHostShadow,selectWebsiteGateShadow,assertStandaloneWebsiteCheckoutShadow} from "@/server/websites/commercial-access";
const now=new Date("2026-10-22T12:00:00Z");
const past=new Date(now.getTime()-86_400_000),future=new Date(now.getTime()+86_400_000);
function fixture(plan="PURAGENDA_PLUS",status="ACTIVE",paid=true){return {deletedAt:null,subscription:null as unknown,websiteAddon:null as unknown,websiteOfferEligibility:null as unknown,
  commercialSubscription:{id:"commercial-a",businessId:"business-a",planCode:plan,status,professionalTotal:1,periodStart:past,periodEnd:future,
    trialEnd:future,gracePeriodEndsAt:future,lastPaymentStatus:paid?"CONFIRMED":null,lastPaymentAt:paid?past:null,lastPaymentEventId:paid?"verified-evidence":null}};}
describe("one shadow website entitlement policy",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();mocks.business.mockResolvedValue(fixture());mocks.retired.mockResolvedValue(null);
    mocks.user.mockResolvedValue({id:"owner-a",role:"ADMIN"});mocks.sessionBusiness.mockResolvedValue({id:"business-a",ownerId:"owner-a",deletedAt:null});
    mocks.permission.mockResolvedValue(true);mocks.member.mockResolvedValue({id:"staff-a"});mocks.location.mockResolvedValue(null);
  });
  it.each([
    ["PURAGENDA","ACTIVE",true,false],["PURAGENDA_PLUS","ACTIVE",true,true],
    ["PURAGENDA_PLUS","PENDING_PAYMENT",false,false],["PURAGENDA_PLUS","ACTIVE",false,false],
    ["PURAGENDA_PLUS","CANCELLED",true,false],["PURAGENDA_PLUS","UNKNOWN",true,false],
    ["PURAGENDA_PLUS","PAST_DUE_BLOCKED",true,false],["PURAGENDA_PLUS","PAST_DUE_GRACE",true,true],
    ["PURAGENDA_PLUS","SCHEDULED_CHANGE",true,true],["PURAGENDA_PLUS","TRIALING",false,false],
  ])("plan %s status %s paid %s resolves web %s",async(plan,status,paid,expected)=>{
    mocks.business.mockResolvedValue(fixture(String(plan),String(status),Boolean(paid)));
    expect(await resolveWebsiteCommercialAccess("business-a",now)).toMatchObject({editor:expected,publish:expected,hosting:expected,domains:expected,media:expected,domainPurchaseIncluded:false,changesEffectiveAccess:false});
  });
  it("standard keeps public link and widget without full website",async()=>{
    mocks.business.mockResolvedValue(fixture("PURAGENDA"));
    expect(await resolveWebsiteCommercialAccess("business-a",now)).toMatchObject({bookingLink:true,bookingWidget:true,editor:false});
  });
  it("Plus cannot start a second standalone web subscription and Standard requires upgrade",async()=>{
    await expect(assertStandaloneWebsiteCheckoutShadow("business-a",now)).rejects.toThrow("WEBSITE_ALREADY_INCLUDED_IN_PLUS");
    mocks.business.mockResolvedValue(fixture("PURAGENDA"));
    await expect(assertStandaloneWebsiteCheckoutShadow("business-a",now)).rejects.toThrow("UPGRADE_TO_PLUS_REQUIRED");
  });
  it("rejects expired periods, future periods, grace expiry and deleted tenants",async()=>{
    let b=fixture();b.commercialSubscription.periodEnd=past;mocks.business.mockResolvedValue(b);
    expect((await resolveWebsiteCommercialAccess("business-a",now)).hosting).toBe(false);
    b=fixture();b.commercialSubscription.periodStart=future;mocks.business.mockResolvedValue(b);
    expect((await resolveWebsiteCommercialAccess("business-a",now)).hosting).toBe(false);
    b=fixture("PURAGENDA_PLUS","PAST_DUE_GRACE");b.commercialSubscription.gracePeriodEndsAt=past;mocks.business.mockResolvedValue(b);
    expect((await resolveWebsiteCommercialAccess("business-a",now)).hosting).toBe(false);
    mocks.business.mockResolvedValue({...fixture(),deletedAt:past});
    expect((await resolveWebsiteCommercialAccess("business-a",now)).hosting).toBe(false);
  });
  it("legacy paid add-on preserves editor/publication and founder offer is not recalculated",async()=>{
    const b=fixture("INDIVIDUAL");b.subscription={status:"ACTIVE"};b.websiteAddon={id:"addon",status:"ACTIVE",validUntil:future};
    b.websiteOfferEligibility={offerCode:"BETA_FOUNDER",eligibleAt:past};mocks.business.mockResolvedValue(b);
    expect(await resolveWebsiteCommercialAccess("business-a",now)).toMatchObject({source:"LEGACY",editor:true,publish:true,hosting:true});
    expect(mocks.retired).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({businessId:"business-a",addonId:"addon"})}));
  });
  it("honors valid founder trial and stops after its exact existing expiration",async()=>{
    const b=fixture("INDIVIDUAL");b.subscription={status:"ACTIVE"};
    b.websiteOfferEligibility={offerCode:"BETA_FOUNDER",trialStartedAt:past,trialEndsAt:new Date(past.getTime()+15*86_400_000),trialConsumedAt:past};
    mocks.business.mockResolvedValue(b);
    expect((await resolveWebsiteCommercialAccess("business-a",now)).editor).toBe(true);
    expect((await resolveWebsiteCommercialAccess("business-a",new Date(past.getTime()+15*86_400_000))).editor).toBe(false);
  });
  it("a retired add-on cannot regrant access after Plus downgrade",async()=>{
    const b=fixture("PURAGENDA");b.subscription={status:"ACTIVE"};b.websiteAddon={id:"addon",status:"ACTIVE",validUntil:future};
    mocks.business.mockResolvedValue(b);mocks.retired.mockResolvedValue({id:"transition"});
    expect((await resolveWebsiteCommercialAccess("business-a",now)).editor).toBe(false);
  });
  it("does not elevate an employee role or a nonmember with website entitlement",async()=>{
    mocks.user.mockResolvedValue({id:"employee",role:"RECEPTIONIST"});mocks.permission.mockResolvedValue(false);
    expect((await evaluateSessionWebsiteAccessShadow("editor")).allowed).toBe(false);
    mocks.permission.mockResolvedValue(true);mocks.member.mockResolvedValue(null);
    expect((await evaluateSessionWebsiteAccessShadow("publish")).allowed).toBe(false);
  });
  it("requires session authentication and server-derived business",async()=>{
    await evaluateSessionWebsiteAccessShadow("editor");expect(mocks.sessionBusiness).toHaveBeenCalledWith("owner-a");
    mocks.user.mockResolvedValue(null);await expect(evaluateSessionWebsiteAccessShadow("editor")).rejects.toThrow("UNAUTHENTICATED");
  });
  it("scopes a staff member to their assigned active branch",async()=>{
    mocks.user.mockResolvedValue({id:"employee",role:"STAFF"});
    await evaluateSessionWebsiteAccessShadow("editor","location-b");
    expect(mocks.location).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id:"location-b",businessId:"business-a",staff:{some:{isActive:true,staff:{userId:"employee",businessId:"business-a",isActive:true}}}})}));
    mocks.location.mockResolvedValue({id:"location-a"});expect((await evaluateSessionWebsiteAccessShadow("editor","location-a")).allowed).toBe(true);
    mocks.location.mockResolvedValue(null);expect((await evaluateSessionWebsiteAccessShadow("editor","location-b")).allowed).toBe(false);
  });
  it("resolves only the exact verified hostname and exposes no private data when suspended",async()=>{
    const site={id:"site-a",businessId:"business-a",subdomain:"studio-a",status:"PUBLISHED",publishedConfig:{public:"content"},draftConfig:{private:"secret"}};
    mocks.domain.mockResolvedValue(site);mocks.site.mockResolvedValue(site);
    const visible=await resolveWebsiteHostShadow("studio-a.example.org",now);
    expect(visible).toMatchObject({state:"AVAILABLE",site:{id:"site-a"}});expect(visible.site).not.toHaveProperty("draftConfig");
    expect(mocks.domain).toHaveBeenCalledWith({where:{domains:{some:{hostname:"studio-a.example.org",status:"ACTIVE",tenantVerifiedAt:{not:null}}}}});
    mocks.business.mockResolvedValue(fixture("PURAGENDA"));
    expect(await resolveWebsiteHostShadow("studio-a.puragenda.cl",now)).toEqual({state:"SUSPENDED",site:null});
    mocks.domain.mockResolvedValue(null);expect(await resolveWebsiteHostShadow("unknown.example.org",now)).toEqual({state:"NOT_FOUND",site:null});
  });
  it("keeps the legacy gate by default and rejects a production cutover even if opted in",()=>{
    vi.stubEnv("COMMERCIAL_V2_WEBSITE_GATES","0");
    expect(selectWebsiteGateShadow(true,false)).toEqual({allowed:true,source:"LEGACY_GATE"});
    expect(selectWebsiteGateShadow(false,true)).toEqual({allowed:false,source:"LEGACY_GATE"});
    vi.stubEnv("COMMERCIAL_V2_WEBSITE_GATES","1");vi.stubEnv("NODE_ENV","production");
    expect(()=>selectWebsiteGateShadow(true,true)).toThrow("COMMERCIAL_WRITES_DISABLED");
    vi.unstubAllEnvs();
  });
});
