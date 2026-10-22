import { afterEach, describe, expect, it, vi } from "vitest";
import type { CfMessage, Prisma } from "@prisma/client";
import {
  addressHash,
  assertContactLab,
  backoff,
  campaignInput,
  CONTACT_FLOW_EXTERNAL_RELEASE,
  signature,
  signatureMatches,
} from "@/server/contact-flow/policy";
import {
  ResendContactProvider,
  resendRequest,
  providerFailure,
  withProviderDeadline,
} from "@/server/contact-flow/providers";
describe("Contact Flow release seal and contracts", () => {
  it("classifies 429 and 5xx as recoverable, explicit 4xx as permanent and absent status as unknown", () => {
    expect(providerFailure(429, "60")).toMatchObject({
      outcome: "TEMPORARY",
      retryAfterMs: 60000,
    });
    expect(providerFailure(503, null).outcome).toBe("TEMPORARY");
    expect(providerFailure(422, null).outcome).toBe("PERMANENT");
    expect(providerFailure(null, null).outcome).toBe("UNKNOWN");
  });
  it("bounds a pending SDK response without assuming the provider rejected it", async () => {
    const c = new AbortController();
    const pending = withProviderDeadline(() => new Promise(() => {}), c.signal);
    c.abort();
    await expect(pending).rejects.toThrow("PROVIDER_TIMEOUT");
  });
  afterEach(() => vi.unstubAllEnvs());
  it("cannot open external delivery with credentials or development flags", async () => {
    vi.stubEnv("CONTACT_FLOW_LAB_ENABLED", "1");
    vi.stubEnv("CONTACT_FLOW_EXTERNAL_ENABLED", "1");
    vi.stubEnv("RESEND_API_KEY", "synthetic-test-placeholder");
    const network = vi.fn().mockRejectedValue(new Error("unexpected network"));
    vi.stubGlobal("fetch", network);
    expect(CONTACT_FLOW_EXTERNAL_RELEASE).toBe(false);
    await expect(
      new ResendContactProvider().send(
        {} as Prisma.TransactionClient,
        {} as CfMessage,
        {
          to: "contact@example.invalid",
          from: "sender@example.invalid",
          subject: "synthetic",
          text: "synthetic",
          unsubscribeUrl: "http://localhost/u",
          bookingUrl: "http://localhost/b",
        },
        1,
        AbortSignal.timeout(1000),
      ),
    ).rejects.toThrow("CONTACT_FLOW_EXTERNAL_DELIVERY_BLOCKED");
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("requires the token signing secret and tenant-binds address fingerprints", () => {
    vi.stubEnv("CONTACT_FLOW_TOKEN_SECRET", "");
    expect(() => addressHash("b", "c@example.invalid")).toThrow(
      "CONTACT_FLOW_SECRET_REQUIRED",
    );
    vi.stubEnv("CONTACT_FLOW_TOKEN_SECRET", "s".repeat(64));
    expect(addressHash("a", " C@EXAMPLE.INVALID ")).toBe(
      addressHash("a", "c@example.invalid"),
    );
    expect(addressHash("a", "c@example.invalid")).not.toBe(
      addressHash("b", "c@example.invalid"),
    );
  });
  it("detects manipulated token signatures with constant-time verification", () => {
    vi.stubEnv("CONTACT_FLOW_TOKEN_SECRET", "s".repeat(64));
    const signed = signature("opaque-token");
    expect(signatureMatches("opaque-token", signed)).toBe(true);
    expect(signatureMatches("other", signed)).toBe(false);
    expect(signatureMatches("opaque-token", "short")).toBe(false);
  });
  it("requires a local disposable database and blocks a production runtime", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONTACT_FLOW_LAB_ENABLED", "1");
    expect(() => assertContactLab()).toThrow();
  });
  it("prepares the official SDK idempotency option and one-click unsubscribe headers", () => {
    const r = resendRequest(
      {
        to: "contact@example.invalid",
        from: "sender@example.invalid",
        subject: "synthetic",
        text: "body",
        unsubscribeUrl: "http://localhost/unsubscribe?token=opaque",
        bookingUrl: "http://localhost/booking",
      },
      "stable-key",
    );
    expect(r.options).toEqual({ idempotencyKey: "stable-key" });
    expect(r.body.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    expect(r.body.text).toContain(
      "Baja: http://localhost/unsubscribe?token=opaque",
    );
  });
  it("uses exponential delay, deterministic jitter and provider Retry-After", () => {
    expect(backoff(1, "a")).toBeGreaterThanOrEqual(2000);
    expect(backoff(2, "a")).toBeGreaterThanOrEqual(4000);
    expect(backoff(2, "a")).toBe(backoff(2, "a"));
    expect(backoff(1, "a", 60000)).toBe(60000);
    expect(backoff(20, "a")).toBeLessThan(3601000);
  });
  it.each([
    { channel: "WHATSAPP" },
    { recipients: ["client"] },
    { sql: "select 1" },
    { discount: 50 },
    { body: "sensitive instructions" },
  ])("rejects operations outside the bounded DSL %#", (extra) => {
    expect(
      campaignInput.safeParse({
        recommendationId: "r",
        recommendationHash: "a".repeat(64),
        recommendationVersion: 1,
        serviceId: "s",
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        maxContacts: 5,
        dailyLimit: 5,
        ...extra,
      }).success,
    ).toBe(false);
  });
});
