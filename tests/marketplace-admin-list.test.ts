import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MARKETPLACE_QUALITY_GATE,
  eligibleMarketplaceListings,
  marketplaceAdminListSummary,
} from "@/lib/marketplace";

describe("admin marketplace list vs public inventory", () => {
  it("shows curated category and locality when the listing is not published", () => {
    const summary = marketplaceAdminListSummary([
      {
        published: false,
        authorized: false,
        locality: "Concepción",
        categories: ["Barberías"],
      },
    ]);

    expect(summary).toEqual({
      categoriesLabel: "Barberías",
      localityLabel: "Concepción",
      published: false,
      authorized: false,
      authorizationLabel: "No",
    });
  });

  it("keeps unpublished classification out of the public inventory", () => {
    const publicRows = eligibleMarketplaceListings([
      {
        slug: "soccerbarber",
        name: "Soccerbarber",
        logoUrl: null,
        categorySlug: "barberias",
        citySlug: "concepcion",
        serviceNames: ["Corte"],
        deleted: false,
        directoryPublished: false,
        demo: false,
        subscriptionActive: true,
        plan: "INDIVIDUAL",
        hasBookableService: true,
      },
    ]);
    expect(publicRows).toEqual([]);
  });

  it("updates the admin list fields after a curated save", () => {
    const before = marketplaceAdminListSummary([]);
    const after = marketplaceAdminListSummary([
      {
        published: false,
        authorized: false,
        locality: "Talcahuano",
        categories: ["Peluquerías"],
      },
    ]);

    expect(before).toEqual({
      categoriesLabel: "—",
      localityLabel: "—",
      published: false,
      authorized: false,
      authorizationLabel: "No",
    });
    expect(after).toEqual({
      categoriesLabel: "Peluquerías",
      localityLabel: "Talcahuano",
      published: false,
      authorized: false,
      authorizationLabel: "No",
    });
  });

  it("keeps indexing disabled", () => {
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
  });

  it("admin list uses curated listings instead of the public published projection", () => {
    const client = readFileSync(
      join(process.cwd(), "src/app/para/x7k9m2v4q8/(panel)/marketplace/marketplace-client.tsx"),
      "utf8",
    );
    const rows = readFileSync(
      join(process.cwd(), "src/server/services/marketplace-admin.service.ts"),
      "utf8",
    );
    expect(client).toContain("marketplaceAdminListSummary(business.listings)");
    expect(client).not.toContain("listings.filter((listing) => listing.published)");
    expect(rows).toContain("export async function listMarketplaceAdminRows");
    expect(rows).not.toMatch(/marketplaceListings:\s*\{\s*where:\s*\{\s*publishedAt/);
  });

  it("admin exposes prompt decision separately from publication", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/para/x7k9m2v4q8/(panel)/marketplace/page.tsx"),
      "utf8",
    );
    const client = readFileSync(
      join(process.cwd(), "src/app/para/x7k9m2v4q8/(panel)/marketplace/marketplace-client.tsx"),
      "utf8",
    );
    const rows = readFileSync(
      join(process.cwd(), "src/server/services/marketplace-admin.service.ts"),
      "utf8",
    );

    expect(rows).toContain("marketplacePromptDismissedAt: true");
    expect(page).toContain("marketplaceConsentState({");
    expect(client).toContain("marketplaceConsentStateLabel(business.consentState)");
    expect(client).toContain("<th>Publicado</th>");
  });
});
