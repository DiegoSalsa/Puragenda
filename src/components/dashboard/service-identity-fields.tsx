"use client";
import { useTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";

/** The catalog and Setup share these fields and the server serviceSchema. */
export function ServiceIdentityFields({ name, description, onChange, field = "name" }: { name: string; description: string; onChange: (value: { name?: string; description?: string }) => void; field?: "name" | "description" }) {
  const legacy = useTranslations("legacy");
  return <label className="grid gap-1.5 text-sm text-muted-foreground">
    <span><LocalizedText id={field === "name" ? "ViuxV1eotZPW" : "xAYlrZz8MTts"} /></span>
    {field === "name" ? <input aria-label="Nombre del servicio" value={name} onChange={e => onChange({ name: e.target.value })} placeholder={legacy("JlT8wJtHHSkO")} required maxLength={100} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]" />
      : <textarea aria-label="Descripción del servicio" value={description} onChange={e => onChange({ description: e.target.value })} placeholder={legacy("c9HBi_6jNlD5")} rows={3} maxLength={2000} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]" />}
  </label>;
}
