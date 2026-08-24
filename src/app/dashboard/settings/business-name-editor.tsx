"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { Loader2, Save } from "@/components/icons/hover-icons";
import { updateBusinessNameAction } from "@/server/actions/dashboard.actions";
import { useRouter } from "next/navigation";

export function BusinessNameEditor({ initialName }: { initialName: string }) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    if (!name.trim() || name.trim() === initialName) return;
    setSaving(true);
    setMessage(null);

    const result = await updateBusinessNameAction(name);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Nombre actualizado" });
      router.refresh();
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={legacy("9k41vzFeu33A")}
          className="flex-1 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm min-h-[44px] outline-none transition-colors focus:border-[#7C3AED]/30"
        />
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || name.trim() === initialName}
          className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 h-11 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <LocalizedText id="E-UaIQ9F7RsJ" />
        </button>
      </div>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        <LocalizedText id="dbDW2mPQOKHh" />
      </p>
    </div>
  );
}
