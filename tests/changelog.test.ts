import { describe, expect, it } from "vitest";
import { CHANGELOG_DATA, LATEST_CHANGELOG_VERSION } from "@/config/changelog";

describe("changelog entries", () => {
  it("publishes Puragenda Next with its new release announcement", () => {
    const latest = CHANGELOG_DATA[0];
    expect(LATEST_CHANGELOG_VERSION).toBe("v3.0.0");
    expect(latest).toMatchObject({date:"2026-11-05",popupVariant:"standard",title:"Llegó Puragenda Next"});
    expect(latest.popupFeatureTitles).toHaveLength(3);
    expect(latest.notice).toContain("no aumenta el precio");
  });
  it("preserves the historical Website launch", () => {
    const latest = CHANGELOG_DATA.find(entry => entry.version === "v2.2.1")!;
    expect(latest.features.join(" ")).toContain("preconfigurada");
    expect(latest.features.join(" ")).not.toMatch(/Bella|Matchday|Ritual/);
    expect(latest.description).not.toContain("$5.990");
    expect(latest).toMatchObject({ popupVariant: "launch", spotlights: expect.any(Array) });
    expect(latest.spotlights?.map(spotlight => spotlight.preview)).toEqual(["website_recommended"]);
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
