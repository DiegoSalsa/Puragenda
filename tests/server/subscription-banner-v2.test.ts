import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks=vi.hoisted(()=>({subscription:vi.fn(),contract:vi.fn()}));
vi.mock("@/server/db/prisma",()=>({prisma:{subscription:{findUnique:mocks.subscription},commercialSubscription:{findUnique:mocks.contract}}}));
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
describe("dashboard subscription identity",()=>{
  afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
  it("keeps the registered V2 plan, seats and cycle instead of displaying legacy billing",async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
    mocks.subscription.mockResolvedValue({plan:"PURAGENDA_PLUS"});mocks.contract.mockResolvedValue({planCode:"PURAGENDA_PLUS",professionalTotal:3,billingCycle:"ANNUAL",status:"TRIALING",trialEnd:new Date("2026-11-27T12:00:00Z")});
    const html=renderToStaticMarkup(await SubscriptionBanner({businessId:"synthetic",timezone:"UTC",countryCode:"CL"}));
    expect(html).toContain("Puragenda+ · 3 profesionales · Anual");expect(html).toContain("30 días");expect(html).not.toMatch(/Equipo|Activar Plan Individual/);
  });
  it("preserves the existing legacy bank-transfer banner without querying V2 contracts",async()=>{
    mocks.contract.mockClear();mocks.subscription.mockResolvedValue({plan:"INDIVIDUAL",status:"ACTIVE",paymentMethod:"BANK_TRANSFER"});
    const html=renderToStaticMarkup(await SubscriptionBanner({businessId:"legacy",timezone:"UTC",countryCode:"CL"}));
    expect(html).toContain("Plan Individual");expect(html).toContain("Transferencia bancaria");expect(mocks.contract).not.toHaveBeenCalled();
  });
});
