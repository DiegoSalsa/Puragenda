"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, Check, Loader2, LogOut, RefreshCw, X } from "lucide-react";

export function ClientPortalAccessForm({ invalidLink = false }: { invalidLink?: boolean }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    invalidLink ? "Ese enlace ya fue utilizado o venció. Pide uno nuevo." : null,
  );
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/client-portal/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos enviar el enlace");
      setMessage(payload.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos enviar el enlace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fffaf0] px-5 py-12 text-black">
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#ffb5e8]/40 blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#85e3ff]/40 blur-3xl" />
      <div className="relative w-full max-w-md rounded-[2rem] border-4 border-black bg-white p-6 shadow-[10px_10px_0_#000] sm:p-8">
        <Link href="/" className="mb-8 inline-flex items-center">
          <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda" className="h-12 w-auto" />
        </Link>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border-3 border-black bg-[#c4b5fd] shadow-[4px_4px_0_#000]">
          <CalendarClock className="h-7 w-7" strokeWidth={2.5} />
        </div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#6d28d9]">Portal del cliente</p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Tu agenda, sin contraseña.</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-black/60">
          Escribe el correo que usaste al reservar. Te enviaremos un enlace privado para ver tus citas, historial y premios.
        </p>

        {message ? (
          <div className="mt-7 rounded-2xl border-3 border-black bg-[#bffcc6] p-5 shadow-[4px_4px_0_#000]">
            <Check className="mb-3 h-6 w-6" strokeWidth={3} />
            <p className="font-black">Revisa tu correo</p>
            <p className="mt-1 text-sm font-medium leading-5">{message}</p>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="mt-4 text-xs font-black uppercase underline underline-offset-4"
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="portal-email" className="mb-2 block text-sm font-black">Correo electrónico</label>
              <input
                id="portal-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.cl"
                required
                className="h-13 w-full rounded-xl border-3 border-black bg-white px-4 text-base font-semibold outline-none transition-shadow focus:shadow-[4px_4px_0_#7c3aed]"
              />
            </div>
            {error && (
              <div className="flex gap-2 rounded-xl border-2 border-red-700 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl border-3 border-black bg-[#7c3aed] px-5 font-black text-white shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Enviarme el enlace <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs font-medium leading-5 text-black/45">
          El enlace dura 15 minutos y se puede usar una sola vez. No necesitas crear una cuenta.
        </p>
      </div>
    </main>
  );
}

export function ClientPortalAppointmentActions({
  appointmentId,
  canCancel,
  canReschedule,
}: {
  appointmentId: string;
  canCancel: boolean;
  canReschedule: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"cancel" | "reschedule" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reschedule() {
    setLoading("reschedule");
    setError(null);
    try {
      const response = await fetch(`/api/client-portal/appointments/${appointmentId}/reschedule`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      window.location.assign(payload.url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos reagendar");
      setLoading(null);
    }
  }

  async function cancel() {
    if (!window.confirm("¿Seguro que quieres cancelar esta cita? Esta acción no se puede deshacer.")) return;
    setLoading("cancel");
    setError(null);
    try {
      const response = await fetch(`/api/client-portal/appointments/${appointmentId}/cancel`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos cancelar");
    } finally {
      setLoading(null);
    }
  }

  if (!canCancel && !canReschedule) return null;

  return (
    <div className="mt-4 border-t-2 border-black/10 pt-4">
      <div className="flex flex-wrap gap-2">
        {canReschedule && (
          <button type="button" onClick={reschedule} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-[#fff5ba] px-3 py-2 text-xs font-black shadow-[2px_2px_0_#000] disabled:opacity-50">
            {loading === "reschedule" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reagendar
          </button>
        )}
        {canCancel && (
          <button type="button" onClick={cancel} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-black text-red-700 shadow-[2px_2px_0_#000] disabled:opacity-50">
            {loading === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Cancelar
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}

export function ClientPortalLogout() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/client-portal/logout", { method: "POST" });
    window.location.assign("/mi-agenda");
  }

  return (
    <button type="button" onClick={logout} disabled={loading} className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_#000] disabled:opacity-60">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Salir
    </button>
  );
}
