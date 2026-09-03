import { AGENCY_NAME, APP_NAME, PRICING } from "@/core/constants";
import { DEFAULT_SOCIAL_IMAGE } from "@/lib/seo";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { SUPPORTED_LOCALES } from "@/i18n/config";

export const ORGANIZATION_ID = `${SITE_URL}#organization`;
export const WEBSITE_ID = `${SITE_URL}#website`;
export const SOFTWARE_ID = `${SITE_URL}#software`;

export const PUBLIC_CONTACT = {
  email: "contacto@purocode.com",
  telephone: "+56949255006",
  purocodeUrl: "https://www.purocode.com",
  purocodeInstagram: "https://www.instagram.com/purocodecl/",
} as const;

const SOFTWARE_DESCRIPTION =
  "Agenda online para negocios en Chile: recibe reservas 24/7, cobra abonos y organiza clientes, horarios y profesionales.";

export type FaqItem = { question: string; answer: string };
export type BreadcrumbItem = { name: string; path: string };

export function jsonLdGraph(nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: APP_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/android-chrome-512x512.png"),
    email: PUBLIC_CONTACT.email,
    telephone: PUBLIC_CONTACT.telephone,
    areaServed: { "@type": "Country", name: "Chile" },
    parentOrganization: {
      "@type": "Organization",
      name: AGENCY_NAME,
      url: PUBLIC_CONTACT.purocodeUrl,
      sameAs: [PUBLIC_CONTACT.purocodeInstagram],
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: PUBLIC_CONTACT.email,
      telephone: PUBLIC_CONTACT.telephone,
      availableLanguage: [...SUPPORTED_LOCALES],
      areaServed: "CL",
    },
  };
}

export function organizationRef() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: APP_NAME,
    url: SITE_URL,
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: APP_NAME,
    url: SITE_URL,
    inLanguage: "es-CL",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function publishedSoftwareOffers() {
  return [
    {
      "@type": "Offer",
      name: `Plan ${PRICING.INDIVIDUAL.name}`,
      price: String(PRICING.INDIVIDUAL.monthly),
      priceCurrency: "CLP",
      url: absoluteUrl("/pricing"),
    },
    {
      "@type": "Offer",
      name: `Plan ${PRICING.EQUIPO.name}`,
      price: String(PRICING.EQUIPO.monthly),
      priceCurrency: "CLP",
      url: absoluteUrl("/pricing"),
    },
  ];
}

export function softwareApplicationNode(description = SOFTWARE_DESCRIPTION) {
  return {
    "@type": "SoftwareApplication",
    "@id": SOFTWARE_ID,
    name: APP_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description,
    offers: publishedSoftwareOffers(),
    publisher: { "@id": ORGANIZATION_ID },
    creator: {
      "@type": "Organization",
      name: AGENCY_NAME,
      url: PUBLIC_CONTACT.purocodeUrl,
    },
  };
}

export function faqPageNode(items: readonly FaqItem[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbListNode(items: readonly BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path.startsWith("http") ? item.path : absoluteUrl(item.path),
    })),
  };
}

export function articleNode({
  headline,
  description,
  url,
  datePublished,
  dateModified,
}: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    "@type": "Article",
    headline,
    description,
    datePublished,
    dateModified,
    inLanguage: "es-CL",
    mainEntityOfPage: url,
    image: DEFAULT_SOCIAL_IMAGE,
    author: organizationRef(),
    publisher: {
      "@id": ORGANIZATION_ID,
      "@type": "Organization",
      name: APP_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/android-chrome-512x512.png"),
      },
    },
  };
}

export function collectionPageNode({
  name,
  url,
  parts,
}: {
  name: string;
  url: string;
  parts: Array<{ headline: string; url: string; dateModified: string }>;
}) {
  return {
    "@type": "CollectionPage",
    name,
    url,
    hasPart: parts.map((part) => ({
      "@type": "Article",
      headline: part.headline,
      url: part.url,
      dateModified: part.dateModified,
    })),
  };
}

export function assertNoInventedReviewFields(value: unknown) {
  const serialized = JSON.stringify(value);
  return {
    hasAggregateRating: serialized.includes("aggregateRating"),
    hasReviewRating: serialized.includes("reviewRating"),
    hasRatingValue: serialized.includes("ratingValue"),
  };
}
