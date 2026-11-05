import { describe, expect, it } from "vitest";
import { DASHBOARD_PERMISSIONS as P, LEGACY_ROLE_PERMISSIONS } from "@/core/permissions";
import { dashboardAppointmentDTO, redactPrivateData } from "@/server/services/private-data";
const row = { id: "synthetic", staffId: "own", privateNotes: "CRM_SECRET", clientNotes: "CRM_SECRET", internalNotes: "NOTE_SECRET", healthAnswers: { q: "HEALTH_SECRET" }, healthFreeText: "HEALTH_SECRET", client: { rut: "RUT_SECRET", privateNotes: "CRM_SECRET" }, managementToken: "TOKEN_SECRET", managementTokenHash: "HASH_SECRET", service: { name: "Synthetic" }, business: { apiKey: "API_SECRET", mpAccessToken: "PROVIDER_SECRET" } };
describe("audit 04 private categories", () => {
  it.each([
    ["owner", LEGACY_ROLE_PERMISSIONS.ADMIN, true, true, true],
    ["administrator", LEGACY_ROLE_PERMISSIONS.ADMIN, true, true, true],
    ["receptionist", LEGACY_ROLE_PERMISSIONS.RECEPTIONIST, true, true, false],
    ["professional", LEGACY_ROLE_PERMISSIONS.STAFF, false, false, false],
    ["custom professional", [P.APPOINTMENTS_VIEW_OWN, P.HEALTH_VIEW_OWN, P.APPOINTMENT_NOTES_VIEW], false, true, true],
    ["agenda read-only", [P.APPOINTMENTS_VIEW_ALL], false, false, false],
    ["no CRM", [P.APPOINTMENTS_MANAGE_OWN], false, false, false],
  ] as const)("%s receives only authorized categories", (_, permissions, crm, notes, health) => {
    const value = JSON.stringify(redactPrivateData(row, permissions, "own"));
    expect(value.includes("CRM_SECRET")).toBe(crm); expect(value.includes("NOTE_SECRET")).toBe(notes); expect(value.includes("HEALTH_SECRET")).toBe(health);
    expect(value).not.toMatch(/TOKEN_SECRET|HASH_SECRET/);
  });
  it("own-health permission cannot read another professional's form", () => {
    expect(JSON.stringify(redactPrivateData(row, [P.HEALTH_VIEW_OWN], "other"))).not.toContain("HEALTH_SECRET");
  });
  it("dashboard API DTO never returns business/provider credentials or fields outside its contract", () => {
    expect(JSON.stringify(dashboardAppointmentDTO(row, [], "own"))).not.toMatch(/SECRET|healthAnswers|privateNotes|internalNotes|business/);
    expect(row.internalNotes).toBe("NOTE_SECRET");
  });
});
