import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveWebsiteHost, websiteView, canonicalWebsiteUrl } from "@/server/websites/service";
import { normalizeHostname } from "@/websites/policy";
import { resolveTemplate } from "@/websites/registry";
import { bellaConfigSchema } from "@/websites/config";
import { cache } from "react";
export const dynamic = "force-dynamic";
const load = cache(async (hostname: string) => {
  // A direct path cannot expose another host's website or bypass visibility.
  const host = ((await headers()).get("x-puragenda-website-host") ?? (await headers()).get("host")) ?? "";
  if (normalizeHostname(host) !== hostname) notFound();
  const site = await resolveWebsiteHost(hostname); if (!site) notFound(); return site;
});
export async function generateMetadata({ params }: { params: Promise<{ hostname: string }> }): Promise<Metadata> {
  const site = await load((await params).hostname), config = bellaConfigSchema.parse(site.publishedConfig);
  const title = config.seoTitle || config.displayName || site.business.name;
  const description = config.seoDescription || config.intro;
  const url = canonicalWebsiteUrl(site);
  return { title: { absolute: title }, description, metadataBase: new URL(url), alternates: { canonical: url }, robots: { index: true, follow: true }, keywords: null, authors: [{ name: site.business.name }], creator: site.business.name, publisher: site.business.name, manifest: null, appleWebApp: null, openGraph: { title, description, url, siteName: site.business.name, images: config.socialImage || config.heroImage ? [{ url: config.socialImage || config.heroImage }] : [] }, twitter: { card: "summary_large_image", title, description, images: config.socialImage || config.heroImage ? [config.socialImage || config.heroImage] : [] }, icons: { icon: config.favicon ? [config.favicon] : [], apple: [] } };
}
export default async function Website({ params }: { params: Promise<{ hostname: string }> }) {
  const site = await load((await params).hostname);
  const Component = await resolveTemplate(site.templateKey, site.templateVersion).loadComponent();
  return <Component view={await websiteView(site, false)} />;
}
