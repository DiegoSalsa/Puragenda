import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/rate-limit", () => ({ billingLimiter: { check: vi.fn(() => null) } }));
vi.mock("@/server/auth/user-session", () => ({
  getApiSessionUser: vi.fn(async () => ({ id: "user-ar", email: "dummy@example.test" })),
}));
vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: vi.fn(async () => ({
    id: "business-ar",
    name: "Negocio Dummy Argentina",
    countryCode: "AR",
    currencyCode: "ARS",
  })),
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));
vi.mock("@/server/services/platform-discount.service", () => ({
  quotePlatformDiscount: vi.fn(),
  reservePlatformDiscount: vi.fn(),
}));
vi.mock("@/server/services/subscription-billing.service", () => ({
  calculateNextBillingPreview: vi.fn(() => ({ mpAmount: 12990 })),
}));
vi.mock("@/server/lib/mercadopago", () => ({ mpClient: {} }));
vi.mock("mercadopago", () => ({ PreApproval: class {} }));

import { POST } from "@/app/api/billing/subscribe/route";
import { prisma } from "@/server/db/prisma";

const findSubscription = vi.mocked(prisma.subscription.findUnique);
const upsertSubscription = vi.mocked(prisma.subscription.upsert);

function request() {
  return new NextRequest("http://localhost:3000/api/billing/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan: "INDIVIDUAL" }),
  });
}

describe("international subscription local simulator", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR", "true");
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR_SECRET", "dummy-secret-only-for-local-tests");
    findSubscription.mockResolvedValue({
      id: "subscription-ar",
      plan: "INDIVIDUAL",
      status: "TRIALING",
      billingCycle: "MONTHLY",
      extraStaffCount: 0,
    } as never);
    upsertSubscription.mockResolvedValue({ id: "subscription-ar" } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("creates an ARS checkout without calling a real provider", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ simulated: true, currency: "ARS" });
    expect(body.init_point).toContain("http://localhost:3000/api/dev/payment-simulator?token=");
    expect(upsertSubscription).toHaveBeenCalledWith(expect.objectContaining({
      where: { businessId: "business-ar" },
      update: expect.objectContaining({ status: "INACTIVE", isTrial: false }),
    }));
  });

  it("keeps international real billing blocked when the simulator is off", async () => {
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR", "false");
    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "INTERNATIONAL_BILLING_NOT_CONFIGURED",
    });
    expect(upsertSubscription).not.toHaveBeenCalled();
  });
});
