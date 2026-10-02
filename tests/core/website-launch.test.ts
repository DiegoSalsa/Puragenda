import { describe, expect, it } from "vitest";
import { websiteLaunchMessage } from "@/websites/launch";
import { websiteSupportReasons } from "@/websites/diagnostics";
import { WEBSITE_TRIAL_MS } from "@/websites/offers";
const now = new Date("2026-10-02T12:00:00Z");
const founder = { offerCode: "BETA_FOUNDER" };
describe("Website launch segmentation", () => {
  it("available founder receives exclusive one-time trial offer", () => {
    expect(websiteLaunchMessage(founder, null, now)).toMatchObject({ showFounderOffer: true, cta: "PROBAR MI WEB GRATIS", price: "$5.990 / mes para siempre" });
  });
  it("trialing founder sees edit without a second acquisition offer", () => {
    expect(websiteLaunchMessage({ ...founder, trialConsumedAt: now, trialStartedAt: now, trialEndsAt: new Date(now.getTime() + WEBSITE_TRIAL_MS) }, null, now)).toMatchObject({ showFounderOffer: false, cta: "Editar mi web" });
  });
  it("expired founder retains price and cannot see another trial", () => {
    expect(websiteLaunchMessage({ ...founder, trialConsumedAt: new Date("2026-09-01"), trialStartedAt: new Date("2026-09-01"), trialEndsAt: new Date("2026-09-16") }, null, now)).toMatchObject({ showFounderOffer: false, cta: "Activar por $5.990" });
  });
  it("paid founder sees edit and no acquisition offer", () => {
    expect(websiteLaunchMessage(founder, { status: "ACTIVE", validUntil: "2026-11-01" }, now)).toMatchObject({ showFounderOffer: false, cta: "Editar mi web" });
  });
  it("standard cannot see founder price", () => {
    expect(websiteLaunchMessage(null, null, now)).toMatchObject({ founder: false, showFounderOffer: false, cta: "Crear mi sitio web", price: "$9.990 / mes" });
  });
  it("reports operational, commercial, publication and domain causes independently", () => {
    expect(websiteSupportReasons(null, { status: "PAST_DUE" }, null, { status: "INACTIVE" }, [{ status: "PENDING" }, { status: "FAILED" }], now)).toEqual(["BASE_INACTIVE", "WEBSITE_PAST_DUE", "NOT_PUBLISHED", "DOMAIN_PENDING", "DOMAIN_MISCONFIGURED"]);
  });
});
