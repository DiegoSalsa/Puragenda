import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLocalPaymentToken,
  isLocalPaymentSimulatorEnabled,
  verifyLocalPaymentToken,
} from "@/server/services/local-payment-simulator";

describe("local payment simulator safety", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR", "true");
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR_SECRET", "dummy-secret-only-for-local-tests");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("signs and verifies a short-lived dummy payment", () => {
    const token = createLocalPaymentToken({
      kind: "subscription",
      entityId: "subscription-ar",
      businessId: "business-ar",
      amount: 12990,
      currency: "ARS",
    });

    expect(verifyLocalPaymentToken(token)).toMatchObject({
      kind: "subscription",
      entityId: "subscription-ar",
      businessId: "business-ar",
      amount: 12990,
      currency: "ARS",
    });
    expect(verifyLocalPaymentToken(`${token}tampered`)).toBeNull();
  });

  it("cannot be enabled in production even if the flag is present", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isLocalPaymentSimulatorEnabled()).toBe(false);
    expect(() => createLocalPaymentToken({
      kind: "deposit",
      entityId: "appointment-ar",
      businessId: "business-ar",
      amount: 2500,
      currency: "ARS",
    })).toThrow("disabled");
  });
});
