import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { quoteCommercialPlan } from "@/core/commercial-catalog";
import { createPaddleSandboxAdapter } from "@/server/commercial-billing/paddle-sandbox";
import { sandboxConfiguration } from "@/server/commercial-billing/contracts";
import { mpFixture, paddleFixture, mpNotification, mpSignature, paddleNotification, paddleSignature, paddlePriceMap } from "../fixtures/commercial-provider-fixtures";
const quote = quoteCommercialPlan({ catalogVersion:"puragenda-next-v1", plan:"PURAGENDA_PLUS", professionalTotal:2 });
const context = { operationId:"fixture-operation", businessId:"fixture-business", quote, strategy:"IMMEDIATE" as const,
  effectiveAt:new Date(), providerSubscriptionId:null as string | null };
beforeEach(() => vi.stubEnv("COMMERCIAL_V2_SANDBOX_WRITES","1"));
afterEach(() => vi.unstubAllEnvs());
describe("real SDK contracts against explicit local provider fixtures", () => {
  it("MP creates the exact V2 recurring amount and an authorization is still unpaid", async () => {
    const f=mpFixture(); const preview=await f.adapter.preview(context);
    const result=await f.adapter.execute(context,preview,"test@example.invalid");
    expect(f.state.sub.auto_recurring.transaction_amount).toBe(27990);
    expect(result.status).toBe("AWAITING_PAYMENT"); expect(f.state.calls).toBe(1);
  });
  it("MP blocks mid-cycle proration and unverified renewal changes", async () => {
    const f=mpFixture();
    expect((await f.adapter.preview({...context,providerSubscriptionId:f.state.sub.id})).blockers).toContain("MP_MID_CYCLE_PRORATION_UNVERIFIED");
    expect((await f.adapter.preview({...context,strategy:"NEXT_RENEWAL"})).supported).toBe(false);
  });
  it("MP rejects a real account or a live payment even if the token variable says sandbox", async () => {
    const f=mpFixture(); f.state.accountTags=[];
    await expect(f.adapter.getSubscription(f.state.sub.id)).rejects.toThrow("MP_TEST_ACCOUNT_REQUIRED");
    f.state.accountTags=["test_user"]; f.state.payment.live_mode=true;
    const raw=mpNotification(); const note=await f.adapter.verifyNotification(raw,mpSignature(raw));
    await expect(f.adapter.observe({...context,providerSubscriptionId:f.state.sub.id},note)).rejects.toThrow();
  });
  it("verifies Mercado Pago HMAC through the official SDK and rejects a bad or expired signature", async () => {
    const f=mpFixture(); const raw=mpNotification();
    expect((await f.adapter.verifyNotification(raw,mpSignature(raw))).resourceId).toBe("101");
    const bad=mpSignature(raw);bad.set("x-signature",`ts=${Date.now()},v1=bad`);
    await expect(f.adapter.verifyNotification(raw,bad)).rejects.toThrow("INVALID_WEBHOOK_SIGNATURE");
    bad.set("x-signature","ts=1,v1=bad"); await expect(f.adapter.verifyNotification(raw,bad)).rejects.toThrow("EXPIRED_WEBHOOK_SIGNATURE");
  });
  it("Paddle retains every add-on in preview and blocks Plus until migration review", async () => {
    const f=paddleFixture();f.state.subscription.items.push({price:{id:`pri_${"z".repeat(26)}`},quantity:1});
    const current={...context,providerSubscriptionId:f.state.subscription.id};
    const preview=await f.adapter.preview(current);
    expect(preview.items).toContainEqual({priceId:`pri_${"z".repeat(26)}`,quantity:1});
    expect(preview.items).toContainEqual({priceId:paddlePriceMap.PURAGENDA_PLUS,quantity:1});
    expect(preview.blockers).toContain("RETAINED_ADDON_REQUIRES_MIGRATION_REVIEW");
    await expect(f.adapter.execute(current,preview)).rejects.toThrow("PADDLE_PREVIEW_CHANGED");
    expect(f.state.calls).toBe(0);expect(f.state.lastUpdate).toMatchObject({onPaymentFailure:"prevent_change"});
  });
  it("Paddle defers charging without claiming it deferred the contract or paid it", async () => {
    const f=paddleFixture("prorated_next_billing_period");
    const preview=await f.adapter.preview({...context,providerSubscriptionId:f.state.subscription.id});
    expect(preview.immediateAmountMinor).toBeNull(); expect(preview.expectedPaymentMinor).toBe(f.state.recurring);
    expect(preview.prorationMode).toBe("prorated_next_billing_period");
  });
  it.each(["past_due","trialing","paused"])("Paddle rejects %s changes",async status=>{
    const f=paddleFixture();f.state.subscription.status=status;
    await expect(f.adapter.preview({...context,providerSubscriptionId:f.state.subscription.id})).rejects.toThrow();
  });
  it("Paddle has no fallback price or unapproved currency conversion",async()=>{
    const f=paddleFixture(); delete (f.port as unknown as { price?:unknown }).price;
    await expect(f.adapter.preview(context)).rejects.toThrow();
    vi.stubEnv("COMMERCIAL_V2_PROVIDER_ENV","sandbox");vi.stubEnv("COMMERCIAL_V2_PADDLE_API_KEY","pdl_sdbx_apikey_fixture");
    vi.stubEnv("COMMERCIAL_V2_PADDLE_WEBHOOK_SECRET","fixture");
    await expect(createPaddleSandboxAdapter().preview(context)).rejects.toThrow("PADDLE_V2_PRICE_NOT_CONFIGURED");
  });
  it("Paddle unmarshal verifies the raw event using actual SDK cryptography",async()=>{
    const f=paddleFixture();const raw=paddleNotification();
    expect((await f.adapter.verifyNotification(raw,paddleSignature(raw))).type).toBe("transaction.completed");
    await expect(f.adapter.verifyNotification(raw.replace('completed','past_due'),paddleSignature(raw))).rejects.toThrow();
  });
  it("Paddle rechecks a changed preview before attempting a mutation",async()=>{
    const f=paddleFixture();const current={...context,providerSubscriptionId:f.state.subscription.id};const preview=await f.adapter.preview(current);
    f.state.immediate++;
    await expect(f.adapter.execute(current,preview)).rejects.toThrow("PADDLE_PREVIEW_CHANGED");expect(f.state.calls).toBe(0);
    f.state.immediate--;f.state.recurring++;
    await expect(f.adapter.execute(current,preview)).rejects.toThrow("PADDLE_PREVIEW_CHANGED");expect(f.state.calls).toBe(0);
  });
  it("Paddle rejects cross-subscription transactions and currency changes",async()=>{
    const f=paddleFixture();f.bind(context);f.state.transaction.subscriptionId="sub_other";f.state.subscription.currencyCode="USD";
    const raw=paddleNotification();const note=await f.adapter.verifyNotification(raw,paddleSignature(raw));
    await expect(f.adapter.observe({...context,providerSubscriptionId:f.state.subscription.id},note,null)).rejects.toThrow("PADDLE_SUBSCRIPTION_BINDING");
    f.state.transaction.subscriptionId=f.state.subscription.id;
    await expect(f.adapter.observe({...context,providerSubscriptionId:f.state.subscription.id},note,null)).rejects.toThrow("UNAPPROVED_PROVIDER_CURRENCY");
  });

  it.each(["refund","chargeback"])("Paddle normalizes canonical %s adjustments",async action=>{
    const f=paddleFixture();f.bind(context);f.state.adjustment.action=action;
    const preview=await f.adapter.preview({...context,providerSubscriptionId:f.state.subscription.id});
    const raw=paddleNotification("adjustment-event","adjustment.created",`adj_${"1".repeat(26)}`);
    const note=await f.adapter.verifyNotification(raw,paddleSignature(raw));
    expect((await f.adapter.observe({...context,providerSubscriptionId:f.state.subscription.id},note,preview)).state).toBe(action==="refund"?"REFUNDED":"CHARGEBACK");
    if(action==="refund"){f.state.adjustment.totals.total="1";expect((await f.adapter.observe({...context,providerSubscriptionId:f.state.subscription.id},note,preview)).state).toBe("UNKNOWN");}
  });

  it("has fail-closed credentials and no live fallback",()=>{
    vi.stubEnv("COMMERCIAL_V2_PROVIDER_ENV","sandbox");vi.stubEnv("PADDLE_API_KEY","must-never-be-used");
    expect(()=>sandboxConfiguration("PADDLE")).toThrow("SANDBOX_CREDENTIAL_REQUIRED");
    vi.stubEnv("COMMERCIAL_V2_PADDLE_API_KEY","pdl_live_apikey_example");expect(()=>sandboxConfiguration("PADDLE")).toThrow();
  });
});
