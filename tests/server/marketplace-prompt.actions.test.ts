import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentSessionUser: vi.fn(),
  getBusinessForUser: vi.fn(),
  hasBusinessPermission: vi.fn(),
  accept: vi.fn(),
  dismiss: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/auth/user-session", () => ({
  getCurrentSessionUser: (...args: unknown[]) => mocks.getCurrentSessionUser(...args),
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: (...args: unknown[]) => mocks.getBusinessForUser(...args),
}));

vi.mock("@/server/services/permissions.service", () => ({
  hasBusinessPermission: (...args: unknown[]) => mocks.hasBusinessPermission(...args),
}));

vi.mock("@/server/services/marketplace-onboarding.service", () => ({
  acceptExistingBusinessMarketplacePrompt: (...args: unknown[]) => mocks.accept(...args),
  dismissExistingBusinessMarketplacePrompt: (...args: unknown[]) => mocks.dismiss(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

import {
  acceptExistingBusinessMarketplacePromptAction,
  dismissExistingBusinessMarketplacePromptAction,
} from "@/server/actions/marketplace-prompt.actions";

describe("existing business marketplace prompt actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSessionUser.mockResolvedValue({ id: "user-1" });
    mocks.getBusinessForUser.mockResolvedValue({ id: "business-1" });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.accept.mockResolvedValue({ ok: true });
    mocks.dismiss.mockResolvedValue({ ok: true });
  });

  it("persists the selected answers for the current business and refreshes both views", async () => {
    const input = { categorySlug: "manicure", localitySlug: "concepcion" };

    await expect(acceptExistingBusinessMarketplacePromptAction(input))
      .resolves.toEqual({ success: true });

    expect(mocks.accept).toHaveBeenCalledWith("business-1", "user-1", {
      ...input,
      localityNotFound: false,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("rejects malformed answers before calling the persistence service", async () => {
    await expect(acceptExistingBusinessMarketplacePromptAction({
      categorySlug: "barberias",
      localitySlug: "osorno",
      unexpected: "not-accepted",
    } as never)).resolves.toEqual({ error: "Revisa los datos del directorio" });

    expect(mocks.accept).not.toHaveBeenCalled();
  });

  it("requires the settings permission before accepting or dismissing", async () => {
    mocks.hasBusinessPermission.mockResolvedValue(false);

    await expect(acceptExistingBusinessMarketplacePromptAction({
      categorySlug: "barberias",
      localitySlug: "osorno",
    })).resolves.toEqual({ error: "No tienes permisos para autorizar el directorio" });
    await expect(dismissExistingBusinessMarketplacePromptAction())
      .resolves.toEqual({ error: "No tienes permisos para autorizar el directorio" });

    expect(mocks.accept).not.toHaveBeenCalled();
    expect(mocks.dismiss).not.toHaveBeenCalled();
  });

  it("stores Ahora no and refreshes the dashboard", async () => {
    await expect(dismissExistingBusinessMarketplacePromptAction())
      .resolves.toEqual({ success: true });

    expect(mocks.dismiss).toHaveBeenCalledWith("business-1", "user-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
