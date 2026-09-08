import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSuperAdminSession = vi.fn();
const revokeAllSuperAdminSessionsForUser = vi.fn();

vi.mock("@/server/auth/admin-session", async () => {
  const actual = await vi.importActual<typeof import("@/server/auth/admin-session")>("@/server/auth/admin-session");
  return {
    ...actual,
    requireSuperAdminSession: () => requireSuperAdminSession(),
    revokeAllSuperAdminSessionsForUser: (...args: unknown[]) => revokeAllSuperAdminSessionsForUser(...args),
  };
});

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    business: { findUnique: vi.fn(), delete: vi.fn(), count: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { deleteBusinessAction } from "@/server/actions/admin.actions";
import { STEP_UP_REQUIRED } from "@/core/constants";

describe("step-up en acciones sensibles de superadmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exige reautenticación reciente para borrar un negocio", async () => {
    requireSuperAdminSession.mockResolvedValue({
      id: "admin-1",
      lastAuthAt: new Date(Date.now() - 20 * 60 * 1000),
    });

    await expect(deleteBusinessAction("biz-1")).resolves.toEqual({
      error: STEP_UP_REQUIRED,
      message: expect.stringContaining("Confirma tu identidad"),
    });
  });
});
