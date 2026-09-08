import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyCredentials = vi.fn();
const getBusinessForUser = vi.fn();

vi.mock("@/server/services/auth.service", () => ({
  verifyCredentials: (...args: unknown[]) => verifyCredentials(...args),
}));
vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: (...args: unknown[]) => getBusinessForUser(...args),
}));
vi.mock("@/server/lib/rate-limit", () => ({
  loginLimiter: { check: () => null },
}));

import { POST } from "@/app/api/auth/login/route";
import { ADMIN_AUTH_COOKIE_NAME, AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/core/constants";

describe("login de usuarios normales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";
    verifyCredentials.mockResolvedValue({
      id: "user-1",
      email: "owner@example.com",
      name: "Owner",
      role: "ADMIN",
      isSuperAdmin: false,
      tokenVersion: 1,
    });
    getBusinessForUser.mockResolvedValue(null);
  });

  it("no emite cookie ni sesión persistente de superadmin", async () => {
    const response = await POST(new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", password: "secret-password" }),
    }));

    expect(response.status).toBe(200);
    expect(response.cookies.get(AUTH_COOKIE_NAME)?.value).toBeTruthy();
    expect(response.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value).toBeUndefined();
    const setCookie = String(response.headers.get("set-cookie") ?? "");
    expect(setCookie).toContain(AUTH_COOKIE_NAME);
    expect(setCookie).not.toContain(ADMIN_AUTH_COOKIE_NAME);
    expect(setCookie).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
  });
});
