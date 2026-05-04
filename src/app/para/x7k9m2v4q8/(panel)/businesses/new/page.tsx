"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { createBusinessAction } from "@/server/actions/admin.actions";

export default function NewBusinessPage() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState<"INDIVIDUAL" | "EQUIPO">("EQUIPO");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createBusinessAction({
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword,
        businessName: businessName.trim(),
        plan,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/para/x7k9m2v4q8/businesses");
          router.refresh();
        }, 1500);
      }
    } catch {
      setError("Error al crear el negocio");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">¡Negocio creado!</h2>
          <p className="text-sm text-[#888]">Redirigiendo a la lista de negocios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/para/x7k9m2v4q8/businesses"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#7C3AED] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a negocios
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Agregar Negocio</h1>
            <p className="text-sm text-[#888]">Crear un nuevo negocio manualmente</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Info */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">Información del Negocio</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="businessName" className="text-xs font-medium text-[#888]">
                Nombre del negocio
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                placeholder="Ej: Barbería Santiago"
                className="w-full rounded-xl border border-white/[0.06] bg-[#141418] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#7C3AED]/40"
              />
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">Datos del Dueño</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ownerName" className="text-xs font-medium text-[#888]">
                Nombre completo
              </label>
              <input
                id="ownerName"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                placeholder="Ej: Carlos Ruiz"
                className="w-full rounded-xl border border-white/[0.06] bg-[#141418] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#7C3AED]/40"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ownerEmail" className="text-xs font-medium text-[#888]">
                Email
              </label>
              <input
                id="ownerEmail"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
                placeholder="carlos@negocio.cl"
                className="w-full rounded-xl border border-white/[0.06] bg-[#141418] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#7C3AED]/40"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ownerPassword" className="text-xs font-medium text-[#888]">
                Contraseña
              </label>
              <input
                id="ownerPassword"
                type="text"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                required
                placeholder="Contraseña temporal"
                className="w-full rounded-xl border border-white/[0.06] bg-[#141418] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#7C3AED]/40"
              />
              <p className="text-xs text-[#555]">El dueño podrá cambiar esta contraseña después.</p>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">Plan de Suscripción</h3>
          <div className="grid grid-cols-2 gap-3">
            {(["INDIVIDUAL", "EQUIPO"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  plan === p
                    ? "border-[#7C3AED]/40 bg-[#7C3AED]/10"
                    : "border-white/[0.06] bg-[#141418] hover:border-white/[0.12]"
                }`}
              >
                <p className={`text-sm font-bold ${plan === p ? "text-[#A78BFA]" : "text-white"}`}>
                  {p === "INDIVIDUAL" ? "Individual" : "Equipo"}
                </p>
                <p className="mt-1 text-xs text-[#666]">
                  {p === "INDIVIDUAL" ? "$9.990/mes" : "$24.990/mes"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/para/x7k9m2v4q8/businesses"
            className="rounded-xl border border-white/[0.06] bg-[#141418] px-6 py-2.5 text-sm font-medium text-[#888] transition-all hover:text-white"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#7C3AED]/20 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creando...</>
            ) : (
              <><Building2 className="h-4 w-4" /> Crear Negocio</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
