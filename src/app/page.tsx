import { ThemeNeoBrutalism } from "@/components/landing/ThemeNeoBrutalism";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Puragenda - Reservas online para tu negocio",
  description: "Recibe reservas sin tocar el WhatsApp, cobra abonos online y lleva el control de tu negocio desde un solo lugar. Gratis 30 días, sin contrato.",
};

export default async function HomePage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  // SEO: JSON-LD Structured Data
  const jsonLdSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Puragenda",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.puragenda.cl",
    description:
      "Sistema de agendamiento online para peluquerías, estética, consultas y servicios. Reservas 24/7, widget marca blanca y multi-profesional.",
    offers: [
      {
        "@type": "Offer",
        name: "Plan Base",
        price: "12990",
        priceCurrency: "CLP",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Plan Pro",
        price: "29990",
        priceCurrency: "CLP",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "127",
    },
    creator: {
      "@type": "Organization",
      name: "PuroCode",
      url: "https://purocode.com",
    },
  };

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Puragenda",
    url: "https://www.puragenda.cl",
    logo: "https://www.puragenda.cl/icon-512x512.png",
    description: "Plataforma SaaS de agendamiento online para negocios de servicios en Latinoamérica.",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["Spanish"],
    },
  };

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
      <ThemeNeoBrutalism user={user} business={business} />
    </>
  );
}