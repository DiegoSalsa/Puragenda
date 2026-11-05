import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn(), location: vi.fn() }));
vi.mock("@/server/email/resend", () => ({ resend: { emails: { send: mocks.send } }, EMAIL_FROM: "fixture@example.invalid" }));
vi.mock("@/server/db/prisma", () => ({ prisma: { businessLocation: { findFirst: mocks.location }, business: { findUnique: vi.fn(async () => null) }, clientPortalAccount: { findUnique: vi.fn(async () => null) } } }));
vi.mock("@/server/services/client-portal.service", () => ({ getClientPortalAppUrl: () => "https://example.invalid", issueClientPortalEmailToken: vi.fn(async () => ({ token: "synthetic-token" })) }));

import { sendBookingNotifications, sendConfirmationEmail, sendCancellationEmail, sendDepositConfirmedNotifications } from "@/server/email/send";

const branches = [
  { id: "center", timezone: "America/Santiago", address: "Sucursal Centro 100", mapsUrl: "https://maps.example.invalid/center", time: "00:30", date: "4 de julio de 2026" },
  { id: "island", timezone: "Pacific/Easter", address: "Sucursal Isla 200", mapsUrl: "https://maps.example.invalid/island", time: "22:30", date: "3 de julio de 2026" },
];
const internalNote = "SYNTHETIC_INTERNAL_NOTE_MUST_STAY_IN_PURAGENDA";
function appointment(locationId: string | null) {
  return { id: "venue-appointment", businessId: "venue-business", locationId, customerName: "Venue Fixture", customerEmail: "client@example.invalid", startTime: new Date("2026-07-04T04:30:00Z"), endTime: new Date("2026-07-04T05:00:00Z"),
    internalNotes: internalNote, staff: { name: "Fixture Staff", email: "staff@example.invalid" },
    service: { name: "Consulta" }, business: { name: "Venue Business", timezone: "America/Santiago", locale: "es", address: "Dirección general 999", mapsUrl: "https://maps.example.invalid/general", owner: { name: "Fixture Owner", email: "owner@example.invalid" } } };
}
describe("appointment notifications use the booked branch", () => {
  beforeEach(() => { mocks.send.mockResolvedValue({ data: { id: "synthetic-mail" }, error: null }); mocks.location.mockImplementation(async ({ where }: { where: { id: string; businessId: string } }) => where.businessId === "venue-business" ? branches.find(b => b.id === where.id) ?? null : null); });
  for (const [name, send] of Object.entries({ booking: sendBookingNotifications, confirmation: sendConfirmationEmail, cancellation: sendCancellationEmail, deposit: sendDepositConfirmedNotifications })) {
    it.each(branches)(`${name} renders the local date, time and address in $timezone`, async branch => {
      await send(appointment(branch.id));
      const message = mocks.send.mock.calls.at(-1)![0];
      expect(message.html).toContain(branch.time); expect(message.html).toContain(branch.date);
      expect(message.html).toContain(branch.address); expect(message.html).toContain(branch.mapsUrl);
      expect(message.html).not.toContain("Dirección general 999");
      // Inspect every recipient and calendar link, including owner/staff mail.
      expect(JSON.stringify(mocks.send.mock.calls)).not.toContain(internalNote);
      expect(JSON.stringify(mocks.send.mock.calls)).not.toMatch(/internalNotes|Notas internas/);
      expect(mocks.location).toHaveBeenCalledWith(expect.objectContaining({ where: { id: branch.id, businessId: "venue-business" } }));
    });
  }
  it("keeps the business timezone/address for legacy appointments without a branch", async () => {
    const legacy = appointment(null); legacy.business.timezone = "Europe/Paris";
    await sendConfirmationEmail(legacy);
    const html = mocks.send.mock.calls.at(-1)![0].html;
    expect(html).toContain("06:30"); expect(html).toContain(legacy.business.address);
    expect(mocks.location).not.toHaveBeenCalled();
  });
  it("does not borrow another tenant's branch", async () => {
    await sendConfirmationEmail({ ...appointment("island"), businessId: "another-business" });
    expect(mocks.send.mock.calls.at(-1)![0].html).not.toContain("Sucursal Isla 200");
  });
  it("does not substitute the head office when the booked branch has no address", async () => {
    mocks.location.mockResolvedValue({ timezone: "Pacific/Easter", address: null, mapsUrl: null });
    await sendConfirmationEmail(appointment("island"));
    expect(mocks.send.mock.calls.at(-1)![0].html).not.toContain("Dirección general 999");
  });
});
