import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fixtureView } from "@/websites/fixtures/views";
import { ritualFixture, ritualTerapiasSecFixture } from "@/websites/fixtures/ritual";
import { resolveTemplate } from "@/websites/registry";
export const metadata: Metadata = { title: { absolute: "QA local Bella" }, robots: { index: false, follow: false } };
export default async function Demo({ params }: { params: Promise<{ tenant: string }> }) {
  if (process.env.NODE_ENV !== "development" || process.env.WEBSITE_QA !== "1") notFound();
  const { tenant } = await params;
  if (tenant === "ritual-casa" || tenant === "ritual-pulso" || tenant === "ritual-terapias-sec") {
    const Component = await resolveTemplate("ritual", 1).loadComponent();
    return <Component view={tenant === "ritual-terapias-sec" ? ritualTerapiasSecFixture(12) : ritualFixture(tenant === "ritual-casa" ? "casa" : "pulso")} />;
  }
  if (tenant !== "a" && tenant !== "b") notFound();
  const Component = await resolveTemplate("bella", 1).loadComponent();
  return <Component view={fixtureView(tenant)} />;
}
