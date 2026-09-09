import { describe, expect, it } from "vitest";
import { CHANGELOG_DATA, LATEST_CHANGELOG_VERSION } from "@/config/changelog";

describe("changelog launch metadata", () => {
  it("publishes Puragenda 2.0 as a launch entry", () => {
    const latest = CHANGELOG_DATA[0];
    expect(LATEST_CHANGELOG_VERSION).toBe("v2.0.0");
    expect(latest).toMatchObject({ version: "v2.0.0", date: "2026-09-09", popupVariant: "launch" });
    expect(latest.spotlights).toHaveLength(2);
    expect(latest.spotlights?.map((spotlight) => spotlight.href)).toEqual(["/dashboard/gift-cards", "/dashboard/loyalty"]);
  });

  it("keeps historical entries on the standard popup by default", () => {
    expect(CHANGELOG_DATA[1].popupVariant).toBeUndefined();
  });
});
