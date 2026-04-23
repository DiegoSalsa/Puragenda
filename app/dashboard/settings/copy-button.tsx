"use client";

import { useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="border-border/50 gap-1.5 shrink-0"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-xs">Copiado</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span className="text-xs">Copiar</span>
        </>
      )}
    </Button>
  );
}
