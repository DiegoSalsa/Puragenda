"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "@/components/icons/hover-icons";
import { forgotPasswordAction } from "@/server/actions/auth.actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const legacy = useTranslations("legacy");
  const t = useTranslations("passwordRecovery");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await forgotPasswordAction(email.trim());

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/8 blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end"><LanguageSwitcher /></div>
        <Link href="/" className="mx-auto flex w-fit items-center gap-3">
          <img src="/logos/logoPuragendaSVG.svg" alt={legacy("VtgsteC0Ewqn")} className="h-16 w-auto -my-3" />
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up">
          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold">{t("checkEmail")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t.rich("checkEmailDescription", { email: () => <strong className="text-foreground">{email}</strong> })}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("checkSpam")}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-[#7C3AED] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t("backLogin")}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-1.5">
                <h2 className="text-2xl font-bold">{t("forgotTitle")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("forgotDescription")}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="text-sm text-muted-foreground">{t("email")}</label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
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
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t("sending")}</>
                  ) : (
                    <><Mail className="h-4 w-4" /> {t("sendLink")}</>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link href="/login" className="inline-flex items-center gap-1 text-[#7C3AED] hover:underline">
                  <ArrowLeft className="h-3.5 w-3.5" /> {t("backLogin")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
