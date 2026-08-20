"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, Check, KeyRound, Loader2, LogOut, RefreshCw, UserPlus, X } from "lucide-react";

export function ClientPortalAccessForm({ invalidLink = false }: { invalidLink?: boolean }) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    invalidLink ? "Ese enlace ya fue utilizado o venció." : null,
  );
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const endpoint = mode === "login"
        ? "/api/client-portal/login"
        : mode === "register"
          ? "/api/client-portal/register"
          : "/api/client-portal/forgot-password";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, phone }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos completar la solicitud");
      if (mode === "login") {
        router.replace("/mi-agenda");
        router.refresh();
        return;
      }
      setMessage(payload.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : legacy("_7Dgboa2a61e"));
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
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          {mode === "login" ? "Entra a Mi agenda" : mode === "register" ? "Activa tu cuenta" : "Recupera tu contraseña"}
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-black/60">
          {mode === "login"
            ? "Consulta tus reservas y reutiliza tus datos sin completar el formulario cada vez."
            : mode === "register"
              ? "Usa el mismo correo de tu reserva. Te enviaremos una sola verificación para activar la cuenta."
              : "Te enviaremos un enlace únicamente para crear una contraseña nueva."}
        </p>

        {message ? (
          <div className="mt-7 rounded-2xl border-3 border-black bg-[#bffcc6] p-5 shadow-[4px_4px_0_#000]">
            <Check className="mb-3 h-6 w-6" strokeWidth={3} />
            <p className="font-black"><LocalizedText id="DD1umyLNHnxt" /></p>
            <p className="mt-1 text-sm font-medium leading-5">{message}</p>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="mt-4 text-xs font-black uppercase underline underline-offset-4"
            >
              <LocalizedText id="X_BImI43yMzv" />
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="portal-email" className="mb-2 block text-sm font-black">Correo</label>
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
            {mode === "register" && (
              <>
                <div>
                  <label htmlFor="portal-name" className="mb-2 block text-sm font-black">Nombre</label>
                  <input id="portal-name" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" className="h-13 w-full rounded-xl border-3 border-black bg-white px-4 text-base font-semibold outline-none focus:shadow-[4px_4px_0_#7c3aed]" />
                </div>
                <div>
                  <label htmlFor="portal-phone" className="mb-2 block text-sm font-black">Teléfono (opcional)</label>
                  <input id="portal-phone" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className="h-13 w-full rounded-xl border-3 border-black bg-white px-4 text-base font-semibold outline-none focus:shadow-[4px_4px_0_#7c3aed]" />
                </div>
              </>
            )}
            {mode !== "forgot" && (
              <div>
                <label htmlFor="portal-password" className="mb-2 block text-sm font-black">Contraseña</label>
                <input id="portal-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "register" ? 10 : 1} className="h-13 w-full rounded-xl border-3 border-black bg-white px-4 text-base font-semibold outline-none focus:shadow-[4px_4px_0_#7c3aed]" />
                {mode === "register" && <p className="mt-1.5 text-xs font-medium text-black/45">Mínimo 10 caracteres, con una letra y un número.</p>}
              </div>
            )}
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
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{mode === "login" ? "Entrar" : mode === "register" ? "Enviar verificación" : "Recuperar contraseña"} <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>
        )}

        {!message && (
          <div className="mt-6 flex flex-col gap-2 border-t-2 border-black/10 pt-5 text-sm font-bold">
            {mode !== "register" && <button type="button" onClick={() => { setMode("register"); setError(null); }} className="inline-flex items-center gap-2 text-left text-[#6d28d9]"><UserPlus className="h-4 w-4" /> Activar mi cuenta</button>}
            {mode !== "forgot" && <button type="button" onClick={() => { setMode("forgot"); setError(null); }} className="inline-flex items-center gap-2 text-left text-black/55"><KeyRound className="h-4 w-4" /> Olvidé mi contraseña</button>}
            {mode !== "login" && <button type="button" onClick={() => { setMode("login"); setError(null); setMessage(null); }} className="text-left text-black/55">Volver a iniciar sesión</button>}
          </div>
        )}
      </div>
    </main>
  );
}

export function ClientPortalPasswordResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) return setError("Las contraseñas no coinciden");
    setLoading(true);
    setError(null);
    const response = await fetch("/api/client-portal/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "No pudimos cambiar la contraseña");
      setLoading(false);
      return;
    }
    router.replace("/mi-agenda");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-5 py-12 text-black">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-[2rem] border-4 border-black bg-white p-7 shadow-[10px_10px_0_#000]">
        <KeyRound className="h-10 w-10 text-[#6d28d9]" />
        <h1 className="text-3xl font-black">Nueva contraseña</h1>
        <p className="text-sm font-medium text-black/60">Usa al menos 10 caracteres, una letra y un número.</p>
        <input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nueva contraseña" className="h-13 w-full rounded-xl border-3 border-black px-4 font-semibold" />
        <input type="password" autoComplete="new-password" minLength={10} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repite la contraseña" className="h-13 w-full rounded-xl border-3 border-black px-4 font-semibold" />
        {error && <p className="rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
        <button disabled={loading} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl border-3 border-black bg-[#7c3aed] font-black text-white shadow-[4px_4px_0_#000] disabled:opacity-60">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar y entrar"}
        </button>
      </form>
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
  const legacy = useTranslations("legacy");
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
    if (!window.confirm(legacy("9qZ2Kd698ckx"))) return;
    setLoading("cancel");
    setError(null);
    try {
      const response = await fetch(`/api/client-portal/appointments/${appointmentId}/cancel`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : legacy("RHPwHw5PnayN"));
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
            <LocalizedText id="NGxxzQRpxnrQ" />
          </button>
        )}
        {canCancel && (
          <button type="button" onClick={cancel} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-black text-red-700 shadow-[2px_2px_0_#000] disabled:opacity-50">
            {loading === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            <LocalizedText id="u527QG3L1SSL" />
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}

export function ClientPortalLogout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/client-portal/logout", { method: "POST" });
    router.replace("/mi-agenda");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={loading} className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_#000] disabled:opacity-60">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <LocalizedText id="k__79855nzP6" />
    </button>
  );
}
