import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Puragenda by PuroCode — Agenda Inteligente para tu Negocio",
  description:
    "Plataforma SaaS de agendamiento multitenant. Reservas automáticas, widget marca blanca y gestión de citas integrada en tu web.",
  keywords: ["agendamiento", "reservas", "SaaS", "PuroCode", "widget", "citas"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${plusJakarta.variable} dark`}>
      <body
        className={`${plusJakarta.className} min-h-screen bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
