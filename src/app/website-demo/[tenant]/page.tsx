import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fixtureView } from "@/websites/fixtures/views";
import { resolveTemplate } from "@/websites/registry";
export const metadata: Metadata = { title: { absolute: "QA local Bella" }, robots: { index: false, follow: false } };
export default async function Demo({ params }: { params: Promise<{ tenant: string }> }) {
  if (process.env.NODE_ENV !== "development" || process.env.WEBSITE_QA !== "1") notFound();
  const { tenant } = await params;
  if (tenant !== "a" && tenant !== "b") notFound();
  const Component = await resolveTemplate("bella", 1).loadComponent();
  return <Component view={fixtureView(tenant)} />;
}
