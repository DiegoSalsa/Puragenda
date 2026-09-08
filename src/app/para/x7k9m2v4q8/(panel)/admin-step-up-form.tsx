"use client";

import { FormEvent, useState } from "react";
import { Loader2, ShieldCheck } from "@/components/icons/hover-icons";

export function AdminStepUpForm({ onVerified }: { onVerified: () => void | Promise<void> }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  async function requestCode() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/admin-code/step-up/request", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No fue posible enviar el código");
      setRequested(true);
      setMessage(data.message || "Enviamos un código de 6 dígitos a tu correo.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No fue posible enviar el código");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/admin-code/step-up/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Código inválido o vencido");
        return;
      }
      await onVerified();
    } finally {
      setLoading(false);
    }
  }

  if (!requested) {
    return (
      <div className="space-y-2 border-2 border-black bg-[#FFF5BA] p-3">
        <p className="text-xs font-bold text-black">Confirma tu identidad para continuar con esta acción.</p>
        {error && <p className="text-xs font-bold text-red-700">{error}</p>}
        <button
          type="button"
          onClick={requestCode}
          disabled={loading}
          className="border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase text-[#B28DFF] disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar código"}
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-2 border-2 border-black bg-[#FFF5BA] p-3" onSubmit={handleSubmit}>
      <p className="text-xs font-bold text-black">{message}</p>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        required
        autoFocus
        autoComplete="one-time-code"
        className="w-full border-2 border-black bg-white px-3 py-2 text-center font-mono text-lg font-black tracking-[0.3em]"
      />
      {error && <p className="text-xs font-bold text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="flex items-center gap-1 border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase text-[#B28DFF] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
        Confirmar
      </button>
    </form>
  );
}
