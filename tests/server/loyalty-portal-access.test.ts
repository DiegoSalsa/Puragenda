import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() => vi.fn(() => { throw new Error("NOT_FOUND"); }));
const redirect = vi.hoisted(() => vi.fn());
const getClientPortalEmail = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "es"),
  getTranslations: vi.fn(async () => (key: string) => key),
}));
vi.mock("@/server/db/prisma", () => ({ prisma: { client: { findFirst } } }));
vi.mock("@/server/services/client-portal.service", () => ({ getClientPortalEmail }));

import MisPremiosPage from "@/app/mis-premios/[clientId]/page";

describe("loyalty portal access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientPortalEmail.mockResolvedValue("maria@example.com");
    findFirst.mockResolvedValue(null);
  });

  it("does not expose a loyalty card belonging to another authenticated email", async () => {
    await expect(MisPremiosPage({ params: Promise.resolve({ clientId: "foreign-client" }) }))
      .rejects.toThrow("NOT_FOUND");

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "foreign-client",
        email: { equals: "maria@example.com", mode: "insensitive" },
      },
    }));
    expect(redirect).not.toHaveBeenCalled();
  });
});
