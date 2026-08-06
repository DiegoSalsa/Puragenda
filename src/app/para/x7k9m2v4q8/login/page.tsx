"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";

type Step = "email" | "code";

export default function AdminLoginPage() {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function requestCode() {
    const response = await fetch("/api/auth/admin-code/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No fue posible enviar el código");

    setStep("code");
    setCode("");
    setResendIn(60);
    setMessage(data.message || legacy("TL_ALuZOxCnd"));
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await requestCode();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : legacy("Jiou2jHDuVYa"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/admin-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || legacy("JcAAj_oPQDa-"));
        return;
      }

      router.push("/para/x7k9m2v4q8");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || resendIn > 0) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await requestCode();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : legacy("npZfUN7kp0HR"));
    } finally {
      setLoading(false);
    }
  }

  function changeEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setMessage(null);
    setResendIn(0);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050508] px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/6 blur-[140px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/20 to-transparent" />
      </div>

      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] shadow-xl shadow-[#7C3AED]/20">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6 shadow-2xl">
          <div className="mb-6 space-y-1.5 text-center">
            <h1 className="text-xl font-bold text-white">
              {step === "email" ? "Acceso restringido" : legacy("DD1umyLNHnxt")}
            </h1>
            <p className="text-xs text-[#888]">
              {step === "email"
                ? legacy("nny38-DcZ5m_")
                : `Enviamos un código de 6 dígitos a ${email}`}
            </p>
          </div>

          {step === "email" ? (
            <form className="space-y-4" onSubmit={handleEmailSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="text-xs font-medium text-[#888]"><LocalizedText id="lpzL089jAOzV" /></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
                  <input
                    id="admin-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/[0.06] bg-[#141418] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#7C3AED]/40"
                  />
                </div>
              </div>

              {error && <Feedback tone="error">{error}</Feedback>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#7C3AED]/20 disabled:opacity-50"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> <LocalizedText id="SJ9ZmHAHL_nZ" /></> : <><Mail className="h-4 w-4" /> <LocalizedText id="Jw4kakAAoNmt" /></>}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleCodeSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="admin-code" className="text-xs font-medium text-[#888]"><LocalizedText id="VLsA3e2zhLX_" /></label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
                  <input
                    id="admin-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="w-full rounded-xl border border-white/[0.06] bg-[#141418] py-3 pl-10 pr-4 text-center font-mono text-xl font-bold tracking-[0.35em] text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#7C3AED]/40"
                  />
                </div>
              </div>

              {message && <Feedback tone="success">{message}</Feedback>}
              {error && <Feedback tone="error">{error}</Feedback>}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#7C3AED]/20 disabled:opacity-50"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> <LocalizedText id="Kd6ECFPSuHDK" /></> : <><ShieldCheck className="h-4 w-4" /> <LocalizedText id="26Z1O9iSzBfk" /></>}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={changeEmail} className="text-[#888] hover:text-white">
                  <LocalizedText id="KZo36SL3fXLs" />
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || resendIn > 0}
                  className="text-[#7C3AED] hover:underline disabled:text-[#555] disabled:no-underline"
                >
                  {resendIn > 0 ? `Reenviar en ${resendIn}s` : legacy("rBcuXA9Cvbg_")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function Feedback({ children, tone }: { children: React.ReactNode; tone: "error" | "success" }) {
  const colors = tone === "error"
    ? "border-red-500/20 bg-red-500/10 text-red-400"
    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  return <div className={`rounded-xl border px-3 py-2 text-sm ${colors}`}>{children}</div>;
}
