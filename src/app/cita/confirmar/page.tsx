"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

function ConfirmContent() {
  const legacy = useTranslations("legacy");
  const searchParams = useSearchParams();
  const manageToken = searchParams.get("manageToken");
  const legacyToken = searchParams.get("token");
  const token = manageToken ?? legacyToken;
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "" : "Enlace inválido. No se encontró el token de la cita.",
  );

  useEffect(() => {
    if (!token) return;

    fetch(manageToken ? "/api/appointments/manage" : "/api/appointments/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "confirm" }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(legacy("9rM5fP_5N6Hy"));
        } else if (data.alreadyProcessed) {
          setStatus("already");
          setMessage(data.error);
        } else {
          setStatus("error");
          setMessage(data.error || legacy("n-TmwrUl74Fg"));
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage(legacy("84dE-PNzLly_"));
      });
  }, [token, manageToken, legacy]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#7C3AED]" />
            <h1 className="mt-4 text-xl font-bold text-foreground"><LocalizedText id="T4XLpLT4iQKs" /></h1>
            <p className="mt-2 text-sm text-muted-foreground"><LocalizedText id="B3j_auZAt0fr" /></p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground"><LocalizedText id="GW9zh-pTyg1j" /></h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <div className="mt-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
              <p className="text-sm font-medium text-emerald-400"><LocalizedText id="tVwqGLdFFRYg" /></p>
            </div>
          </>
        )}

        {status === "already" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground"><LocalizedText id="e8_nH4ACee0C" /></h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground"><LocalizedText id="VKDowX67IaEf" /></h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}

        <p className="mt-6 text-xs text-muted-foreground/60">Puragenda</p>
      </div>
    </div>
  );
}

export default function ConfirmarCitaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
