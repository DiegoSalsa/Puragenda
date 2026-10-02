import { describe, expect, it } from "vitest";
import { CHANGELOG_DATA, LATEST_CHANGELOG_VERSION } from "@/config/changelog";

describe("changelog entries", () => {
  it("prepares Website launch as the latest update", () => {
    const latest = CHANGELOG_DATA[0];
    expect(LATEST_CHANGELOG_VERSION).toBe("v2.2.0");
    expect(latest.features.join(" ")).toContain("Bella");
    expect(latest.features.join(" ")).toContain("Matchday");
    expect(latest.features.join(" ")).toContain("Ritual");
    expect(latest.description).not.toContain("$5.990");
    expect(latest).toMatchObject({ popupVariant: "launch", spotlights: expect.any(Array) });
    expect(latest.spotlights?.map(spotlight => spotlight.preview)).toEqual(["website_bella", "website_matchday", "website_ritual"]);
  });
  it("preserves Puri and Hoy in history", () => {
    const latest = CHANGELOG_DATA.find(entry => entry.version === "v2.1.0")!;
    expect(latest).toMatchObject({ version: "v2.1.0", date: "2026-09-26" });
    expect(latest.popupVariant).toBeUndefined();
    expect(latest.features[0]).toContain("Puri");
  });

  it("publishes Puragenda 2.0 as a launch entry", () => {
    const launch = CHANGELOG_DATA.find(entry => entry.version === "v2.0.0")!;
    expect(launch).toMatchObject({ version: "v2.0.0", date: "2026-09-09", popupVariant: "launch" });
    expect(launch.spotlights).toHaveLength(2);
    expect(launch.spotlights?.map((spotlight) => spotlight.href)).toEqual(["/dashboard/gift-cards", "/dashboard/loyalty"]);
  });

  it("keeps historical entries on the standard popup by default", () => {
    expect(CHANGELOG_DATA.find(entry => entry.version === "v1.9.0")!.popupVariant).toBeUndefined();
  });
});
