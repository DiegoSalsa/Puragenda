import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  superAdminSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import {
  ADMIN_AUTH_COOKIE_NAME,
  createSuperAdminSession,
  getAdminSessionCookieOptions,
  getAdminSessionMaxAgeSeconds,
  hashAdminSessionToken,
  isAdminSessionToken,
  isRecentAdminAuth,
  listSuperAdminSessions,
  resolveSuperAdminSessionToken,
  revokeAllSuperAdminSessionsForUser,
  revokeSuperAdminSessionById,
  revokeSuperAdminSessionByToken,
  summarizeUserAgent,
} from "@/server/auth/admin-session";
import {
  ADMIN_REMEMBERED_SESSION_MAX_AGE_SECONDS,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  STEP_UP_REQUIRED,
} from "@/core/constants";
import { createSessionToken, getSessionCookieOptions, verifySessionToken } from "@/server/auth/session";
import { proxy } from "@/proxy";

const superadmin = {
  id: "admin-1",
  email: "admin@purocode.cl",
  name: "Diego",
  role: "SUPERADMIN" as const,
  isSuperAdmin: true,
  tokenVersion: 1,
};

const normalUser = {
  id: "user-1",
  email: "owner@example.com",
  name: "Owner",
  role: "ADMIN" as const,
  isSuperAdmin: false,
  tokenVersion: 1,
};

describe("sesiones persistentes de superadmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") return arg(prismaMock);
      return Promise.all(arg as Promise<unknown>[]);
    });
    prismaMock.superAdminSession.create.mockResolvedValue({ id: "session-1" });
    prismaMock.superAdminSession.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.superAdminSession.updateMany.mockResolvedValue({ count: 1 });
  });

  it("A. crea una sesión opaca al autenticar un superadmin", async () => {
    const created = await createSuperAdminSession({ user: superadmin, userAgent: "Mozilla/5.0 Chrome/120 Windows NT 10.0" });

    expect(isAdminSessionToken(created.token)).toBe(true);
    expect(created.token).not.toContain(superadmin.email);
    expect(created.token).not.toContain(superadmin.id);
    expect(prismaMock.superAdminSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: superadmin.id,
        tokenHash: hashAdminSessionToken(created.token),
        rememberDevice: true,
        userAgent: "Chrome · Windows",
      }),
      select: { id: true },
    });
  });

  it("B. remember device fija expiresAt en ~30 días; si se desmarca usa 8 horas", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const remembered = await createSuperAdminSession({ user: superadmin, rememberDevice: true, now });
    expect(remembered.maxAgeSeconds).toBe(ADMIN_REMEMBERED_SESSION_MAX_AGE_SECONDS);
    expect(remembered.expiresAt.getTime() - now.getTime()).toBe(30 * 24 * 60 * 60 * 1000);

    const short = await createSuperAdminSession({ user: superadmin, rememberDevice: false, now });
    expect(short.maxAgeSeconds).toBe(ADMIN_SESSION_MAX_AGE_SECONDS);
    expect(short.expiresAt.getTime() - now.getTime()).toBe(8 * 60 * 60 * 1000);
  });

  it("C/D. la cookie HttpOnly tiene maxAge persistente y no es legible como JWT", async () => {
    const options = getAdminSessionCookieOptions(getAdminSessionMaxAgeSeconds(true));
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(ADMIN_REMEMBERED_SESSION_MAX_AGE_SECONDS);
    expect(options.maxAge).toBeGreaterThan(SESSION_MAX_AGE_SECONDS);
    expect(ADMIN_AUTH_COOKIE_NAME).toBe("puragenda_admin_session");
    expect(AUTH_COOKIE_NAME).toBe("puragenda_session");
  });

  it("E. el día 29 la sesión recordada sigue válida", async () => {
    const loginAt = new Date("2026-01-01T00:00:00.000Z");
    const day29 = new Date("2026-01-30T00:00:00.000Z");
    const created = await createSuperAdminSession({ user: superadmin, rememberDevice: true, now: loginAt });
    prismaMock.superAdminSession.findUnique.mockResolvedValue({
      id: "session-1",
      expiresAt: created.expiresAt,
      lastUsedAt: loginAt,
      lastAuthAt: loginAt,
      revokedAt: null,
      rememberDevice: true,
      user: { ...superadmin, deletedAt: null },
    });

    await expect(resolveSuperAdminSessionToken(created.token, day29)).resolves.toMatchObject({
      id: superadmin.id,
      adminAccess: true,
      sessionId: "session-1",
    });
  });

  it("F. el día 31 la sesión recordada es inválida", async () => {
    const loginAt = new Date("2026-01-01T00:00:00.000Z");
    const day31 = new Date("2026-02-01T00:00:01.000Z");
    const created = await createSuperAdminSession({ user: superadmin, rememberDevice: true, now: loginAt });
    prismaMock.superAdminSession.findUnique.mockResolvedValue({
      id: "session-1",
      expiresAt: created.expiresAt,
      lastUsedAt: loginAt,
      lastAuthAt: loginAt,
      revokedAt: null,
      rememberDevice: true,
      user: { ...superadmin, deletedAt: null },
    });

    await expect(resolveSuperAdminSessionToken(created.token, day31)).resolves.toBeNull();
  });

  it("G. logout revoca solo la sesión actual", async () => {
    const token = `sas_${"a".repeat(43)}`;
    await expect(revokeSuperAdminSessionByToken(token)).resolves.toBe(true);
    expect(prismaMock.superAdminSession.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: hashAdminSessionToken(token), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("H. logout all revoca todas las sesiones del superadmin", async () => {
    prismaMock.superAdminSession.updateMany.mockResolvedValue({ count: 3 });
    await expect(revokeAllSuperAdminSessionsForUser(superadmin.id)).resolves.toBe(3);
    expect(prismaMock.superAdminSession.updateMany).toHaveBeenCalledWith({
      where: { userId: superadmin.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("I. si el rol superadmin se retira, la sesión deja de funcionar", async () => {
    const token = `sas_${"b".repeat(43)}`;
    prismaMock.superAdminSession.findUnique.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 86_400_000),
      lastUsedAt: new Date(),
      lastAuthAt: new Date(),
      revokedAt: null,
      rememberDevice: true,
      user: { ...superadmin, isSuperAdmin: false, deletedAt: null },
    });

    await expect(resolveSuperAdminSessionToken(token)).resolves.toBeNull();
  });

  it("J. una cookie manipulada se rechaza", async () => {
    await expect(resolveSuperAdminSessionToken("not-a-token")).resolves.toBeNull();
    await expect(resolveSuperAdminSessionToken(`sas_${"c".repeat(42)}x`)).resolves.toBeNull();
    prismaMock.superAdminSession.findUnique.mockResolvedValue(null);
    await expect(resolveSuperAdminSessionToken(`sas_${"d".repeat(43)}`)).resolves.toBeNull();
  });

  it("K. un usuario normal no puede obtener sesión persistente de 30 días", async () => {
    await expect(createSuperAdminSession({ user: normalUser, rememberDevice: true })).rejects.toThrow(
      "Solo un superadmin puede crear una sesión persistente de panel",
    );
    expect(prismaMock.superAdminSession.create).not.toHaveBeenCalled();
    expect(getSessionCookieOptions().maxAge).toBe(SESSION_MAX_AGE_SECONDS);
  });

  it("L. impersonation usa la cookie de negocio de 7 días y no hereda 30 días", () => {
    const impersonation = createSessionToken({
      ...normalUser,
      adminAccess: false,
    });
    expect(verifySessionToken(impersonation)).toEqual({ ...normalUser, adminAccess: false });
    expect(getSessionCookieOptions().maxAge).toBe(SESSION_MAX_AGE_SECONDS);
    expect(getSessionCookieOptions().maxAge).not.toBe(ADMIN_REMEMBERED_SESSION_MAX_AGE_SECONDS);
  });

  it("M. una acción sensible exige reautenticación reciente", () => {
    const fresh = { lastAuthAt: new Date() };
    const stale = { lastAuthAt: new Date(Date.now() - 16 * 60 * 1000) };
    expect(isRecentAdminAuth(fresh)).toBe(true);
    expect(isRecentAdminAuth(stale)).toBe(false);
    expect(STEP_UP_REQUIRED).toBe("STEP_UP_REQUIRED");
  });

  it("no resume una sesión revocada", async () => {
    const token = `sas_${"e".repeat(43)}`;
    prismaMock.superAdminSession.findUnique.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 86_400_000),
      lastUsedAt: new Date(),
      lastAuthAt: new Date(),
      revokedAt: new Date(),
      rememberDevice: true,
      user: { ...superadmin, deletedAt: null },
    });
    await expect(resolveSuperAdminSessionToken(token)).resolves.toBeNull();
  });

  it("lista sesiones activas sin el hash del token", async () => {
    prismaMock.superAdminSession.findMany.mockResolvedValue([
      {
        id: "session-1",
        createdAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        userAgent: "Chrome · Windows",
        rememberDevice: true,
      },
    ]);
    const sessions = await listSuperAdminSessions(superadmin.id, "session-1");
    expect(sessions).toEqual([
      expect.objectContaining({ id: "session-1", current: true, userAgent: "Chrome · Windows" }),
    ]);
    expect(JSON.stringify(sessions)).not.toContain("tokenHash");
  });

  it("revoca una sesión de otro dispositivo sin cerrar la actual", async () => {
    await revokeSuperAdminSessionById(superadmin.id, "session-2");
    expect(prismaMock.superAdminSession.updateMany).toHaveBeenCalledWith({
      where: { id: "session-2", userId: superadmin.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("resume el user-agent sin fingerprinting agresivo", () => {
    expect(summarizeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0")).toBe("Chrome · macOS");
    expect(summarizeUserAgent(null)).toBeNull();
  });
});

describe("proxy del panel superadmin", () => {
  it("exige cookie de admin y no la de impersonation", () => {
    const impersonation = createSessionToken({ ...normalUser, adminAccess: false });
    const blocked = proxy(new NextRequest("http://localhost/para/x7k9m2v4q8", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${impersonation}` },
    }));
    expect(blocked.status).toBe(307);
    expect(blocked.headers.get("location")).toContain("/para/x7k9m2v4q8/login");

    const allowed = proxy(new NextRequest("http://localhost/para/x7k9m2v4q8", {
      headers: { cookie: `${ADMIN_AUTH_COOKIE_NAME}=sas_${"f".repeat(43)}` },
    }));
    expect(allowed.status).toBe(200);
  });

  it("sigue aceptando la cookie JWT legacy con adminAccess durante la transición", () => {
    const legacy = createSessionToken({ ...superadmin, adminAccess: true });
    const allowed = proxy(new NextRequest("http://localhost/para/x7k9m2v4q8", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${legacy}` },
    }));
    expect(allowed.status).toBe(200);
  });

  it("no abre el panel con una cookie de usuario normal", () => {
    const token = createSessionToken({ ...normalUser, adminAccess: false });
    const blocked = proxy(new NextRequest("http://localhost/para/x7k9m2v4q8", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    }));
    expect(blocked.status).toBe(307);
  });
});
