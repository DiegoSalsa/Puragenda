import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), appointments: vi.fn(), update: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { appointment: { findMany: mocks.appointments, update: mocks.update }, recurringBooking: { findMany: vi.fn(async () => []) }, recurringSessionOverride: { findMany: vi.fn(async () => []) } } }));
vi.mock("@/server/email/resend", () => ({ resend: { emails: { send: mocks.send } }, EMAIL_FROM: "fixture@example.invalid" }));
vi.mock("@/server/auth/cron", () => ({ authorizeCronRequest: () => null }));
vi.mock("@/server/services/customer-appointment-action.service", () => ({ issueCustomerAppointmentToken: async () => "synthetic-token" }));
vi.mock("@/server/email/send", () => ({ addClientPortalLinkToEmail: async (_email: string, template: unknown) => template }));
import { GET } from "@/app/api/cron/reminders/route";
const branches = [{ timezone: "America/Santiago", address: "Centro 100", mapsUrl: "https://maps.example.invalid/center" }, { timezone: "Pacific/Easter", address: "Isla 200", mapsUrl: "https://maps.example.invalid/island" }];
const internalNote = "SYNTHETIC_INTERNAL_NOTE_MUST_STAY_IN_PURAGENDA";
const appointments = branches.map((location, index) => ({ id: `reminder-${index}`, location, internalNotes: internalNote, customerName: "Fixture", customerEmail: `client-${index}@example.invalid`, startTime: new Date("2026-07-04T04:30:00Z"), endTime: new Date("2026-07-04T05:00:00Z"), service: { name: "Consulta" }, staff: null, business: { name: "Business", timezone: "America/Santiago", locale: "es", address: "General 999", mapsUrl: null } }));
describe("reminders follow the booked branch civil date", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); mocks.appointments.mockResolvedValue(appointments); mocks.send.mockResolvedValue({ data: { id: "synthetic-mail" }, error: null }); });
  afterEach(() => vi.useRealTimers());
  it("renders different dates and times for the same UTC instant", async () => {
    vi.setSystemTime(new Date("2026-07-03T04:00:00Z"));
    const response = await GET(new Request("http://localhost/api/cron/reminders")); expect(response.status).toBe(200);
    expect((await response.json()).sent).toBe(2);
    const center = mocks.send.mock.calls.find(([m]) => m.to === "client-0@example.invalid")![0].html;
    const island = mocks.send.mock.calls.find(([m]) => m.to === "client-1@example.invalid")![0].html;
    expect(center).toContain("00:30"); expect(center).toContain("4 de julio de 2026"); expect(center).toContain("Centro 100");
    expect(island).toContain("22:30"); expect(island).toContain("3 de julio de 2026"); expect(island).toContain("Isla 200");
    expect(JSON.stringify(mocks.send.mock.calls)).not.toContain(internalNote);
    expect(JSON.stringify(mocks.send.mock.calls)).not.toMatch(/internalNotes|Notas internas/);
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "reminder-1" }, data: { reminderSent: true, actionToken: null } });
  });
  it("does not send a tomorrow reminder for an appointment that is today at its branch", async () => {
    vi.setSystemTime(new Date("2026-07-03T20:00:00Z"));
    const response = await GET(new Request("http://localhost/api/cron/reminders"));
    expect((await response.json()).sent).toBe(1);
    expect(mocks.send).toHaveBeenCalledTimes(1); expect(mocks.send.mock.calls[0][0].to).toBe("client-0@example.invalid");
  });
});
