import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { commercialQuote, commercialRegisterUrl, hasPaidBase, publicWebsiteMonthly, registrationIntent } from "@/websites/commercial";
import { publicWebsiteAcquisitionEnabled } from "@/server/websites/public-acquisition";
import { WEBSITE_CATALOG, WEBSITE_ONBOARDING_OPTION, websitePriceTier } from "@/websites/offers";
import { WebsiteCommercialSection } from "@/components/website-commercial-section";
import { registerSchema } from "@/server/validations/auth";
import { sanitizeTrackingProperties } from "@/lib/analytics/events";
import { generateMetadata } from "@/app/pricing/page";
import sitemap from "@/app/sitemap";

describe("public Website commercial contract", () => {
  it.each([["INDIVIDUAL",12990,22980],["EQUIPO",29990,39980]] as const)("derives %s base and bundle from existing catalogs", (plan, base, total) => {
    expect(commercialQuote(plan,"monthly").baseCharge).toBe(base);
    expect(commercialQuote(plan,"monthly",0,true).monthlyTotal).toBe(total);
    expect(publicWebsiteMonthly).toBe(Number(WEBSITE_CATALOG.STANDARD.amount));
    expect(WEBSITE_ONBOARDING_OPTION.selectedByDefault).toBe(false);
  });
  it("adds Equipo professionals normally and clamps malformed counts", () => {
    expect(commercialQuote("EQUIPO","monthly",2,true).monthlyTotal).toBe(45980);
    expect(commercialQuote("INDIVIDUAL","monthly",20,true).monthlyTotal).toBe(22980);
    expect(commercialQuote("EQUIPO","monthly",Infinity).extras).toBe(20);
    expect(commercialQuote("EQUIPO","monthly",NaN).extras).toBe(0);
  });
  it.each(["INDIVIDUAL","EQUIPO"] as const)("annual %s has no combined monthly amount or Website discount", plan => {
    const monthly = commercialQuote(plan,"monthly",2,true), annual = commercialQuote(plan,"annual",2,true);
    expect(annual.baseCharge).toBe(monthly.baseMonthly * 10);
    expect(annual.websiteMonthly).toBe(9990); expect(annual.monthlyTotal).toBeNull();
  });
  it("persists only selection inputs in register URLs, including annual and trial", () => {
    const url = commercialRegisterUrl("EQUIPO","annual",2,true,true);
    const parsed = registrationIntent(new URL(url,"https://example.test").searchParams);
    expect(parsed).toEqual({ plan:"EQUIPO",cycle:"annual",extraStaff:2,website:true,trial:true });
    expect(url).not.toMatch(/amount|tier|FOUNDER|priceId/);
    expect(registrationIntent(new URLSearchParams("plan=INDIVIDUAL" )).website).toBe(false);
    expect(registrationIntent(new URLSearchParams("website=1&plan=TEST" )).website).toBe(false);
  });
  it("query tampering never gives new businesses Founder or a different amount", () => {
    const intent=registrationIntent(new URLSearchParams("plan=INDIVIDUAL&website=1&amount=1&tier=BETA_FOUNDER&priceId=forged"));
    expect(intent.website).toBe(true); expect(websitePriceTier(null)).toBe("STANDARD");
    expect(commercialQuote(intent.plan!,intent.cycle,0,true).websiteMonthly).toBe(9990);
    expect(websitePriceTier({offerCode:"BETA_FOUNDER"})).toBe("BETA_FOUNDER");
  });
  it("server schema accepts a separate boolean, keeps honeypot name reserved, strips commercial authority fields", () => {
    const data={email:"qa@example.test",password:"valid-password",name:"QA Owner",businessName:"QA Business",countryCode:"AR",marketplaceCategorySlug:"barberias",marketplaceCityName:"Local QA",termsAccepted:true, websiteIntent:true,billingCycle:"ANNUAL", amount:1,tier:"BETA_FOUNDER",providerPriceId:"fake"};
    const parsed=registerSchema.parse(data);
    expect(parsed.websiteIntent).toBe(true); expect(parsed.billingCycle).toBe("ANNUAL");
    expect(parsed).not.toHaveProperty("amount"); expect(parsed).not.toHaveProperty("tier");expect(parsed).not.toHaveProperty("providerPriceId");
    expect(registerSchema.safeParse({...data,websiteIntent:"1"}).success).toBe(false);
  });
  it("public purchase requires its own explicit GO and provider configuration", () => {
    const env={ WEBSITE_CHECKOUT_ENABLED:"1",MERCADOPAGO_ACCESS_TOKEN:"local-only",MERCADOPAGO_WEBHOOK_SECRET:"local-only" };
    expect(publicWebsiteAcquisitionEnabled(env)).toBe(false);
    expect(publicWebsiteAcquisitionEnabled({...env,WEBSITE_PUBLIC_ACQUISITION_ENABLED:"1"})).toBe(true);
    expect(publicWebsiteAcquisitionEnabled({...env,WEBSITE_PUBLIC_ACQUISITION_ENABLED:"1",WEBSITE_CHECKOUT_ENABLED:"0"})).toBe(false);
  });
  it.each(["TRIALING","INACTIVE","PAST_DUE","CANCELLED"])("%s BASE cannot start Standard Website", status => {
    expect(hasPaidBase({status,isTrial:false,currentPeriodEnd:new Date(Date.now()+86400000)})).toBe(false);
  });
  it("paid BASE must be unexpired and non-trial", () => {
    const sub={status:"ACTIVE",isTrial:false,currentPeriodEnd:new Date(Date.now()+86400000)};
    expect(hasPaidBase(sub)).toBe(true); expect(hasPaidBase({...sub,isTrial:true})).toBe(false);
    expect(hasPaidBase({...sub,currentPeriodEnd:new Date(0)})).toBe(false);
  });
  it("shows real templates, separate billing and domain exclusion, never public Founder", () => {
    const html=renderToStaticMarkup(createElement(WebsiteCommercialSection,{}));
    expect(html).toContain("9.990"); expect(html).not.toContain("5.990");
    expect(html).toContain("compra del dominio no está incluida");expect(html).toContain("dos suscripciones recurrentes independientes");
    for (const key of ["bella","matchday","ritual"]) expect(html).toContain(`/website-preview?template=${key}`);
    expect(html).toContain("Contratación pública del sitio próximamente");
  });
  it("funnel properties are whitelisted, enum checked and contain no tenant/PII", () => {
    const pii={ email:"qa@example.test",businessId:"tenant",hostname:"tenant.test",domain:"tenant.test",token:"secret" };
    expect(sanitizeTrackingProperties("website_addon_toggled",{...pii,plan:"EQUIPO",selected:true,billing_cycle:"annual"})).toEqual({plan:"EQUIPO",selected:true,billing_cycle:"annual"});
    expect(sanitizeTrackingProperties("website_addon_toggled",{selected:"qa@example.test",plan:"qa@example.test",billing_cycle:"qa@example.test"})).toEqual({});
    expect(sanitizeTrackingProperties("registration_started",{...pii,website_intent:true})).toEqual({website_intent:true});
  });
  it("pricing canonical and sitemap are stable", async () => {
    const metadata=await generateMetadata();
    expect(metadata.alternates?.canonical).toBe("https://www.puragenda.cl/pricing");
    expect(metadata.description).toContain("facturación independiente");
    const urls=sitemap().map(item=>item.url);
    expect(urls).toContain("https://www.puragenda.cl/pricing");
    expect(urls.some(url=>url.includes("onboarding"))).toBe(false);
  });
});
