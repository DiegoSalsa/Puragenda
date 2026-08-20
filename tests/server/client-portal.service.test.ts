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
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import {
  consumeClientPortalMagicToken,
  createClientPortalAccountSession,
  createClientPortalSessionToken,
  getClientPortalAppUrl,
  getClientPortalAppointment,
  hashClientPortalToken,
  issueClientPortalEmailToken,
  normalizeClientPortalEmail,
  resolveClientPortalSessionToken,
  verifyClientPortalSessionToken,
} from "@/server/services/client-portal.service";

describe("acceso sin contraseña al portal del cliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    process.env.AUTH_SECRET = "client-portal-test-secret-with-at-least-32-characters";
  });

  it("nunca genera enlaces localhost en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    expect(getClientPortalAppUrl()).toBe("https://www.puragenda.cl");
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
    prismaMock.clientPortalAccount.findUnique.mockResolvedValue({ id: "account-1", emailVerifiedAt: new Date() });
    prismaMock.$transaction.mockResolvedValue([]);

    const token = await createClientPortalAccountSession("client@example.com");

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
    });
    prismaMock.clientPortalToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(consumeClientPortalMagicToken(token)).resolves.toBe("client@example.com");
    expect(prismaMock.clientPortalToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashClientPortalToken(token) },
    });

    prismaMock.clientPortalToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(consumeClientPortalMagicToken(token)).resolves.toBeNull();
  });

  it("crea enlaces de correo por 30 días sin invalidar otros enlaces vigentes", async () => {
    prismaMock.$transaction.mockResolvedValue([]);
    const before = Date.now();

    const result = await issueClientPortalEmailToken("client@example.com");

    expect(result.token).toHaveLength(64);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000);
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
        OR: expect.arrayContaining([
          { customerEmail: { equals: "client@example.com", mode: "insensitive" } },
        ]),
      }),
    }));
  });
});
