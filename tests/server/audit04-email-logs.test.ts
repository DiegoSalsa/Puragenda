import { afterEach, describe, expect, it, vi } from "vitest";
const send = vi.hoisted(() => vi.fn(async () => ({ data: { id: "synthetic" }, error: null })));
vi.mock("@/server/email/resend", () => ({ resend: { emails: { send } }, EMAIL_FROM: "Synthetic <sender@synthetic.invalid>" }));
vi.mock("@/server/db/prisma", () => ({ prisma: { business: { findFirst: async () => ({ locale: "es" }) } } }));
import { sendRecurringBookingCancelledClient } from "@/server/email/send";
describe("audit 04 email logs privacy", () => {
  afterEach(() => vi.restoreAllMocks());
  it.each([false, true])("does not log recipient or provider payload (failure: %s)", async fail => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {}), error = vi.spyOn(console, "error").mockImplementation(() => {});
    if (fail) send.mockRejectedValueOnce(new Error("PRIVATE_SYNTHETIC_HEALTH token=PRIVATE_SYNTHETIC_TOKEN"));
    await sendRecurringBookingCancelledClient({ customerEmail: "private@synthetic.invalid", customerName: "PRIVATE_SYNTHETIC_NAME", businessName: "Synthetic", serviceName: "Synthetic" });
    expect(JSON.stringify([...log.mock.calls, ...error.mock.calls], (_, value) => value instanceof Error ? value.message : value)).not.toMatch(/private@synthetic.invalid|PRIVATE_SYNTHETIC/);
  });
});
