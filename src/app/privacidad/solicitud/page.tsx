import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyRequestForm } from "./request-form";

export const metadata: Metadata = {
  title: "Ejercer derechos de datos",
  description: "Solicita acceso, rectificación, supresión, oposición, portabilidad o bloqueo de tus datos en Puragenda.",
  robots: { index: false, follow: false },
};

export default function PrivacyRequestPage() {
  return (
    <main className="min-h-screen bg-[#F8F5ED] px-6 py-16 text-[#171717]">
      <div className="mx-auto max-w-2xl">
        <Link href="/politica-de-privacidad" className="text-sm font-bold underline underline-offset-4">
          Volver a la política de privacidad
        </Link>
        <div className="mt-8 border-4 border-black bg-white p-6 shadow-[7px_7px_0_#000] sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7C3AED]">Puragenda · Derechos de datos</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-5xl">Solicita gestionar tus datos</h1>
          <p className="mt-4 text-sm font-medium leading-6 text-black/70">
            Usa este formulario para solicitar acceso, rectificación, supresión, oposición, portabilidad o bloqueo temporal.
            Verificaremos tu identidad antes de responder. Respondemos dentro de 30 días corridos, prorrogables una vez cuando corresponda; las solicitudes de bloqueo temporal se responden dentro de 2 días hábiles.
          </p>
          <PrivacyRequestForm />
        </div>
      </div>
    </main>
  );
}
