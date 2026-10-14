import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WebsiteLaunchPopup } from "@/components/dashboard/website-launch-popup";
import { WebsiteDiscoveryCard } from "@/components/dashboard/website-discovery-card";
import { WebsiteTrialWelcome } from "@/components/dashboard/website-trial-welcome";
import { websiteDiscoveryStory, websiteDiscoveryProgress } from "@/websites/launch";
import type { WebsiteLaunchContext } from "@/websites/launch";

const activate = vi.hoisted(() => vi.fn());
vi.mock("@/server/actions/website.actions", () => ({ activateWebsiteTrial: activate }));
vi.mock("@/lib/analytics/client", () => ({ track: vi.fn() }));
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement("a", { href }, children) }));
const context: WebsiteLaunchContext = {
  offer: { offerCode: "BETA_FOUNDER" }, addon: null, canManage: true, canActivateTrial: true,
  preview: { businessName: "Soccerbarber", templateName: "Matchday", coverImage: "https://res.cloudinary.com/demo/image/upload/soccerbarber.jpg", address: "soccerbarber.puragenda.cl", ready: true },
};
const popup = (value = context) => renderToStaticMarkup(React.createElement(WebsiteLaunchPopup, { context: value, onDismiss: vi.fn(), onNavigate: vi.fn() }));
const card = (value = context) => renderToStaticMarkup(React.createElement(WebsiteDiscoveryCard, { context: value }));

describe("website discovery invitation", () => {
  it("shows the owner's identity, chosen design, real image and transparent one-time trial terms without activating it", () => {
    const html = popup();
    for (const text of ["Soccerbarber", "Matchday", "soccerbarber.puragenda.cl", context.preview!.coverImage, "Estrenar mi web · 15 días gratis", "Sin tarjeta ni cobro automático", "$5.990 / mes para siempre", "Así te verán tus clientes", "Probar una reserva"]) expect(html).toContain(text);
    expect(activate).not.toHaveBeenCalled();
    expect(html).toContain("Al estrenar tu web, activas tus 15 días");
  });
  it("does not promise free days or founder pricing to a standard business", () => {
    const html = popup({ ...context, offer: null });
    expect(html).not.toContain("Estrenar mi web · 15 días gratis");
    expect(html).not.toContain("Tus 15 días aún no empiezan");
    expect(html).not.toContain("$5.990");
    expect(html).toContain("$9.990 / mes");
  });
  it("keeps paid businesses out of acquisition and guides trials toward publishing rather than starting again", () => {
    expect(card({ ...context, addon: { status: "ACTIVE", validUntil: "2099-01-01" } })).toBe("");
    const now = new Date();
    const trialContext = { ...context, offer: { offerCode: "BETA_FOUNDER", trialStartedAt: now, trialConsumedAt: now, trialEndsAt: new Date(now.getTime() + 15 * 86400000) } };
    expect(card(trialContext)).toContain("Publicar mi web");
    expect(card(trialContext)).not.toContain("15 DÍAS PARA PROBAR TU WEB");
    expect(card({ ...trialContext, preview: { ...context.preview!, published: true } })).toContain("Compartir mi web");
  });
  it("keeps a path back to the invitation after dismissal and avoids saying an unfinished draft is ready", () => {
    expect(card()).toContain("Preparamos tu web. Mira cómo quedó.");
    expect(card()).toContain("Ver mi web");
    const unfinished = { ...context, preview: { ...context.preview!, ready: false } };
    expect(card(unfinished)).not.toContain("Preparamos tu web. Mira cómo quedó.");
    expect(popup(unfinished)).not.toContain("Preparamos tu web con tus fotos");
  });
  it("disables trial activation when acquisitions are paused while preserving preview access", () => {
    const html = popup({ ...context, canActivateTrial: false });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Estrenar mi web · 15 días gratis/);
    expect(html).toContain("Las activaciones están temporalmente pausadas");
    expect(html).toContain("Así te verán tus clientes");
  });
  it("personalizes each prepared design and keeps progress grounded in the actual setup", () => {
    expect(websiteDiscoveryStory(context.preview).headline).toBe("Tu próximo corte empieza aquí.");
    expect(websiteDiscoveryStory({ ...context.preview!, templateName: "Y2K" }).headline).toBe("Tus diseños merecen una web así.");
    expect(websiteDiscoveryStory({ ...context.preview!, templateName: "Ritual" }).headline).toBe("La calma empieza antes de la primera sesión.");
    expect(websiteDiscoveryProgress({ ...context.preview!, servicesReady: false, bookingReady: false }).map(item => item.complete)).toEqual([true, false, false]);
  });
  it("offers a real share link only after publication, and never publishes on its own", () => {
    const props = { businessName: "Soccerbarber", ready: true, publicUrl: "https://soccerbarber.puragenda.cl", trialEndsAt: "2026-10-24T03:00:00Z" };
    const draft = renderToStaticMarkup(React.createElement(WebsiteTrialWelcome, { ...props, published: false }));
    expect(draft).toContain("Publicar cambios");
    expect(draft).not.toContain("Copiar mi enlace");
    const published = renderToStaticMarkup(React.createElement(WebsiteTrialWelcome, { ...props, published: true }));
    expect(published).toContain("Copiar mi enlace");
    expect(published).toContain(props.publicUrl);
    expect(published).toContain("24 de octubre");
    expect(published).toContain("Sin cobro automático");
  });
});
