import { describe, expect, it } from "vitest";
import { clientPortalProfileSchema, clientPortalRegisterSchema, safeClientPortalReturnTo } from "@/server/validations/client-portal";

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

  it("exige un teléfono válido al activar la cuenta y al editar el perfil", () => {
    expect(clientPortalRegisterSchema.safeParse({
      email: "a@b.cl",
      password: "agenda2026segura",
      name: "Ana",
    }).success).toBe(false);
    expect(clientPortalProfileSchema.safeParse({ name: "Ana", phone: "123" }).success).toBe(false);
    expect(clientPortalProfileSchema.safeParse({ name: "Ana", phone: "+56 9 1234 5678", rut: "12.345.678-9" }).success).toBe(true);
  });

  it("solo permite retornos internos a un widget", () => {
    expect(safeClientPortalReturnTo("/widget/estetica-bella?service=service-1")).toBe("/widget/estetica-bella?service=service-1");
    expect(safeClientPortalReturnTo("https://evil.example/widget/demo")).toBeNull();
    expect(safeClientPortalReturnTo("//evil.example/widget/demo")).toBeNull();
    expect(safeClientPortalReturnTo("/dashboard")).toBeNull();
  });
});
