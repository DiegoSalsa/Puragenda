import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { RegisterSW } from "@/components/pwa/register-sw";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  themeColor: "#a855f7",
};

export const metadata: Metadata = {
  title: "Puragenda by PuroCode — Agenda Inteligente para tu Negocio",
  description:
    "Plataforma SaaS de agendamiento multitenant. Reservas automáticas, widget marca blanca y gestión de citas integrada en tu web.",
  keywords: ["agendamiento", "reservas", "SaaS", "PuroCode", "widget", "citas"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={plusJakarta.variable} suppressHydrationWarning>
      <body
        className={`${plusJakarta.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <RegisterSW />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

