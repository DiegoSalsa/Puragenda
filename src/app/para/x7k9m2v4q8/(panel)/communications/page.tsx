"use client";

import { useState, useTransition } from "react";
import { Mail, Send, Users, CheckCircle2, AlertTriangle } from "lucide-react";
import { sendMassEmailAction } from "@/server/actions/admin.actions";

type Segment = "ALL" | "TRIALING" | "ACTIVE" | "CANCELLED";

const SEGMENTS: { value: Segment; label: string; bg: string }[] = [
  { value: "ALL", label: "Todos los usuarios", bg: "bg-[#85E3FF]" },
  { value: "TRIALING", label: "Solo en Trial", bg: "bg-[#FFF5BA]" },
  { value: "ACTIVE", label: "Solo Activos", bg: "bg-[#BFFCC6]" },
  { value: "CANCELLED", label: "Solo Cancelados", bg: "bg-[#FFB5E8]" },
];

export default function CommunicationsPage() {
  const [segment, setSegment] = useState<Segment>("ALL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setError("El asunto y el cuerpo son obligatorios.");
      return;
    }
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await sendMassEmailAction({ segment, subject, body });
      if (res.success) {
        setResult({ sent: res.sent!, failed: res.failed!, total: res.total! });
        setSubject("");
        setBody("");
      } else {
        setError(res.error ?? "Error al enviar");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-black">Comunicaciones</h1>
        <p className="text-sm font-bold text-black/50">Envio masivo de emails a segmentos</p>
      </div>

      {/* Segment selector */}
      <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] space-y-4">
        <p className="text-xs font-black uppercase tracking-widest text-black/60">Segmento</p>
        <div className="flex flex-wrap gap-3">
          {SEGMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSegment(s.value)}
              className={`border-4 border-black px-4 py-2 text-sm font-black uppercase transition-all ${
                segment === s.value
                  ? `${s.bg} shadow-none translate-x-[3px] translate-y-[3px]`
                  : "bg-white shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]"
              }`}
            >
              <Users className="inline h-3.5 w-3.5 mr-1.5" />
              {s.label}
            </button>
          ))}
        </div>

        <div className={`border-4 border-black p-3 ${SEGMENTS.find((s) => s.value === segment)?.bg}`}>
          <p className="text-xs font-black uppercase text-black/70">
            Enviando a: <span className="text-black">{SEGMENTS.find((s) => s.value === segment)?.label}</span>
          </p>
        </div>
      </div>

      {/* Compose */}
      <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] space-y-4">
        <p className="text-xs font-black uppercase tracking-widest text-black/60">Redactar</p>

        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-black/60">Asunto</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: Novedades de Puragenda"
            className="w-full border-4 border-black bg-white px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 focus:outline-none focus:border-[#B28DFF]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-black/60">Mensaje</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Redacta el contenido del email..."
            className="w-full border-4 border-black bg-white px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 focus:outline-none focus:border-[#B28DFF] resize-y"
          />
          <p className="text-xs font-bold text-black/40">Puedes usar HTML basico en el cuerpo del mensaje.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 border-4 border-black bg-[#FFB5E8] p-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-bold text-black">{error}</p>
          </div>
        )}

        <button
          disabled={isPending || !subject.trim() || !body.trim()}
          onClick={handleSend}
          className="flex items-center gap-2 border-4 border-black bg-[#B28DFF] px-6 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <Send className="h-4 w-4" />
          {isPending ? "Enviando..." : "Enviar ahora"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="border-4 border-black bg-[#BFFCC6] p-6 shadow-[6px_6px_0_#000]">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-black uppercase">Envio completado</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: result.total, bg: "bg-white" },
              { label: "Enviados", value: result.sent, bg: "bg-[#BFFCC6]" },
              { label: "Fallidos", value: result.failed, bg: result.failed > 0 ? "bg-[#FFB5E8]" : "bg-white" },
            ].map((s) => (
              <div key={s.label} className={`border-4 border-black ${s.bg} p-4 text-center`}>
                <p className="text-xs font-black uppercase text-black/60">{s.label}</p>
                <p className="text-3xl font-black text-black">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="border-4 border-black bg-[#FFF5BA] p-4 shadow-[4px_4px_0_#000]">
        <div className="flex gap-2">
          <Mail className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black uppercase text-black mb-1">Importante</p>
            <p className="text-xs font-bold text-black/70">
              Los emails se envian desde la cuenta configurada en Resend. Usa esta herramienta con responsabilidad para no generar spam y mantener la reputacion del dominio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
