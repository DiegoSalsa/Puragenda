import type { Metadata } from "next";
import { createPageMetadata } from "./seo";
import { articleNode, breadcrumbListNode, faqPageNode, jsonLdGraph } from "./json-ld";
import { absoluteUrl } from "./site";

type PageInput = Parameters<typeof createPageMetadata>[0];

export function expansionMetadata(input: PageInput): Metadata {
  const bareTitle = input.title.replace(/ \| Puragenda$/, "");
  const brandedTitle = bareTitle + " | Puragenda";
  const metadata = createPageMetadata({ ...input, title: bareTitle });
  return {
    ...metadata,
    title: { absolute: brandedTitle },
    openGraph: { ...metadata.openGraph, title: brandedTitle },
    twitter: { ...metadata.twitter, title: brandedTitle },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export function expansionSchema(input: {
  path: string; title: string; description: string; date: string;
  faq: { question: string; answer: string }[];
  parent: { name: string; path: string };
  article?: boolean;
}) {
  return jsonLdGraph([
    input.article ? articleNode({
      headline: input.title, description: input.description, url: absoluteUrl(input.path),
      datePublished: input.date, dateModified: input.date,
    }) : {
      "@type": "WebPage", "@id": absoluteUrl(input.path) + "#webpage",
      url: absoluteUrl(input.path), name: input.title, description: input.description,
      inLanguage: "es-CL",
    },
    faqPageNode(input.faq),
    breadcrumbListNode([
      { name: "Inicio", path: "/" },
      input.parent,
      { name: input.title, path: input.path },
    ]),
  ]);
}
