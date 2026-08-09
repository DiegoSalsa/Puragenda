import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
} from "@/server/auth/session";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";

const sessionUser = {
  id: "user-1",
  email: "owner@example.com",
  name: "Owner",
  role: "ADMIN" as const,
  isSuperAdmin: false,
  tokenVersion: 7,
};

describe("session security", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";
    vi.clearAllMocks();
  });

  it("signs and preserves the database token version", () => {
    const token = createSessionToken(sessionUser);

    expect(verifySessionToken(token)).toEqual({ ...sessionUser, adminAccess: false });
    expect(verifySessionToken(`${token}tampered`)).toBeNull();
  });

  it("rejects a signed session after its database token version changes", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...sessionUser,
      tokenVersion: 8,
      deletedAt: null,
    } as never);
    const request = new NextRequest("http://localhost/api/auth/me", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${createSessionToken(sessionUser)}` },
    });

    await expect(getApiSessionUser(request)).resolves.toBeNull();
  });
});
