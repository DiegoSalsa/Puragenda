import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MARKETPLACE_QUALITY_GATE,
  eligibleMarketplaceListings,
  marketplaceAdminListSummary,
  marketplaceListingStatusLabel,
} from "@/lib/marketplace";

describe("admin marketplace list vs public inventory", () => {
  it("distinguishes marketplace status labels from account status", () => {
    expect(marketplaceListingStatusLabel("PENDING_REVIEW")).toBe("Pendiente");
    expect(marketplaceListingStatusLabel("ACTIVE")).toBe("Activo");
    expect(marketplaceListingStatusLabel("PAUSED")).toBe("Pausado");
    expect(marketplaceListingStatusLabel("EXCLUDED")).toBe("Excluido");
    const summary = marketplaceAdminListSummary([
      {
        published: true,
        authorized: true,
        locality: "Osorno",
        categories: ["Barbería"],
        status: "ACTIVE",
      },
    ]);
    expect(summary.marketplaceLabel).toBe("Activo");
    expect(summary.authorizationLabel).toBe("Autorizado");
  });

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
      marketplaceLabel: "—",
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
        status: "PENDING_REVIEW",
        locationActive: true,
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
      marketplaceLabel: "—",
    });
    expect(after).toEqual({
      categoriesLabel: "Peluquerías",
      localityLabel: "Talcahuano",
      published: false,
      authorized: false,
      authorizationLabel: "No",
      marketplaceLabel: "—",
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
    expect(client).toContain("<th>Marketplace</th>");
    expect(client).toContain("<th>Cuenta</th>");
    expect(client).toContain("<th>Publicado</th>");
    expect(client).not.toContain('className="font-black uppercase underline decoration-2 underline-offset-2"');
  });

  it("superadmin detail exposes the stored answers and authorization audit", () => {
    const editor = readFileSync(
      join(process.cwd(), "src/app/para/x7k9m2v4q8/(panel)/marketplace/[businessId]/marketplace-editor.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(process.cwd(), "src/app/para/x7k9m2v4q8/(panel)/marketplace/[businessId]/page.tsx"),
      "utf8",
    );

    expect(editor).toContain("current.pendingCategoryDescription");
    expect(editor).toContain("current.pendingLocalityName");
    expect(editor).toContain("current.authorizationSource");
    expect(editor).toContain("current.authorizationConfirmedAt");
    expect(editor).toContain("current.authorizationTextVersion");
    expect(editor).toContain("Estado marketplace");
    expect(editor).toContain("Checklist de publicación");
    expect(page).toContain("listing.categories.map");
    expect(page).toContain("listing.localityId");
  });
});
