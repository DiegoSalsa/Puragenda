"use client";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400"><LocalizedText id="2N2Hj7FDWekj" /></span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span><LocalizedText id="Odzxy-ta29CE" /></span>
        </>
      )}
    </button>
  );
}
