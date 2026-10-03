import { createPageMetadata } from "./seo";
import { articleNode, breadcrumbListNode, faqPageNode, jsonLdGraph } from "./json-ld";
import { absoluteUrl } from "./site";

type PageInput = Parameters<typeof createPageMetadata>[0];

export function expansionMetadata(input: PageInput) {
  const title = input.title.endsWith(" | Puragenda") ? input.title : input.title + " | Puragenda";
  return {
    ...createPageMetadata({ ...input, title }),
    title: { absolute: title },
    robots: { index: true, follow: true },
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
