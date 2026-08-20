import { describe, expect, it } from "vitest";
import { clientPortalRegisterSchema } from "@/server/validations/client-portal";

describe("activación de cuenta del cliente", () => {
  it("normaliza el correo y acepta una contraseña razonablemente segura", () => {
    const result = clientPortalRegisterSchema.parse({
      email: " Client@Example.COM ",
      password: "agenda2026segura",
      name: "María",
      phone: "+56 9 1234 5678",
    });
    expect(result.email).toBe("client@example.com");
  });

  it("rechaza contraseñas cortas o sin números", () => {
    expect(clientPortalRegisterSchema.safeParse({ email: "a@b.cl", password: "corta1", name: "Ana" }).success).toBe(false);
    expect(clientPortalRegisterSchema.safeParse({ email: "a@b.cl", password: "sololetraslargas", name: "Ana" }).success).toBe(false);
  });
});
