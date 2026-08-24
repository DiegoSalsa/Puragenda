"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useTransition } from "react";
import { Check, Loader2, Package } from "@/components/icons/hover-icons";
import { updateProductionOrdersEnabledAction } from "@/server/actions/dashboard.actions";

export function ProductionOrdersConfig({ initialEnabled }: { initialEnabled: boolean }) {
  const legacy = useTranslations("legacy");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setMessage("");
    startTransition(async () => {
      const result = await updateProductionOrdersEnabledAction(next);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setEnabled(next);
      setMessage(next ? "Encargos activados." : legacy("D95pTLweLoWR"));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-medium"><LocalizedText id="jJJgIeeqe7wC" /></p>
          <p className="mt-1 text-sm text-muted-foreground">
            <LocalizedText id="isKuGZznbG5s" />
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={isPending}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-[#7C3AED]" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand-foreground shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : enabled ? <Check className="h-3 w-3" /> : null}
          </span>
        </button>
      </div>
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
        enabled ? "bg-[#7C3AED]/10 text-brand-foreground" : "bg-muted text-muted-foreground"
      }`}>
        <Package className="h-4 w-4" />
        {enabled ? legacy("ZiOX93MdX8xq") : legacy("r3FLqdwngsPY")}
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
