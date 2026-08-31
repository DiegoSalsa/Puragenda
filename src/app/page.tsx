import { ThemeNeoBrutalism } from "@/components/landing/ThemeNeoBrutalism";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { absoluteUrl } from "@/lib/site";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { createPageMetadata, serializeJsonLd } from "@/lib/seo";
import { customerTestimonials } from "@/lib/data/testimonials";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = locale === "es" ? "Sistema de reservas online en Chile | Puragenda" : t("homeTitle");
  const description = locale === "es"
    ? "Agenda online para negocios en Chile: recibe reservas 24/7, cobra abonos y organiza clientes, horarios y profesionales. Prueba 30 días gratis."
    : t("homeDescription");
  return {
    ...createPageMetadata({ title, description, path: "/" }),
    title: { absolute: title },
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  const metadataT = await getTranslations({ locale, namespace: "metadata" });
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  // SEO: JSON-LD Structured Data
  const jsonLdSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Puragenda",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description: metadataT("homeDescription"),
    offers: [
      {
        "@type": "Offer",
        name: "Plan Individual",
        price: "12990",
        priceCurrency: "CLP",
        priceValidUntil: "2027-12-31",
        description: "Para un profesional, con reservas ilimitadas.",
        availability: "https://schema.org/InStock",
        url: absoluteUrl("/pricing"),
      },
      {
        "@type": "Offer",
        name: "Plan Equipo",
        price: "29990",
        priceCurrency: "CLP",
        priceValidUntil: "2027-12-31",
        description: "Para equipos, con hasta cinco profesionales incluidos y roles de acceso.",
        availability: "https://schema.org/InStock",
        url: absoluteUrl("/pricing"),
      },
    ],
    creator: {
      "@type": "Organization",
      name: "PuroCode",
      url: "https://purocode.com",
    },
    review: customerTestimonials.map((testimonial) => ({
      "@type": "Review",
      reviewBody: testimonial.quote,
      inLanguage: "es-CL",
      author: testimonial.authorType === "Person"
        ? {
            "@type": "Person",
            name: testimonial.author,
            affiliation: { "@type": "Organization", name: testimonial.business },
          }
        : { "@type": "Organization", name: testimonial.author },
    })),
  };

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${absoluteUrl("/")}#organization`,
    name: "Puragenda",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/android-chrome-512x512.png"),
    description: metadataT("siteDescription"),
    email: "contacto@purocode.com",
    telephone: "+56949255006",
    areaServed: {
      "@type": "Country",
      name: "Chile",
    },
    parentOrganization: {
      "@type": "Organization",
      name: "PuroCode",
      url: "https://purocode.com",
      sameAs: ["https://www.instagram.com/purocodecl/"],
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "contacto@purocode.com",
      telephone: "+56949255006",
      availableLanguage: [...SUPPORTED_LOCALES],
      areaServed: "CL",
    },
  };

  const jsonLdWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: "Puragenda",
    url: absoluteUrl("/"),
    inLanguage: locale,
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdOrg) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdWebsite) }} />
      <ThemeNeoBrutalism user={user} business={business} />
    </>
  );
}
