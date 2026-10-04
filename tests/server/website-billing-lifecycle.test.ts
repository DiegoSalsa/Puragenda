import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasExistingWebsiteBillingLifecycle } from "@/websites/billing-lifecycle";
import { hasWebsitePaidAccess } from "@/websites/policy";

const m = vi.hoisted(() => ({ addon: vi.fn(), intent: vi.fn(), offer: vi.fn(), base: vi.fn(), operation: vi.fn() }));
vi.mock("@/server/websites/service", () => ({
  requireWebsiteManager: async () => ({ business: { id: "local-business", ownerId: "owner", slug: "local-qa", countryCode: "CL" }, user: { id: "owner" } }),
  ensureWebsite: async () => ({ id: "local-site", templateKey: "bella", templateVersion: 1, draftConfig: {}, revision: 1, publishedRevision: null, subdomain: "local-qa", status: "DRAFT" }),
  websiteRootDomain: () => "localhost", websiteView: async () => ({}),
}));
vi.mock("@/websites/registry", () => ({ resolveTemplate: () => ({ readConfig: (config: unknown) => config, loadEditor: async () => () => null }) }));
vi.mock("@/server/websites/billing", () => ({ websitePrice: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3010" }) }));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  websiteAddon: { findUnique: m.addon }, websitePurchaseIntent: { findUnique: m.intent },
  websiteOfferEligibility: { findUnique: m.offer }, subscription: { findUnique: m.base },
  websiteCheckoutOperation: { findUnique: m.operation },
  websiteDomain: { findMany: async () => [] }, domainRequest: { findMany: async () => [] },
} }));
import WebsitePage from "@/app/dashboard/website/page";

type Addon = Parameters<typeof hasExistingWebsiteBillingLifecycle>[0];
const now = new Date("2026-10-03T12:00:00Z"), past = new Date("2026-10-02T12:00:00Z"), future = new Date("2026-10-04T12:00:00Z");
const cases: { name: string; addon: Addon; intent?: boolean; founder?: boolean; allowed: boolean }[] = [
  { name: "PAST_DUE + intent + public OFF", addon: { status: "PAST_DUE", mpSubscriptionId: "local-agreement" }, allowed: true },
  { name: "ACTIVE + intent + public OFF", addon: { status: "ACTIVE", validUntil: future }, allowed: true },
  { name: "ACTIVE scheduled cancellation + future paid period + intent + public OFF", addon: { status: "ACTIVE", cancelAt: future, validUntil: future }, allowed: true },
  { name: "pending MP agreement + intent + public OFF", addon: { status: "INACTIVE", mpSubscriptionId: "local-pending", checkoutOperations: [{ state: "PENDING", mpSubscriptionId: "local-pending" }] }, allowed: true },
  { name: "UNKNOWN operation with provider ID + intent + public OFF", addon: { status: "INACTIVE", checkoutOperations: [{ state: "UNKNOWN", mpSubscriptionId: "local-unknown" }] }, allowed: true },
  { name: "UNKNOWN operation without provider ID + intent + public OFF", addon: { status: "INACTIVE", checkoutOperations: [{ state: "UNKNOWN" }] }, allowed: true },
  { name: "CREATING operation + intent + public OFF", addon: { status: "INACTIVE", checkoutOperations: [{ state: "CREATING" }] }, allowed: true },
  { name: "authorized agreement + intent + public OFF", addon: { status: "INACTIVE", checkoutOperations: [{ state: "AUTHORIZED", mpSubscriptionId: "local-authorized" }] }, allowed: true },
  { name: "Founder + intent + public OFF", addon: null, founder: true, allowed: true },
  { name: "intent only + public OFF", addon: null, allowed: false },
  { name: "empty Standard add-on + intent + public OFF", addon: { status: "INACTIVE", checkoutOperations: [] }, allowed: false },
  { name: "no intent or add-on + public OFF preserves legacy internal access", addon: null, intent: false, allowed: true },
  { name: "Paddle subscription + intent + public OFF", addon: { status: "PAST_DUE", paddleSubscriptionId: "sub_local_existing" }, allowed: true },
  { name: "Paddle checkout transaction + intent + public OFF", addon: { status: "INACTIVE", checkoutTransactionId: "txn_local_existing" }, allowed: true },
  { name: "CANCELLED + future paid period + intent + public OFF", addon: { status: "CANCELLED", cancelAt: past, validUntil: future }, allowed: true },
  { name: "CANCELLED + expired paid period + intent + public OFF", addon: { status: "CANCELLED", validUntil: past }, allowed: false },
  { name: "CANCELLED + past cancelAt + historical MP ID + intent + public OFF", addon: { status: "CANCELLED", cancelAt: past, mpSubscriptionId: "local-historical" }, allowed: false },
  { name: "CANCELLED + historical Paddle IDs + intent + public OFF", addon: { status: "CANCELLED", validUntil: past, paddleSubscriptionId: "sub_local_historical", checkoutTransactionId: "txn_local_historical" }, allowed: false },
  { name: "CANCELLED operation + historical MP ID + intent + public OFF", addon: { status: "INACTIVE", checkoutOperations: [{ state: "CANCELLED", mpSubscriptionId: "local-historical-operation" }] }, allowed: false },
  { name: "INACTIVE retains agreement ID from a CANCELLED operation + intent + public OFF", addon: { status: "INACTIVE", mpSubscriptionId: "local-historical-operation", checkoutOperations: [{ state: "CANCELLED", mpSubscriptionId: "local-historical-operation" }] }, allowed: false },
  { name: "CANCELLED addon and operation + expired paid period + historical IDs + intent + public OFF", addon: { status: "CANCELLED", validUntil: past, cancelAt: past, mpSubscriptionId: "local-historical", checkoutOperations: [{ state: "CANCELLED", mpSubscriptionId: "local-historical" }] }, allowed: false },
  { name: "CANCELLED + expired period with UNKNOWN reconciliation + intent + public OFF", addon: { status: "CANCELLED", validUntil: past, checkoutOperations: [{ state: "UNKNOWN" }] }, allowed: true },
  { name: "expired date on an INACTIVE add-on + intent + public OFF", addon: { status: "INACTIVE", validUntil: past }, allowed: false },
  { name: "future cancelAt alone + intent + public OFF", addon: { status: "INACTIVE", cancelAt: future }, allowed: false },
  { name: "nonterminal MP agreement + intent + public OFF", addon: { status: "INACTIVE", mpSubscriptionId: "local-pending-agreement" }, allowed: true },
];

describe("Website billing lifecycle is separate from public acquisition", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    vi.stubEnv("WEBSITE_CHECKOUT_ENABLED", "1"); vi.stubEnv("WEBSITE_PUBLIC_ACQUISITION_ENABLED", "0");
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "local-no-network"); vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "local-no-network");
    m.intent.mockResolvedValue({ businessId: "local-business" }); m.addon.mockResolvedValue(null); m.offer.mockResolvedValue(null);
    m.base.mockResolvedValue({ status: "ACTIVE", isTrial: false, currentPeriodEnd: new Date(Date.now() + 86400000) });
    m.operation.mockResolvedValue({ providerStatus: "pending" });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
  async function editorProps() { const page = await WebsitePage(); return page.props.children[1].props; }
  it.each(cases)("$name", async ({ addon, intent, founder, allowed }) => {
    m.addon.mockResolvedValue(addon); if (intent === false) m.intent.mockResolvedValue(null);
    if (founder) m.offer.mockResolvedValue({ offerCode: "BETA_FOUNDER" });
    if (addon?.checkoutOperations?.[0]?.state === "CANCELLED" || addon?.status === "CANCELLED") m.operation.mockResolvedValue({ providerStatus: "cancelled" });
    expect(hasExistingWebsiteBillingLifecycle(addon, now)).toBe(founder || intent === false ? false : allowed);
    expect((await editorProps()).price.enabled).toBe(allowed);
    if (addon?.status !== "ACTIVE") expect(hasWebsitePaidAccess(addon)).toBe(false);
  });
  it("new public ON flow requires paid BASE and does not inherit entitlement from billing evidence", async () => {
    vi.stubEnv("WEBSITE_PUBLIC_ACQUISITION_ENABLED", "1"); expect((await editorProps()).price.enabled).toBe(true);
    m.base.mockResolvedValue({ status: "TRIALING", isTrial: true }); expect((await editorProps()).price.enabled).toBe(false);
  });
  it("ON -> OFF preserves an existing contract but blocks an intent-only or empty add-on acquisition", async () => {
    vi.stubEnv("WEBSITE_PUBLIC_ACQUISITION_ENABLED", "1"); m.addon.mockResolvedValue({ status: "PAST_DUE", mpSubscriptionId: "local-existing" });
    expect((await editorProps()).price.enabled).toBe(true);
    vi.stubEnv("WEBSITE_PUBLIC_ACQUISITION_ENABLED", "0"); expect((await editorProps()).price.enabled).toBe(true);
    m.addon.mockResolvedValue({ status: "INACTIVE" }); expect((await editorProps()).price.enabled).toBe(false);
    m.addon.mockResolvedValue(null); expect((await editorProps()).price.enabled).toBe(false);
  });
  it("empty/failed local rows, whitespace IDs and invalid dates do not prove a billing lifecycle", () => {
    expect(hasExistingWebsiteBillingLifecycle(undefined)).toBe(false);
    expect(hasExistingWebsiteBillingLifecycle({ status: "INACTIVE", mpSubscriptionId: " ", validUntil: "invalid", checkoutOperations: [{ state: "CANCELLED" }] })).toBe(false);
    expect(hasExistingWebsiteBillingLifecycle({ status: "INACTIVE", checkoutOperations: [{ state: "CANCELLED", mpSubscriptionId: "local-verified-cancelled" }] })).toBe(false);
  });
  it("cancelled paid periods end strictly at validUntil, with deterministic Date/string boundaries", () => {
    const cancelled = { status: "CANCELLED", validUntil: future.toISOString(), cancelAt: past, mpSubscriptionId: "local-historical" };
    expect(hasExistingWebsiteBillingLifecycle(cancelled, now)).toBe(true);
    expect(hasExistingWebsiteBillingLifecycle(cancelled, new Date(future.getTime() - 1))).toBe(true);
    expect(hasExistingWebsiteBillingLifecycle(cancelled, future)).toBe(false);
    expect(hasExistingWebsiteBillingLifecycle(cancelled, new Date(future.getTime() + 1))).toBe(false);
    expect(hasExistingWebsiteBillingLifecycle({ ...cancelled, validUntil: "invalid" }, now)).toBe(false);
    expect(hasExistingWebsiteBillingLifecycle({ ...cancelled, validUntil: new Date(0), cancelAt: new Date(0) }, now)).toBe(false);
  });
  it("scheduled ACTIVE cancellation keeps the paid period; terminal expiry becomes new acquisition", async () => {
    const addon = { status: "ACTIVE", cancelAt: future, validUntil: future, mpSubscriptionId: "local-existing" };
    m.addon.mockResolvedValue(addon);
    expect(hasWebsitePaidAccess(addon, now)).toBe(true); expect((await editorProps()).price.enabled).toBe(true);
    vi.setSystemTime(future); m.addon.mockResolvedValue({ ...addon, status: "CANCELLED" });
    expect(hasWebsitePaidAccess(addon, future)).toBe(false); expect((await editorProps()).price.enabled).toBe(false);
  });
  it("PUBLIC OFF blocks expired CANCELLED history; PUBLIC ON with paid BASE permits new activation", async () => {
    m.addon.mockResolvedValue({ status: "CANCELLED", validUntil: past, cancelAt: past, mpSubscriptionId: "local-historical", checkoutOperations: [{ state: "CANCELLED", mpSubscriptionId: "local-historical" }] });
    expect((await editorProps()).price.enabled).toBe(false);
    vi.stubEnv("WEBSITE_PUBLIC_ACQUISITION_ENABLED", "1"); expect((await editorProps()).price.enabled).toBe(true);
    m.base.mockResolvedValue({ status: "TRIALING", isTrial: true }); expect((await editorProps()).price.enabled).toBe(false);
  });
});
