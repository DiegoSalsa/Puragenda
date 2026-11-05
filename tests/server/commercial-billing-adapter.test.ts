import { describe, expect, it, vi } from "vitest";
import { prepareCommercialBillingDraft, preparePaddleUpdateDraft, prepareMercadoPagoUpdateDraft } from "@/server/services/commercial-billing-adapter";
import { assertCommercialSandbox, commercialHash, COMMERCIAL_RELEASE_FLAGS } from "@/server/services/commercial-internal";
const input = { plan: "PURAGENDA", catalogVersion: "puragenda-next-v1", professionalTotal: 8 };
const draft = prepareCommercialBillingDraft(input);
const prices = Object.fromEntries(draft.lines.map((line, index) => [line.code, { priceId: `pri_${String(index).padStart(26, "0")}`, unitAmountClp: line.unitAmountClp, currencyCode: "CLP", monthly: true }]));
describe("commercial provider preparation without API calls", () => {
  it.each([1, 2, 5, 6, 8, 100])("retains all marginal recurring tiers for %i seats", professionalTotal => {
    const result = prepareCommercialBillingDraft({ ...input, professionalTotal });
    expect(result.lines.reduce((sum, line) => sum + line.quantity * line.unitAmountClp, 0)).toBe(result.recurringAmountClp);
    expect(result.executable).toBe(false);
    expect(result.blockers).toContain("TAX_POLICY_UNRESOLVED");
  });
  it("prepares the full Paddle replacement, with existing add-ons retained explicitly", () => {
    const extra = { priceId: `pri_${"z".repeat(26)}`, quantity: 1 };
    const result = preparePaddleUpdateDraft(input, prices, [extra], "prorated_immediately", "active");
    expect(result.payload.items).toHaveLength(draft.lines.length + 1);
    expect(result.payload.items).toContainEqual(extra);
    expect(result.payload.onPaymentFailure).toBe("prevent_change");
    expect(result.executable).toBe(false);
  });
  it.each(["prorated_immediately", "prorated_next_billing_period", "full_immediately", "full_next_billing_period", "do_not_bill"] as const)("accepts an explicitly selected draft mode %s", mode => {
    expect(preparePaddleUpdateDraft(input, prices, [], mode, "active").payload.prorationBillingMode).toBe(mode);
  });
  it("rejects unsupported cycles, past_due, currency, taxes left unresolved and wrong price maps", () => {
    expect(() => prepareCommercialBillingDraft({ ...input, billingCycle: "ANNUAL" })).toThrow();
    expect(() => preparePaddleUpdateDraft(input, prices, [], "do_not_bill", "past_due")).toThrow("PAST_DUE_REQUIRES_RECOVERY");
    expect(() => preparePaddleUpdateDraft(input, {}, [], "do_not_bill", "active")).toThrow("PRICE_MAPPING_MISMATCH");
    expect(() => preparePaddleUpdateDraft(input, { ...prices, PURAGENDA: { ...prices.PURAGENDA, currencyCode: "USD" } }, [], "do_not_bill", "active")).toThrow("PRICE_MAPPING_MISMATCH");
    expect(() => preparePaddleUpdateDraft(input, prices, [], "full_immediately", "trialing")).toThrow("INVALID_PRORATION_FOR_STATUS");
  });
  it("does not invent Mercado Pago proration or an effective billing date", () => {
    expect(prepareMercadoPagoUpdateDraft(input)).toMatchObject({ executable: false, prorationPolicy: null, effectiveBillingDate: null });
  });
  it("keeps every release flag disabled and rejects a production write", () => {
    expect(Object.values(COMMERCIAL_RELEASE_FLAGS).every(value => value === false)).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COMMERCIAL_V2_INTERNAL_WRITES", "1");
    vi.stubEnv("DATABASE_URL", "postgres://local@127.0.0.1/puragenda_commercial_test");
    expect(assertCommercialSandbox).toThrow("COMMERCIAL_WRITES_DISABLED");
    vi.unstubAllEnvs();
  });
  it("rejects a remote database even when the local-write opt-in is present", () => {
    vi.stubEnv("DATABASE_URL", "postgres://local@example.invalid/puragenda_commercial_test");
    vi.stubEnv("COMMERCIAL_V2_INTERNAL_WRITES", "1");
    expect(assertCommercialSandbox).toThrow("COMMERCIAL_WRITES_DISABLED");
    vi.unstubAllEnvs();
  });
  it("hashes idempotency payloads independent of object-key order", () => {
    expect(commercialHash({ a: 1, b: { x: 1, y: 2 } })).toBe(commercialHash({ b: { y: 2, x: 1 }, a: 1 }));
  });
});
