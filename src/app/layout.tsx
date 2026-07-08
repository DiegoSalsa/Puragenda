import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { RegisterSW } from "@/components/pwa/register-sw";
import { CookieBanner } from "@/components/cookie-banner";
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
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.puragenda.cl"),
  title: {
    default: "Puragenda — Sistema de Reservas Online para Negocios | Agenda Inteligente",
    template: "%s | Puragenda",
  },
  description:
    "Sistema de reservas online para hacer crecer tu local. Gestiona citas 24/7, reduce inasistencias y fideliza clientes. ¡Pruébalo gratis!",
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
    title: "Puragenda — Sistema de Reservas Online para Negocios",
    description:
      "Sistema de reservas online para hacer crecer tu local. Gestiona citas 24/7, reduce inasistencias y fideliza clientes. ¡Pruébalo gratis!",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Puragenda Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Puragenda — Sistema de Reservas Online para Negocios",
    description:
      "Sistema de reservas online para hacer crecer tu local. Gestiona citas 24/7, reduce inasistencias y fideliza clientes. ¡Pruébalo gratis!",
    images: ["/android-chrome-512x512.png"],
  },
  alternates: {
    canonical: "/",
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
    <html lang="es" className={`${plusJakarta.variable} overflow-x-hidden`} suppressHydrationWarning>
      <body
        className={`${plusJakarta.className} min-h-screen overflow-x-hidden bg-background text-foreground antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="puragenda-theme">
          <RegisterSW />
          {children}
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
