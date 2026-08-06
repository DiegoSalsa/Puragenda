import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SUPPORTED_LOCALES, type AppLocale } from "../../src/i18n/config";
import { localizeEmailTemplate } from "../../src/server/email/localization";
import { confirmedBookingClientEmail, withClientPortalAccess } from "../../src/server/email/templates";

function loadCatalog(locale: AppLocale): Record<string, string> {
  return JSON.parse(readFileSync(resolve(process.cwd(), "messages", "email", `${locale}.json`), "utf8"));
}

describe("localized transactional emails", () => {
  it("keeps every email catalog complete and non-empty", () => {
    const sourceKeys = Object.keys(loadCatalog("es")).sort();
    expect(sourceKeys.length).toBeGreaterThan(120);
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = loadCatalog(locale);
      expect(Object.keys(catalog).sort(), locale).toEqual(sourceKeys);
      expect(Object.values(catalog).every((value) => value.trim().length > 0), locale).toBe(true);
    }
  });

  it("translates subject, body, portal block and date without touching business data", () => {
    const template = withClientPortalAccess(confirmedBookingClientEmail({
      locale: "en",
      customerName: "Jane Customer",
      customerEmail: "jane@example.com",
      serviceName: "Custom Service Name",
      staffName: "Alex Staff",
      startTime: new Date("2026-08-06T14:00:00.000Z"),
      endTime: new Date("2026-08-06T15:00:00.000Z"),
      businessName: "Acme Studio",
      timezone: "UTC",
    }), "https://example.com/private-token");
    const localized = localizeEmailTemplate(template, "en-US");

    expect(localized.subject).toContain("Reservation confirmed");
    expect(localized.html).toContain('<html lang="en">');
    expect(localized.html).toContain("Thursday");
    expect(localized.html).toContain("Everything in one place");
    expect(localized.html).toContain("Acme Studio");
    expect(localized.html).toContain("Jane Customer");
    expect(localized.html).toContain("https://example.com/private-token");
    expect(localized.html).not.toContain("Fecha");
  });

  it.each(SUPPORTED_LOCALES)("sets the HTML language for %s", (locale) => {
    const localized = localizeEmailTemplate({
      subject: "Cita confirmada",
      html: '<html lang="es"><body>Cita confirmada</body></html>',
    }, locale);
    expect(localized.html).toContain(`<html lang="${locale}">`);
  });
});
