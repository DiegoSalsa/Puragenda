import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ create: vi.fn(), service: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { business: { findUnique: async () => ({ id: "synthetic", subscription: { plan: "EQUIPO", status: "ACTIVE" } }) }, service: { findFirst: m.service } } }));
vi.mock("@/server/actions/recurring.actions", () => ({ createRecurringBookingAction: m.create }));
vi.mock("@/server/contact-flow/public-consent", () => ({ publicConsentEnabled: () => false }));
import { POST } from "@/app/api/widget/[slug]/book-recurring/route";
describe("audit 04 explicit health consent HTTP boundary", () => {
  beforeEach(() => { m.service.mockResolvedValue({ optionCategories: [], recurringPlan: { requiresHealthForm: true } }); m.create.mockImplementation(async data => data.healthAccepted === true ? { success: true } : { error: "Consentimiento requerido" }); });
  it.each([undefined, false, "true"])("04-05 rejects omitted, false and manipulated consent: %s", async healthAccepted => {
    const response = await POST(new NextRequest("http://localhost/api/widget/synthetic/book-recurring", { method: "POST", body: JSON.stringify({ serviceId: "s", selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: "2026-11-01", durationMonths: 1, customerName: "Synthetic", customerEmail: "c@synthetic.invalid", customerPhone: "123456789", healthAccepted }) }), { params: Promise.resolve({ slug: "synthetic" }) });
    expect(response.status).toBe(400);
  });
});
