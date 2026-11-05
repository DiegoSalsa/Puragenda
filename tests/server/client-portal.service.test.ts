import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  clientPortalToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  clientPortalAccount: {
    findUnique: vi.fn(),
  },
  clientPortalSession: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  appointment: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import {
  consumeClientPortalMagicToken,
  createClientPortalAccountSession,
  createClientPortalSessionToken,
  getClientPortalAppUrl,
  getClientPortalCookieOptions,
  getClientPortalAppointment,
  hashClientPortalToken,
  issueClientPortalMagicToken,
  normalizeClientPortalEmail,
  resolveClientPortalSessionToken,
  verifyClientPortalSessionToken,
} from "@/server/services/client-portal.service";

describe("acceso sin contraseña al portal del cliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async work => typeof work === "function" ? work(prismaMock) : Promise.all(work));
    vi.unstubAllEnvs();
    process.env.AUTH_SECRET = "client-portal-test-secret-with-at-least-32-characters";
  });

  it("nunca genera enlaces localhost en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    expect(getClientPortalAppUrl()).toBe("https://www.puragenda.cl");
  });
  it("uses Secure, HttpOnly and SameSite=Lax cookies in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getClientPortalCookieOptions()).toMatchObject({ secure: true, httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("normaliza el correo y firma una sesión que no admite alteraciones", () => {
    const session = createClientPortalSessionToken("  Client@Example.COM ");

    expect(normalizeClientPortalEmail("  Client@Example.COM ")).toBe("client@example.com");
    expect(verifyClientPortalSessionToken(session)).toBe("client@example.com");
    expect(verifyClientPortalSessionToken(`${session.slice(0, -1)}x`)).toBeNull();
  });

  it("rechaza una sesión vencida", () => {
    const expired = createClientPortalSessionToken("client@example.com", -1);
    expect(verifyClientPortalSessionToken(expired)).toBeNull();
  });

  it("crea una sesión opaca, revocable y de larga duración para una cuenta activa", async () => {
    prismaMock.clientPortalAccount.findUnique.mockResolvedValue({ id: "account-1", emailVerifiedAt: new Date(), passwordHash: "synthetic-verified-hash" });

    const token = await createClientPortalAccountSession("client@example.com", undefined, "synthetic-verified-hash");

    expect(token).toMatch(/^cps_[A-Za-z0-9_-]{43}$/);
    expect(token).not.toContain("client@example.com");
    expect(prismaMock.clientPortalSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: "account-1",
        tokenHash: hashClientPortalToken(token),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("solo resuelve sesiones opacas vigentes asociadas a una cuenta verificada", async () => {
    const token = `cps_${"a".repeat(43)}`;
    prismaMock.clientPortalSession.findUnique.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      account: { email: "Client@Example.com", emailVerifiedAt: new Date() },
    });
    prismaMock.clientPortalSession.updateMany.mockResolvedValue({ count: 1 });

    await expect(resolveClientPortalSessionToken(token)).resolves.toBe("client@example.com");
    expect(prismaMock.clientPortalSession.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { tokenHash: hashClientPortalToken(token) },
    }));
  });

  it("consume un enlace mágico de forma atómica y una sola vez", async () => {
    const token = "a".repeat(64);
    prismaMock.clientPortalToken.findUnique.mockResolvedValue({
      id: "token-1",
      email: "client@example.com",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      purpose: "MAGIC_ACCESS",
      authenticationIntent: true,
    });
    prismaMock.clientPortalToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(consumeClientPortalMagicToken(token)).resolves.toBe("client@example.com");
    expect(prismaMock.clientPortalToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashClientPortalToken(token) },
    });

    prismaMock.clientPortalToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(consumeClientPortalMagicToken(token)).resolves.toBeNull();
  });

  it("crea enlaces de autenticación por 15 minutos sin invalidar otros enlaces vigentes", async () => {
    const before = Date.now();

    const result = await issueClientPortalMagicToken("client@example.com");

    expect(result.token).toHaveLength(64);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000);
    expect(prismaMock.clientPortalToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: expect.any(Date) } },
    });
    expect(prismaMock.clientPortalToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "client@example.com",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("siempre limita una cita al correo de la sesión", async () => {
    prismaMock.appointment.findFirst.mockResolvedValue(null);

    await getClientPortalAppointment("appointment-1", " Client@Example.com ");

    expect(prismaMock.appointment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "appointment-1",
        portalOwnerEmail: "client@example.com",
      }),
    }));
  });
});
