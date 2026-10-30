import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ permissions: [] as string[], appointments: vi.fn(), recurring: vi.fn(), clients: vi.fn(async () => []) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: async () => ({ id: "synthetic", role: "STAFF", email: "s@synthetic.invalid" }) }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: async () => ({ id: "business", ownerId: "owner", timezone: "UTC", countryCode: "CL" }), getStaffAgendaScope: async () => ({ ownStaffId: "staff", staffId: "staff", canSeeAllAgendas: false }) }));
vi.mock("@/server/services/businessHours.service", () => ({ getBusinessHours: async () => [] }));
vi.mock("@/server/services/permissions.service", () => ({ getEffectiveBusinessPermissions: async () => m.permissions }));
vi.mock("@/server/db/prisma", () => ({ prisma: { businessLocation: { findMany: async () => [] }, appointment: { findMany: m.appointments }, recurringBooking: { findMany: m.recurring }, scheduleBlock: { findMany: async () => [] }, service: { findMany: async () => [] }, staff: { findMany: async () => [] }, client: { findMany: m.clients } } }));
import Page from "@/app/dashboard/agenda/page";
describe("audit 04 Agenda serialized server props", () => {
  beforeEach(() => {
    m.clients.mockClear();
    m.permissions = ["appointments.view_own"];
    m.appointments.mockResolvedValue([{ id: "a", staffId: "staff", businessId: "business", updatedAt: new Date(), startTime: new Date(), endTime: new Date(), service: { name: "S", price: 1 }, posPayments: [], client: { privateNotes: "SYNTHETIC_PRIVATE_CRM" }, internalNotes: "SYNTHETIC_INTERNAL" }]);
    m.recurring.mockResolvedValue([{ id: "r", staffId: "staff", businessId: "business", service: { name: "S" }, startDate: new Date(), endDate: new Date(), createdAt: new Date(), healthAnswers: { question: "SYNTHETIC_HEALTH" }, healthFreeText: "SYNTHETIC_HEALTH_COMMENT" }]);
  });
  it("04-04 view-own alone serializes no private CRM, internal or health values", async () => {
    const payload = JSON.stringify(await Page({ searchParams: Promise.resolve({}) }));
    expect(payload).not.toMatch(/SYNTHETIC_PRIVATE_CRM|SYNTHETIC_INTERNAL|SYNTHETIC_HEALTH/);
  });
  it("does not load the business CRM directory for a professional who can manage only their agenda", async () => {
    m.permissions = ["appointments.view_own", "appointments.manage_own"];
    await Page({ searchParams: Promise.resolve({}) });
    expect(m.clients).not.toHaveBeenCalled();
  });
});
