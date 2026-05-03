import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { RegisterSW } from "@/components/pwa/register-sw";
import { CookieBanner } from "@/components/cookie-banner";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://puragenda.cl";

export const viewport: Viewport = {
  themeColor: "#7C3AED",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.puragenda.cl'),
  title: {
    default: "Puragenda — Sistema de Reservas Online para Negocios | Agenda Inteligente",
    template: "%s | Puragenda",
  },
  description:
    "El sistema de reservas online para hacer crecer tu local. Gestiona citas 24/7, reduce inasistencias y fideliza a tus clientes automáticamente. Pruébalo hoy.",
  keywords: [
    "sistema de reservas online",
    "agenda online",
    "software de citas",
    "agendamiento",
    "reservas online Chile",
    "alternativa AgendaPro",
    "widget de reservas",
    "gestión de citas",
    "peluquería",
    "estética",
    "SaaS",
    "PuroCode",
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
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: SITE_URL,
    siteName: "Puragenda",
    title: "Puragenda — Sistema de Reservas Online para Negocios",
    description:
      "Reservas 24/7, widget marca blanca, multi-profesional y detección de colisiones. La agenda inteligente para tu negocio.",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Puragenda Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Puragenda — Agenda Inteligente para tu Negocio",
    description:
      "Sistema de reservas online con widget embebible. Alternativa moderna a AgendaPro.",
    images: ["/icon-512x512.png"],
  },
  alternates: {
    canonical: SITE_URL,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={plusJakarta.variable} suppressHydrationWarning>
      <body
        className={`${plusJakarta.className} min-h-screen overflow-x-clip bg-background text-foreground antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <RegisterSW />
          {children}
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
