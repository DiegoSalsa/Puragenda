import { describe, expect, it } from "vitest";
import { CHANGELOG_DATA, LATEST_CHANGELOG_VERSION } from "@/config/changelog";

describe("changelog entries", () => {
  it("publishes Puri and Hoy as the latest update", () => {
    const latest = CHANGELOG_DATA[0];
    expect(LATEST_CHANGELOG_VERSION).toBe("v2.1.0");
    expect(latest).toMatchObject({ version: "v2.1.0", date: "2026-09-26" });
    expect(latest.popupVariant).toBeUndefined();
    expect(latest.features[0]).toContain("Puri");
  });

  it("publishes Puragenda 2.0 as a launch entry", () => {
    const launch = CHANGELOG_DATA[1];
    expect(launch).toMatchObject({ version: "v2.0.0", date: "2026-09-09", popupVariant: "launch" });
    expect(launch.spotlights).toHaveLength(2);
    expect(launch.spotlights?.map((spotlight) => spotlight.href)).toEqual(["/dashboard/gift-cards", "/dashboard/loyalty"]);
  });

  it("keeps historical entries on the standard popup by default", () => {
    expect(CHANGELOG_DATA[2].popupVariant).toBeUndefined();
  });
});
