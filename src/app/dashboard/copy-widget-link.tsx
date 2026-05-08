"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, Check, Copy } from "lucide-react";

export function CopyWidgetLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    // We use window.location.origin to get the current domain dynamically (e.g. https://www.puragenda.cl)
    setUrl(`${window.location.origin}/widget/${slug}`);
  }, [slug]);

  function handleCopy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!url) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 sm:pl-4 shadow-sm">
      <div className="hidden sm:flex items-center gap-2 mr-2">
        <LinkIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Link de reservas:</span>
      </div>
      <div className="flex-1 truncate rounded-lg bg-muted/50 px-3 py-1.5 text-sm font-mono text-muted-foreground select-all w-32 sm:w-48">
        {url.replace(/^https?:\/\//, '')}
      </div>
      <button
        onClick={handleCopy}
        className={`flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-all ${
          copied
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-[#7C3AED] text-white hover:bg-[#5B21B6]"
        }`}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar link"}</span>
      </button>
    </div>
  );
}
