"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { XCircle, Loader2, AlertCircle, AlertTriangle } from "lucide-react";

function CancelContent() {
  const legacy = useTranslations("legacy");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const manageToken = searchParams.get("manageToken");
  const activeToken = manageToken ?? token;
  const [step, setStep] = useState<"confirm" | "loading" | "success" | "error" | "already">("confirm");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [preview, setPreview] = useState<{
    serviceName: string;
    staffName: string;
    businessName: string;
    startTime: string;
    endTime: string;
    timezone: string;
  } | null>(null);

  useEffect(() => {
    if (!manageToken) return;
    fetch(`/api/appointments/manage?token=${encodeURIComponent(manageToken)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "El enlace no es válido");
        setPreview(data);
      })
      .catch((error) => {
        setStep("error");
        setMessage(error instanceof Error ? error.message : legacy("lBj7HzvOeXzv"));
      });
  }, [manageToken, legacy]);

  function handleCancel() {
    if (!activeToken) {
      setStep("error");
      setMessage(legacy("Wp7jNdiEWeZ9"));
      return;
    }

    setStep("loading");

    fetch(manageToken ? "/api/appointments/manage" : "/api/appointments/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: activeToken, action: "cancel", confirmation }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStep("success");
          setMessage(legacy("sAz3FSVhJP9b"));
        } else if (data.alreadyProcessed) {
          setStep("already");
          setMessage(data.error);
        } else {
          setStep("error");
          setMessage(data.error || legacy("D71gHVVoqAuA"));
        }
      })
      .catch(() => {
        setStep("error");
        setMessage(legacy("84dE-PNzLly_"));
      });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">

        {/* Step 1: Confirmation layer */}
        {step === "confirm" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground"><LocalizedText id="vx3EU8XIBJdV" /></h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <LocalizedText id="o10B0Xc7fIUo" />
            </p>

            {preview && (
              <div className="mt-5 space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-left text-sm">
                <p><span className="text-muted-foreground"><LocalizedText id="yLTJO2diSooL" /></span> <strong>{preview.businessName}</strong></p>
                <p><span className="text-muted-foreground"><LocalizedText id="Xn5rZDSz0P56" /></span> <strong>{preview.serviceName}</strong></p>
                <p><span className="text-muted-foreground"><LocalizedText id="NHxI0zxNEBCQ" /></span> <strong>{preview.staffName}</strong></p>
                <p>
                  <span className="text-muted-foreground"><LocalizedText id="WWT00Jnfn8u5" /></span>{" "}
                  <strong>
                    {new Intl.DateTimeFormat("es-CL", {
                      dateStyle: "full",
                      timeStyle: "short",
                      timeZone: preview.timezone,
                    }).format(new Date(preview.startTime))}
                  </strong>
                </p>
              </div>
            )}

            <div className="mt-6 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              <p className="text-sm text-amber-400">
                <LocalizedText id="p8YWFQli3oqf" />
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <label className="text-left">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <LocalizedText id="Mmz_S-BPGw8Y" />
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
                  placeholder={legacy("saX-ZdGAUNrp")}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-bold tracking-widest outline-none focus:border-red-500"
                />
              </label>
              <button
                onClick={handleCancel}
                disabled={confirmation !== "CANCELAR"}
                className="w-full rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-600 hover:shadow-red-500/35 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <LocalizedText id="2_aOwrygQDKn" />
              </button>
              <Link
                href="/"
                className="w-full rounded-xl border border-border px-6 py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground inline-block"
              >
                <LocalizedText id="UgOqUV67g5OI" />
              </Link>
            </div>
          </>
        )}

        {/* Loading */}
        {step === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-foreground"><LocalizedText id="cGVjhS7XGR7Y" /></h1>
            <p className="mt-2 text-sm text-muted-foreground"><LocalizedText id="B3j_auZAt0fr" /></p>
          </>
        )}

        {/* Success */}
        {step === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground"><LocalizedText id="HmESJudwFJ_7" /></h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <div className="mt-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm font-medium text-red-400"><LocalizedText id="x85xWtV-pf-7" /></p>
            </div>
          </>
        )}

        {/* Already processed */}
        {step === "already" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground"><LocalizedText id="e8_nH4ACee0C" /></h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}

        {/* Error */}
        {step === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground"><LocalizedText id="VKDowX67IaEf" /></h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}

        {step !== "confirm" && (
          <p className="mt-6 text-xs text-muted-foreground/60">Puragenda</p>
        )}
      </div>
    </div>
  );
}

export default function CancelarCitaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
