import Link from "next/link";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { PricingCards } from "@/components/pricing-cards";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata = {
  title: "Selecciona tu Plan — Puragenda",
  description: "Elige el plan que mejor se adapte a tu negocio.",
};

export default async function PricingPage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#7C3AED]/5 blur-[120px]" />
      </div>

      <Navbar user={user} business={business} />

      {/* Pricing Content */}
      <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <div className="mb-12 text-center animate-fade-up">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7C3AED]">
            {user ? "¡Bienvenido!" : "Precios claros"}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {user ? "Selecciona tu plan" : "Planes para crecer a tu ritmo"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {user
              ? "Elige el plan que mejor se adapte a las necesidades de tu negocio."
              : "Prueba gratis 30 días en Plan Base. Sin tarjeta. Cancela cuando quieras."}
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <PricingCards mode={user ? "selection" : "landing"} />
        </div>

        {/* Footer note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Todos los precios en CLP. IVA no incluido. Cancela cuando quieras.
          </p>
          {user && (
            <Link href="/dashboard" className="mt-4 inline-block text-sm text-[#7C3AED] hover:underline">
              ← Volver al Dashboard
            </Link>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
