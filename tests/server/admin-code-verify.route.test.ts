import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyAdminLoginCode = vi.fn();
const createSuperAdminSession = vi.fn();
const revokeSuperAdminSessionByToken = vi.fn();

vi.mock("@/server/services/admin-auth.service", () => ({
  verifyAdminLoginCode: (...args: unknown[]) => verifyAdminLoginCode(...args),
}));

vi.mock("@/server/auth/admin-session", () => ({
  ADMIN_AUTH_COOKIE_NAME: "puragenda_admin_session",
  createSuperAdminSession: (...args: unknown[]) => createSuperAdminSession(...args),
  revokeSuperAdminSessionByToken: (...args: unknown[]) => revokeSuperAdminSessionByToken(...args),
  getAdminSessionCookieOptions: (maxAge = 60 * 60 * 24 * 30) => ({
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge,
  }),
}));

vi.mock("@/server/lib/rate-limit", () => ({
  adminCodeVerifyLimiter: { check: () => null },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));

import { POST } from "@/app/api/auth/admin-code/verify/route";
import { ADMIN_AUTH_COOKIE_NAME, AUTH_COOKIE_NAME } from "@/core/constants";

const adminUser = {
  id: "admin-1",
  email: "admin@purocode.cl",
  name: "Diego",
  role: "SUPERADMIN",
  isSuperAdmin: true,
  tokenVersion: 1,
};

describe("POST /api/auth/admin-code/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";
    verifyAdminLoginCode.mockResolvedValue({ user: adminUser });
    createSuperAdminSession.mockResolvedValue({
      token: `sas_${"g".repeat(43)}`,
      sessionId: "session-1",
      maxAgeSeconds: 60 * 60 * 24 * 30,
      expiresAt: new Date(Date.now() + 60 * 60 * 24 * 30 * 1000),
    });
    revokeSuperAdminSessionByToken.mockResolvedValue(false);
  });

  function request(body: Record<string, unknown>, cookie?: string) {
    return new NextRequest("http://localhost/api/auth/admin-code/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it("crea la sesión persistente de superadmin y no pone el token en el cuerpo", async () => {
    const response = await POST(request({ email: "admin@purocode.cl", code: "123456", rememberDevice: true }));
    const json = await response.json();
    const adminCookie = response.cookies.get(ADMIN_AUTH_COOKIE_NAME);
    const businessCookie = response.cookies.get(AUTH_COOKIE_NAME);

    expect(response.status).toBe(200);
    expect(json).not.toHaveProperty("token");
    expect(JSON.stringify(json)).not.toContain("sas_");
    expect(adminCookie?.value).toMatch(/^sas_/);
    expect(String(response.headers.get("set-cookie") ?? "")).toMatch(/httponly/i);
    expect(createSuperAdminSession).toHaveBeenCalledWith(expect.objectContaining({
      user: adminUser,
      rememberDevice: true,
    }));
    expect(businessCookie?.value).toBeTruthy();
  });

  it("usa duración corta si se desmarca recordar dispositivo", async () => {
    createSuperAdminSession.mockResolvedValue({
      token: `sas_${"h".repeat(43)}`,
      sessionId: "session-2",
      maxAgeSeconds: 60 * 60 * 8,
      expiresAt: new Date(Date.now() + 60 * 60 * 8 * 1000),
    });

    await POST(request({ email: "admin@purocode.cl", code: "123456", rememberDevice: false }));
    expect(createSuperAdminSession).toHaveBeenCalledWith(expect.objectContaining({ rememberDevice: false }));
  });

  it("recuerda el dispositivo por defecto si el cliente no envía el flag", async () => {
    await POST(request({ email: "admin@purocode.cl", code: "123456" }));
    expect(createSuperAdminSession).toHaveBeenCalledWith(expect.objectContaining({ rememberDevice: true }));
  });
});
