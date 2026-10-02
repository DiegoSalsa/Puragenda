import type { Metadata } from "next";
import { requireWebsiteManager, ensureWebsite, websiteView } from "@/server/websites/service";
import { templateSwitchDraft } from "@/websites/template-snapshots";
import { resolveTemplate } from "@/websites/registry";
import { fixtureView } from "@/websites/fixtures/views";
import { notFound } from "next/navigation";
export const metadata: Metadata = { title: { absolute: "Vista previa · Sitio Web" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Preview({ searchParams }: { searchParams: Promise<{ mode?: string; viewport?: string; template?: string }> }) {
  const manager = await requireWebsiteManager().catch(() => null);
  if (!manager) notFound();
  const { business } = manager;
  const site = await ensureWebsite(business.id, business.slug);
  const params = await searchParams;
  const target = params.template ? resolveTemplate(params.template, 1) : resolveTemplate(site.templateKey, site.templateVersion);
  const previewSite = { ...site, templateKey: target.key, templateVersion: target.version, draftConfig: templateSwitchDraft(site, target.key, target.version).config };
  if (params.viewport === "mobile") return <main id="studio-root" style={{ minHeight: "100dvh", padding: 16, background: "#eee", display: "grid", justifyItems: "center", gap: 12 }}><p>Vista previa móvil · 390 px</p><iframe title={`${target.name} · preview móvil`} src={`/website-preview?template=${target.key}`} style={{ width: 390, maxWidth: "100%", height: 844, border: 0, borderRadius: 24, background: "white" }} /></main>;
  const view = params.mode === "demo" && target.key === "bella" ? fixtureView("a") : await websiteView(previewSite, true);
  const Component = await target.loadComponent();
  return <Component view={view} />;
}
