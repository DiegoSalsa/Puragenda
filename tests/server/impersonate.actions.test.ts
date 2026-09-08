import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSuperAdminSession = vi.fn();
const cookiesSet = vi.fn();
const prismaMock = vi.hoisted(() => ({
  business: { findUnique: vi.fn() },
}));

vi.mock("@/server/auth/admin-session", () => ({
  requireSuperAdminSession: () => requireSuperAdminSession(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookiesSet }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { impersonateBusinessAction, exitImpersonationAction } from "@/server/actions/impersonate.actions";
import { ADMIN_AUTH_COOKIE_NAME, AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/core/constants";

const admin = {
  id: "admin-1",
  email: "admin@purocode.cl",
  name: "Diego",
  role: "SUPERADMIN" as const,
  isSuperAdmin: true,
  tokenVersion: 3,
  adminAccess: true as const,
  sessionId: "session-1",
  lastAuthAt: new Date(),
  expiresAt: new Date(),
  rememberDevice: true,
};

describe("impersonation no hereda la sesión persistente de superadmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";
    requireSuperAdminSession.mockResolvedValue(admin);
  });

  it("solo reemplaza la cookie de negocio y deja intacta la cookie admin", async () => {
    prismaMock.business.findUnique.mockResolvedValue({
      id: "biz-1",
      owner: {
        id: "owner-1",
        email: "owner@example.com",
        name: "Owner",
        role: "ADMIN",
        isSuperAdmin: false,
        tokenVersion: 1,
      },
    });

    await expect(impersonateBusinessAction("biz-1")).rejects.toThrow("REDIRECT:/dashboard");
    expect(cookiesSet).toHaveBeenCalledTimes(1);
    expect(cookiesSet.mock.calls[0][0]).toBe(AUTH_COOKIE_NAME);
    expect(cookiesSet.mock.calls[0][2]).toEqual(expect.objectContaining({
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
    }));
    expect(cookiesSet.mock.calls.some((call) => call[0] === ADMIN_AUTH_COOKIE_NAME)).toBe(false);
  });

  it("al salir de impersonation restaura el dashboard del superadmin sin tocar 30 días", async () => {
    await expect(exitImpersonationAction()).rejects.toThrow("REDIRECT:/para/x7k9m2v4q8");
    expect(cookiesSet).toHaveBeenCalledTimes(1);
    expect(cookiesSet.mock.calls[0][0]).toBe(AUTH_COOKIE_NAME);
    expect(cookiesSet.mock.calls[0][2].maxAge).toBe(SESSION_MAX_AGE_SECONDS);
  });
});
