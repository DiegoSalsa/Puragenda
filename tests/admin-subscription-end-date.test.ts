import { describe, expect, it } from "vitest";

import { resolveSubscriptionEndDate } from "@/lib/admin/subscription-end-date";

describe("resolveSubscriptionEndDate", () => {
  it("uses the paid period end instead of the subscription creation date", () => {
    const result = resolveSubscriptionEndDate({
      isTrial: false,
      trialEndsAt: null,
      currentPeriodEnd: "2026-10-24T20:35:57.676Z",
      mpSubscriptionId: null,
      paddleSubscriptionId: null,
    });

    expect(result.date?.toISOString()).toBe("2026-10-24T20:35:57.676Z");
    expect(result.context).toBe("Fin del período pagado");
  });

  it("uses trialEndsAt only for a trial without a payment provider", () => {
    const result = resolveSubscriptionEndDate({
      isTrial: true,
      trialEndsAt: "2026-09-14T03:02:07.361Z",
      currentPeriodEnd: null,
      mpSubscriptionId: null,
      paddleSubscriptionId: null,
    });

    expect(result.date?.toISOString()).toBe("2026-09-14T03:02:07.361Z");
    expect(result.context).toBe("Fin de prueba");
  });

  it("always prioritizes a paid period end over trial metadata", () => {
    const result = resolveSubscriptionEndDate({
      isTrial: true,
      trialEndsAt: "2026-09-14T03:02:07.361Z",
      currentPeriodEnd: "2026-10-14T03:02:07.361Z",
      mpSubscriptionId: null,
      paddleSubscriptionId: null,
    });

    expect(result.date?.toISOString()).toBe("2026-10-14T03:02:07.361Z");
    expect(result.context).toBe("Fin del período pagado");
  });

  it("never presents an old trial end as the end of a provider subscription", () => {
    const result = resolveSubscriptionEndDate({
      isTrial: false,
      trialEndsAt: "2026-05-28T01:59:32.795Z",
      currentPeriodEnd: null,
      mpSubscriptionId: "provider-subscription-id",
      paddleSubscriptionId: null,
    });

    expect(result.date).toBeNull();
    expect(result.context).toBe("Pendiente de sincronizar");
  });
});
