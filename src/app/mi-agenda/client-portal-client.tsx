"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, Check, IdCard, KeyRound, Loader2, LogOut, MapPin, Phone, RefreshCw, Save, UserPlus, UserRound, X } from "lucide-react";

export function ClientPortalAccessForm({ invalidLink = false, returnTo = null }: { invalidLink?: boolean; returnTo?: string | null }) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rut, setRut] = useState("");
  const [defaultAddress, setDefaultAddress] = useState("");
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
        body: JSON.stringify({ email, password, name, phone, rut, defaultAddress }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos completar la solicitud");
      if (mode === "login") {
        router.replace(returnTo || "/mi-agenda");
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
                  <label htmlFor="portal-phone" className="mb-2 block text-sm font-black">Teléfono</label>
                  <input id="portal-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required autoComplete="tel" placeholder="+56 9 1234 5678" className="h-13 w-full rounded-xl border-3 border-black bg-white px-4 text-base font-semibold outline-none focus:shadow-[4px_4px_0_#7c3aed]" />
                </div>
                <div>
                  <label htmlFor="portal-rut" className="mb-2 block text-sm font-black">RUT (opcional)</label>
                  <input id="portal-rut" value={rut} onChange={(event) => setRut(event.target.value)} autoComplete="off" placeholder="12.345.678-9" maxLength={20} className="h-13 w-full rounded-xl border-3 border-black bg-white px-4 text-base font-semibold outline-none focus:shadow-[4px_4px_0_#7c3aed]" />
                </div>
                <div>
                  <label htmlFor="portal-address" className="mb-2 block text-sm font-black">Dirección (opcional)</label>
                  <input id="portal-address" value={defaultAddress} onChange={(event) => setDefaultAddress(event.target.value)} autoComplete="street-address" maxLength={300} className="h-13 w-full rounded-xl border-3 border-black bg-white px-4 text-base font-semibold outline-none focus:shadow-[4px_4px_0_#7c3aed]" />
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

export function ClientPortalActivationCard({ email, initialName }: { email: string; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [rut, setRut] = useState("");
  const [defaultAddress, setDefaultAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/client-portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, phone, rut, defaultAddress, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos activar tu cuenta");
      setMessage(payload.message);
      setPassword("");
      setConfirmation("");
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : "No pudimos activar tu cuenta");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "h-11 w-full rounded-xl border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:shadow-[3px_3px_0_#7c3aed]";

  return (
    <section id="activar-cuenta" className="rounded-2xl border-3 border-black bg-[#fff5ba] p-5 shadow-[5px_5px_0_#000]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#c4b5fd]"><UserPlus className="h-5 w-5" /></div>
        <div>
          <h2 className="font-black">Guarda tus datos</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-black/60">Tu acceso actual permite ver reservas, pero todavía no es una cuenta. Actívala una vez para reservar más rápido en cualquier negocio.</p>
        </div>
      </div>

      {message ? (
        <div className="mt-5 rounded-xl border-2 border-black bg-[#bffcc6] p-4 text-sm">
          <p className="font-black">Revisa tu correo</p>
          <p className="mt-1 font-semibold text-black/65">{message}</p>
        </div>
      ) : (
        <form onSubmit={activate} className="mt-5 space-y-3">
          <input readOnly value={email} aria-label="Correo" className={`${inputClass} cursor-not-allowed bg-black/5 text-black/50`} />
          <input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre completo" aria-label="Nombre completo" className={inputClass} />
          <input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Teléfono" aria-label="Teléfono" className={inputClass} />
          <input maxLength={20} value={rut} onChange={(event) => setRut(event.target.value)} placeholder="RUT (opcional)" aria-label="RUT" className={inputClass} />
          <textarea maxLength={300} rows={2} autoComplete="street-address" value={defaultAddress} onChange={(event) => setDefaultAddress(event.target.value)} placeholder="Dirección (opcional)" aria-label="Dirección" className="w-full resize-none rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-semibold outline-none focus:shadow-[3px_3px_0_#7c3aed]" />
          <input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Crea una contraseña" aria-label="Contraseña" className={inputClass} />
          <input required minLength={10} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repite la contraseña" aria-label="Repite la contraseña" className={inputClass} />
          <p className="text-[11px] font-semibold text-black/50">Mínimo 10 caracteres, una letra y un número.</p>
          {error && <p className="rounded-lg border-2 border-red-700 bg-red-50 p-2 text-xs font-bold text-red-800">{error}</p>}
          <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#7c3aed] px-4 text-sm font-black text-white shadow-[3px_3px_0_#000] disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Activar mi cuenta
          </button>
        </form>
      )}
    </section>
  );
}

export function ClientPortalProfileEditor({ profile }: {
  profile: { name: string; email: string; phone: string; rut: string; address: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetch("/api/client-portal/profile", { cache: "no-store" }).catch(() => {});
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const response = await fetch("/api/client-portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          rut: form.rut,
          defaultAddress: form.address,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos guardar tus datos");
      setForm(payload.profile);
      setProfileMessage("Tus datos quedaron guardados para tus próximas reservas.");
      router.refresh();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "No pudimos guardar tus datos");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (newPassword !== passwordConfirmation) {
      setPasswordError("Las contraseñas nuevas no coinciden");
      return;
    }
    setPasswordLoading(true);
    try {
      const response = await fetch("/api/client-portal/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos cambiar la contraseña");
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
      setPasswordMessage("Contraseña actualizada. Las demás sesiones fueron cerradas.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "No pudimos cambiar la contraseña");
    } finally {
      setPasswordLoading(false);
    }
  }

  const inputClass = "h-11 w-full rounded-xl border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:shadow-[3px_3px_0_#7c3aed]";

  return (
    <section id="perfil" className="rounded-2xl border-3 border-black bg-white p-5 shadow-[5px_5px_0_#000]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-[#85e3ff]"><UserRound className="h-5 w-5" /></div>
        <div>
          <h2 className="font-black">Mis datos</h2>
          <p className="text-xs font-semibold text-black/50">Se completan automáticamente al reservar.</p>
        </div>
      </div>

      <form onSubmit={saveProfile} className="mt-5 space-y-3">
        <label className="block text-xs font-black"><span className="mb-1 flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />Nombre completo</span><input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
        <label className="block text-xs font-black"><span className="mb-1 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Teléfono</span><input required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} /></label>
        <label className="block text-xs font-black"><span className="mb-1 flex items-center gap-1.5"><IdCard className="h-3.5 w-3.5" />RUT</span><input maxLength={20} value={form.rut} onChange={(event) => setForm((current) => ({ ...current, rut: event.target.value }))} placeholder="12.345.678-9" className={inputClass} /></label>
        <label className="block text-xs font-black"><span className="mb-1 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Dirección</span><textarea maxLength={300} rows={3} autoComplete="street-address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="w-full resize-none rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-semibold outline-none focus:shadow-[3px_3px_0_#7c3aed]" /></label>
        <label className="block text-xs font-black"><span className="mb-1 block">Correo de la cuenta</span><input readOnly value={form.email} className={`${inputClass} cursor-not-allowed bg-black/5 text-black/50`} /></label>
        {profileError && <p className="rounded-lg border-2 border-red-700 bg-red-50 p-2 text-xs font-bold text-red-800">{profileError}</p>}
        {profileMessage && <p className="rounded-lg border-2 border-green-700 bg-green-50 p-2 text-xs font-bold text-green-800">{profileMessage}</p>}
        <button disabled={saving} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#7c3aed] px-4 text-sm font-black text-white shadow-[3px_3px_0_#000] disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar mis datos
        </button>
      </form>

      <details className="mt-5 border-t-2 border-black/10 pt-4">
        <summary className="cursor-pointer text-sm font-black">Cambiar contraseña</summary>
        <form onSubmit={changePassword} className="mt-3 space-y-3">
          <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Contraseña actual" className={inputClass} />
          <input required minLength={10} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Nueva contraseña" className={inputClass} />
          <input required minLength={10} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Repite la nueva contraseña" className={inputClass} />
          {passwordError && <p className="text-xs font-bold text-red-700">{passwordError}</p>}
          {passwordMessage && <p className="text-xs font-bold text-green-700">{passwordMessage}</p>}
          <button disabled={passwordLoading} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#fff5ba] px-4 text-xs font-black shadow-[3px_3px_0_#000] disabled:opacity-60">
            {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Actualizar contraseña
          </button>
        </form>
      </details>
    </section>
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
