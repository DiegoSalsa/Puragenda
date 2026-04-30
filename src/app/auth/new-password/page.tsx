"use client";

import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { resetPasswordAction } from "@/server/actions/auth.actions";

function NewPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold">Enlace inválido</h2>
          <p className="text-sm text-muted-foreground">
            Este enlace de restablecimiento no es válido. Solicita uno nuevo.
          </p>
        </div>
        <Link
          href="/auth/forgot-password"
          className="inline-flex items-center gap-2 text-sm text-[#7C3AED] hover:underline"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPasswordAction(token!, password);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold">Contraseña actualizada</h2>
          <p className="text-sm text-muted-foreground">
            Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6]"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 space-y-1.5">
        <h2 className="text-2xl font-bold">Nueva contraseña</h2>
        <p className="text-sm text-muted-foreground">
          Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="new-password" className="text-sm text-muted-foreground">
            Nueva contraseña
          </label>
          <input
            id="new-password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoFocus
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-new-password" className="text-sm text-muted-foreground">
            Confirmar contraseña
          </label>
          <input
            id="confirm-new-password"
            type="password"
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Actualizando...</>
          ) : (
            <><Lock className="h-4 w-4" /> Restablecer contraseña</>
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="inline-flex items-center gap-1 text-[#7C3AED] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al login
        </Link>
      </p>
    </>
  );
}

export default function NewPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/8 blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="mx-auto flex w-fit items-center gap-3">
          <img src="/logos/logo-black.svg" alt="Puragenda Logo" className="h-16 w-auto -my-3 dark:hidden" />
          <img src="/logos/logo-white.svg" alt="Puragenda Logo" className="hidden h-16 w-auto -my-3 dark:block" />
          <span className="text-3xl font-bold tracking-tight">
            Pura<span className="text-[#7C3AED]">genda</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" />
            </div>
          }>
            <NewPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
