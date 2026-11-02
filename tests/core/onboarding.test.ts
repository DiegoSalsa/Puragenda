import { describe, expect, it } from "vitest";
import { activationState, canManageSetup, defaultSetupHours, hoursSchema, setupProgress, setupTransition } from "@/core/onboarding";
import { allowedTutorials, recommendTutorial, TUTORIALS, tutorialNeedsUpdate } from "@/core/tutorials";
import { LEGACY_ROLE_PERMISSIONS } from "@/core/permissions";

const facts = { mode: "solo", hours: false, staff: true, services: false, businessOnly: false, verified: false };
describe("Puri Setup rules", () => {
  it("skips an unnecessary team step for a solo owner whose profile already exists", () => {
    expect(setupProgress(facts).steps).toEqual(["business", "hours", "services", "check"]);
    expect(setupTransition("hours", "next", facts)).toBe("services");
    expect(setupTransition("services", "back", facts)).toBe("hours");
  });
  it("retains professionals for teams and for solo accounts with missing availability", () => {
    expect(setupProgress({ ...facts, mode: "team" }).steps).toContain("staff");
    expect(setupProgress({ ...facts, staff: false }).steps).toContain("staff");
  });
  it("never calls a set of completed forms functional without verified availability", () => {
    expect(setupProgress({ ...facts, hours: true, services: true }).percent).toBe(75);
    expect(setupProgress({ ...facts, hours: true, services: true, verified: true }).percent).toBe(100);
  });
  it("requires all setup management permissions, independently of client navigation", () => {
    expect(canManageSetup(LEGACY_ROLE_PERMISSIONS.STAFF)).toBe(false);
    expect(canManageSetup(["settings.manage", "staff.manage"])).toBe(false);
    expect(canManageSetup(LEGACY_ROLE_PERMISSIONS.ADMIN)).toBe(true);
  });
  it("validates seven distinct days and pauses inside a valid day", () => {
    const hours = defaultSetupHours(); expect(hoursSchema.safeParse(hours).success).toBe(true);
    expect(hoursSchema.safeParse([...hours.slice(0, 6), hours[0]]).success).toBe(false);
    hours[1].breakStart = "08:00"; hours[1].breakEnd = "09:00";
    expect(hoursSchema.safeParse(hours).success).toBe(false);
    hours[1].breakStart = "13:00"; hours[1].breakEnd = "14:00";
    expect(hoursSchema.safeParse(hours).success).toBe(true);
  });
  it("derives progressive activation from observed configuration and bookings", () => {
    expect(activationState(false, false, 0)).toBe("incomplete");
    expect(activationState(true, false, 0)).toBe("unshared");
    expect(activationState(true, true, 0)).toBe("no_bookings");
    expect(activationState(true, true, 1)).toBe("first_booking");
    expect(activationState(true, true, 8)).toBe("habitual");
  });
});
describe("Learning catalog", () => {
  it("filters both permissions and paid capabilities", () => {
    const staff = allowedTutorials(LEGACY_ROLE_PERMISSIONS.STAFF);
    expect(staff.some(t => t.id === "staff" || t.id === "hours")).toBe(false);
    expect(allowedTutorials(LEGACY_ROLE_PERMISSIONS.ADMIN).some(t => t.id === "website")).toBe(false);
    expect(allowedTutorials(LEGACY_ROLE_PERMISSIONS.ADMIN, ["website.editor"]).some(t => t.id === "website")).toBe(true);
  });
  it("offers only authorized guides from natural-language help, without an AI dependency", () => {
    expect(recommendTutorial("Puri, ¿cómo bloqueo un día para que no me reserven?", TUTORIALS)?.id).toBe("block-day");
    expect(recommendTutorial("¿Cómo agrego otro profesional?", TUTORIALS)?.id).toBe("staff");
    expect(recommendTutorial("¿Cómo agrego otro profesional?", allowedTutorials(LEGACY_ROLE_PERMISSIONS.STAFF))).toBeNull();
    expect(recommendTutorial("Cuántas citas hay hoy", TUTORIALS)).toBeNull();
  });
  it("uses versioned completion instead of legacy localStorage flags", () => {
    const tutorial = TUTORIALS.find(t => t.id === "today")!;
    expect(tutorialNeedsUpdate({ version: 1, status: "completed" }, tutorial)).toBe(true);
    expect(tutorialNeedsUpdate({ version: 2, status: "paused" }, tutorial)).toBe(true);
    expect(tutorialNeedsUpdate({ version: 2, status: "completed" }, tutorial)).toBe(false);
    expect(new Set(TUTORIALS.map(t => t.id)).size).toBe(TUTORIALS.length);
    expect(TUTORIALS.every(t => t.steps.length >= 2 && t.steps.length <= 5)).toBe(true);
  });
});
