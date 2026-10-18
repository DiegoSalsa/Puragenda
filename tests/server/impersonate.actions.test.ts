import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSuperAdminSession = vi.fn();
const cookiesSet = vi.fn();
const prismaMock = vi.hoisted(() => ({
  business: { findUnique: vi.fn() },
  staff: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const getBusinessForUser = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser }));

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

import { impersonateBusinessAction, impersonateStaffAction, exitImpersonationAction } from "@/server/actions/impersonate.actions";
import { verifySessionToken } from "@/server/auth/session";
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
    getBusinessForUser.mockResolvedValue({ id: "biz-1" });
    prismaMock.auditLog.create.mockResolvedValue({ id: "audit-1" });
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

  it.each(["ADMIN", "RECEPTIONIST", "STAFF"])("enters a professional with the real %s role and its own tokenVersion", async role => {
    prismaMock.staff.findFirst.mockResolvedValue({ id: "staff-1", user: { id: "staff-user", name: "Professional", email: "staff@example.test", role, isSuperAdmin: false, tokenVersion: 7, deletedAt: null } });
    await expect(impersonateStaffAction("biz-1", "staff-1")).rejects.toThrow("REDIRECT:/dashboard");
    expect(prismaMock.staff.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "staff-1", businessId: "biz-1", isActive: true } }));
    const token = verifySessionToken(cookiesSet.mock.calls[0][1]);
    expect(token).toMatchObject({ id: "staff-user", role, tokenVersion: 7, isSuperAdmin: false, adminAccess: false });
    expect(cookiesSet).toHaveBeenCalledTimes(1);
    expect(cookiesSet.mock.calls[0][0]).toBe(AUTH_COOKIE_NAME);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({ data: { userId: admin.id, action: "ADMIN_IMPERSONATION_STARTED", details: JSON.stringify({ businessId: "biz-1", targetUserId: "staff-user", staffId: "staff-1" }) } });
  });

  it("rejects callers without the independent superadmin session", async () => {
    requireSuperAdminSession.mockRejectedValueOnce(new Error("Acceso denegado"));
    await expect(impersonateStaffAction("biz-1", "staff-1")).rejects.toThrow("Acceso denegado");
    expect(prismaMock.staff.findFirst).not.toHaveBeenCalled();
    expect(cookiesSet).not.toHaveBeenCalled();
  });

  it.each(["owner", "staff"])("asks legacy sessions to authenticate before impersonating %s without a separate admin cookie", async target => {
    requireSuperAdminSession.mockResolvedValueOnce({ ...admin, sessionId: "legacy" });
    const result = target === "owner" ? await impersonateBusinessAction("biz-1") : await impersonateStaffAction("biz-1", "staff-1");
    expect(result).toHaveProperty("error");
    expect(cookiesSet).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([null, { id: "staff-1", user: null }])("does not issue a session for an inactive, foreign or unlinked professional", async staff => {
    prismaMock.staff.findFirst.mockResolvedValue(staff);
    expect(await impersonateStaffAction("biz-1", "staff-1")).toHaveProperty("error");
    expect(cookiesSet).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([{ deletedAt: new Date(), isSuperAdmin: false }, { deletedAt: null, isSuperAdmin: true }, { deletedAt: null, isSuperAdmin: false, role: "SUPERADMIN" }])("does not impersonate deleted users or superadmins", async flags => {
    prismaMock.staff.findFirst.mockResolvedValue({ id: "staff-1", user: { id: "staff-user", ...flags } });
    expect(await impersonateStaffAction("biz-1", "staff-1")).toHaveProperty("error");
    expect(cookiesSet).not.toHaveBeenCalled();
  });

  it("does not redirect into another business when the account has a different primary business", async () => {
    prismaMock.staff.findFirst.mockResolvedValue({ id: "staff-1", user: { id: "staff-user", deletedAt: null, isSuperAdmin: false } });
    getBusinessForUser.mockResolvedValueOnce({ id: "other-business" });
    expect(await impersonateStaffAction("biz-1", "staff-1")).toHaveProperty("error");
    expect(cookiesSet).not.toHaveBeenCalled();
  });

  it("does not open the impersonated session if audit recording fails", async () => {
    prismaMock.staff.findFirst.mockResolvedValue({ id: "staff-1", user: { id: "staff-user", deletedAt: null, isSuperAdmin: false } });
    prismaMock.auditLog.create.mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(impersonateStaffAction("biz-1", "staff-1")).rejects.toThrow("audit unavailable");
    expect(cookiesSet).not.toHaveBeenCalled();
  });
});
