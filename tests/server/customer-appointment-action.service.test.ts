import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));

import { hashCustomerAppointmentToken } from "@/server/services/customer-appointment-action.service";

describe("tokens de gestión de citas", () => {
  it("guarda una huella determinista sin conservar el token original", () => {
    const token = "a".repeat(64);
    const hash = hashCustomerAppointmentToken(token);

    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(token);
    expect(hashCustomerAppointmentToken(token)).toBe(hash);
  });
});
