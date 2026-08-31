import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { RegisterSW } from "@/components/pwa/register-sw";
import { CookieBanner } from "@/components/cookie-banner";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { SITE_URL } from "@/lib/site";
import { DEFAULT_SOCIAL_IMAGE } from "@/lib/seo";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});


export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
};

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sistema de reservas online en Chile | Puragenda",
    template: "%s | Puragenda",
  },
  description:
    "Agenda online para negocios en Chile: recibe reservas 24/7, cobra abonos y gestiona clientes, horarios y profesionales desde un solo lugar.",
  keywords: [
    "sistema de reservas online",
    "agenda online",
    "software de citas",
    "agendamiento",
    "reservas online Chile",
    "agenda de encargos",
    "reservas con abono",
    "cupos de producción",
    "alternativa AgendaPro",
    "widget de reservas",
    "gestión de citas",
    "peluquería",
    "estética",
    "SaaS",
    "Puragenda",
  ],
  authors: [{ name: "PuroCode", url: "https://purocode.com" }],
  creator: "PuroCode",
  publisher: "PuroCode",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Puragenda",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "Puragenda",
    title: "Sistema de reservas online en Chile | Puragenda",
    description:
      "Recibe reservas 24/7, cobra abonos y gestiona clientes, horarios y profesionales desde un solo lugar.",
    images: [
      {
        url: DEFAULT_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: "Puragenda — sistema de reservas online para negocios en Chile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sistema de reservas online en Chile | Puragenda",
    description:
      "Recibe reservas 24/7, cobra abonos y gestiona clientes, horarios y profesionales desde un solo lugar.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t("siteTitle");
  const description = t("siteDescription");
  const openGraphLocale = {
    es: "es_CL", en: "en_US", it: "it_IT", pt: "pt_BR", fr: "fr_FR", de: "de_DE", "zh-CN": "zh_CN",
  }[locale] ?? "es_CL";

  return {
    ...baseMetadata,
    title: { default: title, template: "%s | Puragenda" },
    description,
    openGraph: {
      ...baseMetadata.openGraph,
      locale: openGraphLocale,
      title,
      description,
    },
    twitter: {
      ...baseMetadata.twitter,
      title,
      description,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${plusJakarta.variable} overflow-x-hidden`} suppressHydrationWarning>
      <body
        className={`${plusJakarta.className} min-h-screen overflow-x-hidden bg-background text-foreground antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="puragenda-theme">
            <RegisterSW />
            <AnalyticsProvider />
            {children}
            <CookieBanner />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
