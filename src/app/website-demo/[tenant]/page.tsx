import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fixtureView } from "@/websites/fixtures/views";
import { ritualFixture, ritualTerapiasSecFixture, ritualTerapiasSecRealisticFixture } from "@/websites/fixtures/ritual";
import { resolveTemplate } from "@/websites/registry";
import { pinkFixtureView } from "@/websites/fixtures/pink-y2k";
import { matchdayFixture } from "@/websites/fixtures/matchday";
export const metadata: Metadata = { title: { absolute: "QA local Bella" }, robots: { index: false, follow: false } };
export default async function Demo({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV !== "development" || process.env.WEBSITE_QA !== "1") notFound();
  const { tenant } = await params;
  if (tenant === "ritual-casa" || tenant === "ritual-pulso" || tenant === "ritual-terapias-sec" || tenant === "ritual-terapias-sec-realistic") {
    const Component = await resolveTemplate("ritual", 1).loadComponent();
    const query = await searchParams;
    const count = (key: string, max: number) => { const value = Number(query[key]); return Number.isInteger(value) && value > 0 && value <= max ? value : undefined; };
    const view = tenant === "ritual-terapias-sec-realistic" ? ritualTerapiasSecRealisticFixture() : tenant === "ritual-terapias-sec" ? ritualTerapiasSecFixture(count("services", 25) ?? 12) : ritualFixture(tenant === "ritual-casa" ? "casa" : "pulso");
    const galleryCount = count("gallery", 30), staffCount = count("staff", 10);
    if (galleryCount) { const source = ritualTerapiasSecFixture().config.gallery; view.config.gallery = Array.from({ length: galleryCount }, (_, index) => ({ ...source[index % source.length], name: `Foto QA ${index + 1}`, alt: `Detalle QA ${index + 1}` })); }
    if (staffCount) { const source = view.catalog.staff; view.catalog.staff = Array.from({ length: staffCount }, (_, index) => ({ ...source[index % source.length], id: `qa-staff-${index}`, name: `Profesional QA ${index + 1}` })); }
    if (["earth", "sage", "stone", "ember"].includes(String(query.palette))) view.config.accent = query.palette as typeof view.config.accent;
    return <Component view={view} />;
  }
  if (tenant === "y2k") { const Component = await resolveTemplate("y2k", 1).loadComponent(); return <Component view={pinkFixtureView()} />; }
  if (tenant === "matchday") { const Component = await resolveTemplate("matchday", 1).loadComponent(); return <Component view={matchdayFixture("soccerbarber")} />; }
  if (tenant !== "a" && tenant !== "b") notFound();
  const Component = await resolveTemplate("bella", 1).loadComponent();
  return <Component view={fixtureView(tenant)} />;
}
