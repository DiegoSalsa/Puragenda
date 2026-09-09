"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function ClaimGiftCard({ token, preview }: { token?: string; preview?: { businessName: string; name: string; value: string } }) {
  const router = useRouter();
  const t = useTranslations("giftCards");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/client-portal/gift-cards/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(token ? { token } : { code }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || t("claimError"));
      setBusy(false);
      return;
    }
    router.replace("/mi-agenda#mis-gift-cards");
    router.refresh();
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#fffaf0] p-5 text-black">
    <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border-4 border-black bg-white p-7 shadow-[9px_9px_0_#000]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-black bg-[#ffb5e8]"><Gift className="h-7 w-7" /></div>
      <div><p className="text-xs font-black uppercase tracking-wider">{t("addToAccount")}</p><h1 className="mt-1 text-3xl font-black">{preview?.name || t("claimTitle")}</h1>{preview && <p className="mt-2 font-bold text-black/60">{preview.businessName} · {preview.value}</p>}</div>
      {!token && <label className="block text-xs font-black">{t("giftCardCode")}<input autoFocus required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="GC-XXXX-XXXX" className="mt-1 h-12 w-full rounded-xl border-2 border-black px-3 font-mono font-black uppercase outline-none focus:shadow-[3px_3px_0_#7c3aed]" /></label>}
      <p className="text-sm font-medium text-black/60">{t("claimHelp")}</p>
      {error && <p role="alert" className="rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
      <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-3 border-black bg-[#7c3aed] font-black text-white shadow-[4px_4px_0_#000] disabled:opacity-50">{busy && <Loader2 className="h-5 w-5 animate-spin" />} {t("addToAccount")}</button>
    </form>
  </main>;
}
