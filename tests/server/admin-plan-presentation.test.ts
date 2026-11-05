import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/server/db/prisma", () => ({ prisma: {} }));
vi.mock("@/server/actions/admin.actions", () => ({ extendTrialAction: vi.fn(), updateSubscriptionAction: vi.fn(), createBusinessAction: vi.fn(), applySubscriptionBenefitPresetAction: vi.fn(), clearSubscriptionBenefitAction: vi.fn(), syncSubscriptionBillingAction: vi.fn(), updateSubscriptionBillingRulesAction: vi.fn() }));
import { getAdminSubscriptionReport } from "@/server/services/admin-subscription-report";
import { BusinessesClient } from "@/app/para/x7k9m2v4q8/(panel)/businesses/businesses-client";
import { SubscriptionEditor } from "@/app/para/x7k9m2v4q8/(panel)/businesses/[id]/subscription-editor";
import { SubscriptionsClient } from "@/app/para/x7k9m2v4q8/(panel)/subscriptions/subscriptions-client";
import NewBusinessPage from "@/app/para/x7k9m2v4q8/(panel)/businesses/new/page";
import type { ComponentProps } from "react";

const now = new Date();
const subscription = { id: "synthetic-sub", plan: "EQUIPO" as const, status: "ACTIVE" as const, isTrial: false, billingCycle: "MONTHLY" as const, extraStaffCount: 0, staffLimitOverride: 2, paymentMethod: "AUTOMATIC" as const, mpSubscriptionId: "synthetic-provider", paddleSubscriptionId: null, trialEndsAt: null, currentPeriodEnd: null, createdAt: now, recurringPriceOverrideClp: 17990 };
const report = getAdminSubscriptionReport(subscription, { countryCode: "CL" });
const business = { id: "synthetic-business", name: "Synthetic business", slug: "synthetic-business", countryCode: "CL", createdAt: now, subscription, billingReport: report, owner: { name: "Synthetic owner", email: "owner@example.invalid" }, affiliate: null, referredByAffiliate: null, _count: { staff: 2, services: 3, appointments: 0 } };
const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

describe("superadmin displays the current product and contracted professionals", () => {
  it("groups existing normal contracts without changing their distinct prices and capacities", () => {
    expect(report).toMatchObject({ plan: "PURAGENDA", planLabel: "Puragenda", professionalsLabel: "2 profesionales contratados", baseAmount: 17990, method: "MERCADO_PAGO" });
    expect(getAdminSubscriptionReport({ ...subscription, recurringPriceOverrideClp: null, staffLimitOverride: 5 }, { countryCode: "CL" })).toMatchObject({ planLabel: "Puragenda", staffLimit: 5, baseAmount: 29990 });
    expect(getAdminSubscriptionReport({ ...subscription, plan: "PURAGENDA_PLUS" }, { countryCode: "CL" })).toMatchObject({ plan: "PURAGENDA_PLUS", planLabel: "Puragenda+" });
  });
  it("business cards, table and filters display only the current product names", () => {
    const html = renderToStaticMarkup(createElement(BusinessesClient, { businesses: [business] }));
    expect(text(html)).toContain("Puragenda");
    expect(text(html)).toContain("2 profesionales contratados");
    expect(html).toContain('value="PURAGENDA_PLUS"');
    expect(text(html)).not.toMatch(/\b(?:EQUIPO|INDIVIDUAL|Equipo|Individual)\b/);
  });
  it("the business editor retains the agreed contract instead of offering obsolete plan changes", () => {
    const html = renderToStaticMarkup(createElement(SubscriptionEditor, { subscription: { ...subscription, createdAt: now.toISOString() }, billingReport: report, activeStaff: 2 }));
    expect(text(html)).toContain("Puragenda · 2 profesionales contratados");
    expect(text(html)).not.toMatch(/\b(?:EQUIPO|INDIVIDUAL|Equipo|Individual)\b/);
  });
  it("subscription badges and revenue breakdown group normal contracts together", () => {
    const sub = { ...subscription, business: { id: business.id, name: business.name, slug: business.slug }, billingReport: report, nextBillingPreview: { baseAmount: 17990, amountDue: 17990, mpAmount: 17990, discountPercentage: null, reason: "Precio acordado", hasBenefit: false, usesMercadoPagoMinimum: false }, freeMonthsRemaining: 0, pendingDiscountPercentage: null, promoName: null, promoFreeMonthsRemaining: 0, promoDiscountPercentage: null, promoDiscountMonthsRemaining: 0, nextBillingOverrideAmount: null, billingNotes: null, lastBillingSyncAt: null, lastBillingSyncError: null };
    const props: ComponentProps<typeof SubscriptionsClient> = { active: [sub], expiringSoon: [], cancelled: [], allSubscriptions: [sub], revenue: { monthlyRevenueClp: 17990, nextTransferClp: 0, nextAutomaticClp: 17990, internationalCount: 0 } };
    const html = renderToStaticMarkup(createElement(SubscriptionsClient, props));
    expect(text(html)).toContain("Puragenda Mensual");
    expect(text(html)).toContain("2 profesionales contratados");
    expect(text(html)).not.toMatch(/\b(?:EQUIPO|INDIVIDUAL|Equipo|Individual)\b/);
  });
  it("new businesses choose Puragenda or Plus with a professional count and a free trial", () => {
    const html = renderToStaticMarkup(createElement(NewBusinessPage));
    expect(text(html)).toContain("Puragenda+");
    expect(text(html)).toContain("Profesionales contratados");
    expect(text(html)).toContain("30 días de prueba");
    expect(text(html)).not.toMatch(/\b(?:EQUIPO|INDIVIDUAL|Equipo|Individual)\b/);
  });
});
