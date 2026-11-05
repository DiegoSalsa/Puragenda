import { describe, expect, it } from "vitest";
import { recurringBookingPendingApprovalBusinessEmail, recurringBookingRejectedClientEmail } from "@/server/email/templates";
describe("audit 04 email HTML", () => {
  const attack = '<a href="https://synthetic.invalid">á & " \' 漢字</a>';
  it("04-06 escapes health questions, answers, comments and customer identity", () => {
    const { html } = recurringBookingPendingApprovalBusinessEmail({ ownerEmail: "owner@synthetic.invalid", ownerName: "Synthetic", customerName: attack, customerEmail: attack, customerAddress: attack, serviceName: attack, businessName: attack, selectedDays: [1], selectedTimes: { "1": "10:00" }, startDate: new Date("2026-01-01"), endDate: new Date("2026-02-01"), durationMonths: 1, healthAnswers: { [attack]: attack }, healthFreeText: attack.repeat(100) });
    expect(html).not.toContain(attack);
    expect(html).toContain("&lt;a href=&quot;https://synthetic.invalid&quot;&gt;á &amp;");
  });
  it("04-06 escapes rejection reasons in nearby templates", () => {
    expect(recurringBookingRejectedClientEmail({ customerEmail: "c@synthetic.invalid", customerName: attack, serviceName: attack, businessName: attack, reason: attack }).html).not.toContain(attack);
  });
});
