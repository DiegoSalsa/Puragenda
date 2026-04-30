"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

export function HeroEmailCapture() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    router.push(`/register?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        aria-label="Correo electrónico para registro"
        className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-[#7C3AED]/40 focus:ring-1 focus:ring-[#7C3AED]/20 transition-all"
      />
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-[#7C3AED]/20 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/30 disabled:opacity-60 animate-pulse-glow"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Empieza Gratis <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
