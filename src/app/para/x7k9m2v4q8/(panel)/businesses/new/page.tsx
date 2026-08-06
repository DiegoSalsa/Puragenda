"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { createBusinessAction } from "@/server/actions/admin.actions";

export default function NewBusinessPage() {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState<"INDIVIDUAL" | "EQUIPO">("EQUIPO");
  const [initialBenefit, setInitialBenefit] = useState<"NONE" | "PRIZE_12" | "PRIZE_6" | "PRIZE_3" | "PARTICIPANT_OFFER">("NONE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createBusinessAction({
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword,
        businessName: businessName.trim(),
        plan,
        initialBenefit,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/para/x7k9m2v4q8/businesses");
          router.refresh();
        }, 1500);
      }
    } catch {
      setError(legacy("aBq68c8Woqdq"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="border-4 border-black bg-[#BFFCC6] p-12 shadow-[8px_8px_0_#000] space-y-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-black mx-auto" />
          <h2 className="text-3xl font-black uppercase tracking-tight text-black"><LocalizedText id="8Q3f-E5zI7fr" /></h2>
          <p className="text-sm font-bold text-black/60"><LocalizedText id="Nb1VKkF7krAL" /></p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/para/x7k9m2v4q8/businesses"
          className="mb-4 inline-flex items-center gap-1 text-sm font-black uppercase text-black hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> <LocalizedText id="JhxPoaC3z5e_" />
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight text-black"><LocalizedText id="VvuwYQzMj7ZD" /></h1>
        <p className="text-sm font-bold text-black/50"><LocalizedText id="2SUqhBm4C1Df" /></p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Info */}
        <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
          <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black"><LocalizedText id="tPW9tglHzyJq" /></h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="businessName" className="text-xs font-black uppercase text-black/60">
                <LocalizedText id="uYWMtrFSTiuJ" />
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                placeholder={legacy("f0ROMAfkxcRG")}
                className="w-full border-2 border-black px-4 py-2.5 text-sm font-bold text-black outline-none placeholder:text-black/30 focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
          <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black"><LocalizedText id="XJXmjLZG21sh" /></h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ownerName" className="text-xs font-black uppercase text-black/60">
                <LocalizedText id="rMLiRdW5UYo2" />
              </label>
              <input
                id="ownerName"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                placeholder={legacy("5RDKtaPPxSjo")}
                className="w-full border-2 border-black px-4 py-2.5 text-sm font-bold text-black outline-none placeholder:text-black/30 focus:border-black"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ownerEmail" className="text-xs font-black uppercase text-black/60">
                <LocalizedText id="lpzL089jAOzV" />
              </label>
              <input
                id="ownerEmail"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
                placeholder="carlos@negocio.cl"
                className="w-full border-2 border-black px-4 py-2.5 text-sm font-bold text-black outline-none placeholder:text-black/30 focus:border-black"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ownerPassword" className="text-xs font-black uppercase text-black/60">
                <LocalizedText id="o4mmON7DJTj1" />
              </label>
              <input
                id="ownerPassword"
                type="text"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                required
                placeholder={legacy("VQqJDNz_dTRX")}
                className="w-full border-2 border-black px-4 py-2.5 text-sm font-bold text-black outline-none placeholder:text-black/30 focus:border-black"
              />
              <p className="text-xs font-bold text-black/40"><LocalizedText id="tchIHoWfhQJ9" /></p>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
          <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black"><LocalizedText id="zUaeys5mjq98" /></h3>
          <div className="grid grid-cols-2 gap-3">
            {(["INDIVIDUAL", "EQUIPO"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`border-4 border-black p-4 text-left transition-all ${
                  plan === p
                    ? "bg-[#FFF5BA] shadow-[3px_3px_0_#000]"
                    : "bg-white shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                }`}
              >
                <p className="text-sm font-black uppercase text-black">
                  {p === "INDIVIDUAL" ? "Individual" : "Equipo"}
                </p>
                <p className="mt-1 text-xs font-bold text-black/50">
                  {p === "INDIVIDUAL" ? legacy("fD0CEPfbwqQ-") : legacy("6sVYiNpWrR5U")}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
          <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black"><LocalizedText id="yy8m1fx5vXHM" /></h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: "NONE", title: legacy("jOU1S2HsyWeu"), detail: "Cuenta normal" },
              { value: "PRIZE_12", title: legacy("jpbil_C9FsAB"), detail: legacy("yx3nIzs8mfeG") },
              { value: "PRIZE_6", title: legacy("BN9ro8pt_XFw"), detail: legacy("_8OleFuDPCKV") },
              { value: "PRIZE_3", title: legacy("o9j3WYJOL7Nz"), detail: legacy("9r1g9y8GLZAp") },
              { value: "PARTICIPANT_OFFER", title: "Participante 2+2", detail: legacy("xxOnLBiH2u44") },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setInitialBenefit(option.value as typeof initialBenefit)}
                className={`border-4 border-black p-4 text-left transition-all ${
                  initialBenefit === option.value
                    ? "bg-[#BFFCC6] shadow-[3px_3px_0_#000]"
                    : "bg-white shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                }`}
              >
                <p className="text-sm font-black uppercase text-black">{option.title}</p>
                <p className="mt-1 text-xs font-bold text-black/50">{option.detail}</p>
              </button>
            ))}
          </div>
          {initialBenefit !== "NONE" && (
            <div className="mt-4 border-2 border-black bg-[#FFF5BA] px-3 py-2 text-xs font-black text-black">
              <LocalizedText id="gobJy9iyLPcp" />
            </div>
          )}
        </div>

        {error && (
          <div className="border-4 border-black bg-[#FFB5E8] px-4 py-3 text-sm font-black text-black">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/para/x7k9m2v4q8/businesses"
            className="border-4 border-black bg-white px-6 py-2.5 text-sm font-black uppercase text-black shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <LocalizedText id="u527QG3L1SSL" />
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 border-4 border-black bg-black py-2.5 text-sm font-black uppercase text-white shadow-[3px_3px_0_#7C3AED] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> <LocalizedText id="cZFdvI75RJfV" /></>
            ) : (
              <><Building2 className="h-4 w-4" /> <LocalizedText id="6ws1rmKVXYrK" /></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
