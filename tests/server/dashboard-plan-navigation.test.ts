import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const m = vi.hoisted(() => ({ path: "/dashboard/settings" }));
vi.mock("next/navigation", () => ({ usePathname: () => m.path }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/dashboard/logout-button", () => ({ LogoutButton: () => null }));
vi.mock("@/components/dashboard/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/language-switcher", () => ({ LanguageSwitcher: () => null }));
vi.mock("@/components/pwa/install-button", () => ({ InstallPWAButton: () => null }));
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { UpgradeButton } from "@/components/dashboard/upgrade-button";

describe("customer plan navigation", () => {
  it("shows the Plus upgrade for a normal owner even without an active navigation section", () => {
    m.path = "/dashboard";
    const html = renderToStaticMarkup(createElement(DashboardSidebar, { userName: "Synthetic owner", userRole: "ADMIN", upgradeToPlus: true }));
    expect(html).toContain("Sube a Puragenda+");
    expect(html).toContain('href="/dashboard/settings#plan"');
  });
  it.each([false, true])("website navigation follows its server entitlement (%s), including a legacy add-on", enabled => {
    m.path = "/dashboard/website";
    const html = renderToStaticMarkup(createElement(DashboardSidebar, { userName: "Synthetic owner", websiteEnabled: enabled }));
    expect(html.includes('href="/dashboard/website"')).toBe(enabled);
  });
  it.each([false, true])("marketing navigation follows Plus access (%s)", enabled => {
    m.path = "/dashboard/marketing";
    const html = renderToStaticMarkup(createElement(DashboardSidebar, { userName: "Synthetic owner", marketingEnabled: enabled }));
    expect(html.includes('href="/dashboard/marketing"')).toBe(enabled);
  });
  it("opens the authenticated Plus checkout instead of the public landing", () => {
    const html = renderToStaticMarkup(createElement(UpgradeButton));
    expect(html).toContain("Pasar a Puragenda+");
    expect(html).toContain('href="/dashboard/settings/upgrade"');
    expect(html).not.toContain('href="/puragenda-plus"');
    expect(html).not.toContain("Equipo");
  });
});
