"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff } from "@/components/icons/hover-icons";

export function SecretField({ value, label = "secreto" }: { value: string; label?: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row">
      <div className="flex min-w-0 flex-1 items-center rounded-xl border border-border bg-muted px-4 py-2.5 font-mono text-sm">
        <span className={`min-w-0 flex-1 truncate ${visible ? "select-all" : "select-none tracking-[0.2em]"}`}>
          {visible ? value : "•".repeat(Math.min(32, Math.max(16, value.length)))}
        </span>
        <button type="button" onClick={() => setVisible((current) => !current)} className="ml-3 rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label}`} title={`${visible ? "Ocultar" : "Mostrar"} ${label}`}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <button type="button" onClick={copy} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiada" : "Copiar"}
      </button>
    </div>
  );
}
