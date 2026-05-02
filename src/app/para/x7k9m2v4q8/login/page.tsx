"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Clear any existing session first
      await fetch("/api/auth/logout", { method: "POST" });

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Credenciales inválidas");
        return;
      }

      const data = await response.json();
      if (!data.user?.isSuperAdmin) {
        // Not a superadmin — log out and show error
        await fetch("/api/auth/logout", { method: "POST" });
        setError("Acceso restringido");
        return;
      }

      router.push("/para/x7k9m2v4q8");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050508] px-6 py-12">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/6 blur-[140px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/20 to-transparent" />
      </div>

      <div className="w-full max-w-sm space-y-8">
        {/* Minimal header — no brand */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] shadow-xl shadow-[#7C3AED]/20">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6 shadow-2xl">
          <div className="mb-6 space-y-1.5 text-center">
            <h2 className="text-xl font-bold text-white">Acceso restringido</h2>
            <p className="text-xs text-[#888]">
              Solo personal autorizado
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-xs font-medium text-[#888]">Email</label>
              <input
                id="admin-email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-xl border border-white/[0.06] bg-[#141418] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#7C3AED]/40"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-xs font-medium text-[#888]">Contraseña</label>
              <input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/[0.06] bg-[#141418] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#7C3AED]/40"
              />
              <div className="flex justify-end pt-0.5">
                <Link href="/auth/forgot-password" className="text-xs text-[#7C3AED] hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#7C3AED]/20 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</>
              ) : (
                <><ShieldCheck className="h-4 w-4" /> Acceder</>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
