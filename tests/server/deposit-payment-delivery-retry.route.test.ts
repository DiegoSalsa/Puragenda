import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/user-session", () => ({
  getCurrentSessionUser: vi.fn(),
}));
vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: vi.fn(),
}));
vi.mock("@/server/services/permissions.service", () => ({
  hasBusinessPermission: vi.fn(),
}));
vi.mock("@/server/services/deposit.service", () => ({
  processPendingDepositPaymentDeliveries: vi.fn(),
}));

import { POST } from "@/app/api/dashboard/deposit-payment-deliveries/retry/route";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { processPendingDepositPaymentDeliveries } from "@/server/services/deposit.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

describe("deposit payment delivery recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getBusinessForUser).mockResolvedValue({ id: "business-1" } as never);
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
    vi.mocked(processPendingDepositPaymentDeliveries).mockResolvedValue({
      checked: 1,
      delivered: 1,
      errors: [],
    });
  });

  it("requires an authenticated administrator", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(processPendingDepositPaymentDeliveries).not.toHaveBeenCalled();
  });

  it("rejects users without settings access", async () => {
    vi.mocked(hasBusinessPermission).mockResolvedValue(false);

    const response = await POST();

    expect(response.status).toBe(403);
    expect(processPendingDepositPaymentDeliveries).not.toHaveBeenCalled();
  });

  it("retries only the current business without a scheduled job", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(processPendingDepositPaymentDeliveries).toHaveBeenCalledWith({
      businessId: "business-1",
      force: true,
      limit: 10,
    });
  });
});
