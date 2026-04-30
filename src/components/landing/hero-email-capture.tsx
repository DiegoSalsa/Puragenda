"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Mail } from "lucide-react";

export function HeroEmailCapture() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    router.push(`/register?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 mt-6"
    >
      <div 
        className={`relative flex w-full flex-col sm:flex-row items-center justify-between rounded-2xl sm:rounded-full bg-card/60 p-1.5 backdrop-blur-xl transition-all duration-500 ease-out border shadow-2xl ${
          isFocused 
            ? "border-[#7C3AED]/50 shadow-[#7C3AED]/20 ring-4 ring-[#7C3AED]/10 bg-card" 
            : "border-border/50 shadow-black/5 hover:border-[#7C3AED]/30"
        }`}
      >
        {/* Glow effect behind the input */}
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-[#7C3AED]/10 via-transparent to-[#A78BFA]/10 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
        
        <div className="relative flex w-full flex-1 items-center px-4 py-2 sm:py-0">
          <Mail className={`mr-3 h-5 w-5 transition-colors duration-300 ${isFocused ? "text-[#7C3AED]" : "text-muted-foreground/60"}`} />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ingresa tu correo para probar gratis..."
            aria-label="Correo electrónico para registro"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="group relative mt-2 flex w-full sm:w-auto items-center justify-center gap-2 overflow-hidden rounded-xl sm:rounded-full bg-[#7C3AED] px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#6D28D9] disabled:opacity-70 sm:mt-0 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]"
        >
          {/* Button inner gleam */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
          
          <span className="relative z-10 flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Empezar Ahora <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
          </span>
        </button>
      </div>
    </form>
  );
}
