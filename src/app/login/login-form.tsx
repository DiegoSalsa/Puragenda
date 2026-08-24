"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "@/components/icons/hover-icons";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message =
          response.status >= 500
            ? t("serverError")
            : data.error || t("loginError");
        const details = data.details?.length ? `: ${data.details.join(", ")}` : "";
        setError(`${message}${details}`);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("connectionError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up">
      <div className="mb-6 space-y-1.5">
        <h2 className="text-2xl font-bold">{t("loginTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("loginSubtitle")}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm text-muted-foreground">{t("email")}</label>
          <input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm text-muted-foreground">{t("password")}</label>
          <div className="relative">
            <input
              id="password"
              type={passwordVisible ? "text" : "password"}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 pr-11 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((current) => !current)}
              aria-label={passwordVisible ? t("hidePassword") : t("showPassword")}
              title={passwordVisible ? t("hidePassword") : t("showPassword")}
              className="absolute inset-y-0 right-2 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex justify-end pt-1">
            <Link href="/auth/forgot-password" className="text-xs text-[#7C3AED] hover:underline">
              {t("forgotPassword")}
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" aria-live="polite" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {t("signingIn")}</>
          ) : (
            <><LogIn className="h-4 w-4" /> {t("signIn")}</>
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/pricing" className="text-[#7C3AED] hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
