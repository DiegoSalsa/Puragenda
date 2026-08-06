import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { RegisterForm } from "./register-form";
import { getCountryOptions, isSupportedCountryCode } from "@/core/countries";
import { isLocalPaymentSimulatorEnabled } from "@/server/services/local-payment-simulator";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale } from "next-intl/server";

export default async function RegisterPage() {
  const user = await getCurrentSessionUser();
  const locale = await getLocale();
  const requestHeaders = await headers();
  const detectedCountry = requestHeaders.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  const initialCountryCode = isSupportedCountryCode(detectedCountry) ? detectedCountry : "";

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/8 blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <Link href="/" className="mx-auto flex w-fit items-center gap-3">
          <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda Logo" className="h-16 w-auto -my-3" />
        </Link>

        <Suspense>
          <RegisterForm
            countryOptions={getCountryOptions(locale)}
            paymentSimulatorEnabled={isLocalPaymentSimulatorEnabled()}
            initialCountryCode={initialCountryCode}
          />
        </Suspense>
      </div>
    </main>
  );
}
