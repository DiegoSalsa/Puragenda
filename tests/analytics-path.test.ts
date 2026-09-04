import { describe, expect, it } from "vitest";
import { normalizeTrackingPath } from "@/lib/analytics/path";

describe("normalizeTrackingPath", () => {
  it.each([
    ["/cita/secret-appointment-id", "/cita/[appointment]"],
    ["/s/private-token", "/s/[token]"],
    ["/widget/my-business", "/widget/[slug]"],
    ["/mi-agenda/entrar/magic-token", "/mi-agenda/[action]/[token]"],
    ["/para/x7k9m2v4q8/tracking", "/para/[industry]"],
    ["/dashboard/clients/abc", "/dashboard/[section]"],
    ["/unknown/token/another", "/unknown/[other]"],
  ])("does not retain identifiers from %s", (path, expected) => {
    expect(normalizeTrackingPath(path)).toBe(expected);
  });

  it("keeps allowlisted public paths", () => {
    expect(normalizeTrackingPath("/pricing?plan=secret")).toBe("/pricing");
    expect(normalizeTrackingPath("/sistema-de-agendamiento-online")).toBe("/sistema-de-agendamiento-online");
    expect(normalizeTrackingPath("/software-agenda-barberias")).toBe("/software-agenda-barberias");
    expect(normalizeTrackingPath("/software-agenda-peluquerias")).toBe("/software-agenda-peluquerias");
  });
});
