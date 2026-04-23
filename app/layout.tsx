import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "AgendaPro by PuroCode — SaaS de Agendamiento",
  description:
    "Plataforma multitenant de agendamiento y reservas. Gestiona citas, servicios y ofrece un widget embebible para tus clientes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${plusJakarta.variable} dark`}>
      <body className={`${plusJakarta.className} min-h-screen bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
