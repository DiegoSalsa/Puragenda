import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const DEFAULT_SOCIAL_IMAGE = absoluteUrl("/opengraph-image");

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  keywords?: string[];
  publishedTime?: string;
  modifiedTime?: string;
};

export function createPageMetadata({
  title,
  description,
  path,
  type = "website",
  keywords,
  publishedTime,
  modifiedTime,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const socialImage = {
    url: DEFAULT_SOCIAL_IMAGE,
    width: 1200,
    height: 630,
    alt: `${title} — Puragenda`,
  };

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Puragenda",
      locale: "es_CL",
      type,
      images: [socialImage],
      ...(type === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
