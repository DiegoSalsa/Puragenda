import type { Metadata } from "next";
import { requireWebsiteManager, ensureWebsite, websiteView } from "@/server/websites/service";
import { resolveTemplate } from "@/websites/registry";
import { fixtureView } from "@/websites/fixtures/views";
import { notFound } from "next/navigation";
export const metadata: Metadata = { title: { absolute: "Vista previa · Sitio Web" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Preview({ searchParams }: { searchParams: Promise<{ mode?: string; viewport?: string }> }) {
  const manager = await requireWebsiteManager().catch(() => null);
  if (!manager) notFound();
  const { business } = manager;
  const site = await ensureWebsite(business.id, business.slug);
  const params = await searchParams;
  if (params.viewport === "mobile") return <main id="studio-root" style={{ minHeight: "100dvh", padding: 16, background: "#eee", display: "grid", justifyItems: "center", gap: 12 }}><p>Vista previa móvil · 390 px</p><iframe title="Bella · preview móvil" src={`/website-preview${params.mode === "demo" ? "?mode=demo" : ""}`} style={{ width: 390, maxWidth: "100%", height: 844, border: 0, borderRadius: 24, background: "white" }} /></main>;
  const view = params.mode === "demo" ? fixtureView("a") : await websiteView(site, true);
  const Component = await resolveTemplate(site.templateKey, site.templateVersion).loadComponent();
  return <Component view={view} />;
}
