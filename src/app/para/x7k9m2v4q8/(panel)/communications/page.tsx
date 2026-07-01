"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, AtSign, CheckCircle2, FileText, Mail, Send, Users } from "lucide-react";
import { sendMassEmailAction } from "@/server/actions/admin.actions";

type Segment = "ALL" | "TRIALING" | "ACTIVE" | "CANCELLED";
type RecipientMode = "SEGMENT" | "SINGLE_EMAIL";
type TemplateKey = "blank" | "satisfaction" | "referral" | "activeReminder";

const SEGMENTS: { value: Segment; label: string; bg: string }[] = [
  { value: "ALL", label: "Todos los negocios", bg: "bg-[#85E3FF]" },
  { value: "TRIALING", label: "Solo en trial", bg: "bg-[#FFF5BA]" },
  { value: "ACTIVE", label: "Cuentas activas", bg: "bg-[#BFFCC6]" },
  { value: "CANCELLED", label: "Cancelados", bg: "bg-[#FFB5E8]" },
];

const TEMPLATES: { key: TemplateKey; label: string; subject: string; body: string }[] = [
  {
    key: "blank",
    label: "Libre",
    subject: "",
    body: "",
  },
  {
    key: "satisfaction",
    label: "Encuesta",
    subject: "Queremos conocer tu experiencia con Puragenda",
    body: `Queremos saber como ha sido tu experiencia usando Puragenda en {{negocio}}.

Tu opinion nos ayuda a mejorar el producto y priorizar lo que realmente necesitan los negocios.

Puedes responder este mismo correo con una nota del 1 al 7 y cualquier comentario que quieras dejarnos.`,
  },
  {
    key: "referral",
    label: "Referidos",
    subject: "{{negocio}}: recuerda compartir tu codigo {{codigoReferido}}",
    body: `Tu codigo de referido es: <strong>{{codigoReferido}}</strong>

Recuerda referir Puragenda a otros negocios para obtener descuentos y beneficios en tu cuenta.

Cuando alguien se registre, debe ingresar tu codigo de negocio en el formulario de registro:
{{linkRegistro}}

Gracias por ayudarnos a crecer.`,
  },
  {
    key: "activeReminder",
    label: "Activas",
    subject: "Novedades para tu cuenta activa de Puragenda",
    body: `Tu cuenta de {{negocio}} esta activa.

Te dejamos a mano tu codigo de referido: <strong>{{codigoReferido}}</strong>

Recuerda referir Puragenda para obtener descuentos. Tambien puedes compartir tu pagina de reservas:
{{linkWidget}}`,
  },
];

const TOKENS = ["{{nombre}}", "{{email}}", "{{negocio}}", "{{codigoReferido}}", "{{linkWidget}}", "{{linkRegistro}}"];

export default function CommunicationsPage() {
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("SEGMENT");
  const [segment, setSegment] = useState<Segment>("ALL");
  const [targetEmail, setTargetEmail] = useState("");
  const [templateKey, setTemplateKey] = useState<TemplateKey>("blank");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSegment = SEGMENTS.find((s) => s.value === segment) ?? SEGMENTS[0];

  function applyTemplate(key: TemplateKey) {
    const template = TEMPLATES.find((item) => item.key === key);
    if (!template) return;
    setTemplateKey(key);
    setSubject(template.subject);
    setBody(template.body);
  }

  function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setError("El asunto y el cuerpo son obligatorios.");
      return;
    }

    if (recipientMode === "SINGLE_EMAIL" && !targetEmail.trim()) {
      setError("Ingresa el correo de destino.");
      return;
    }

    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await sendMassEmailAction({
        recipientMode,
        segment,
        targetEmail,
        subject,
        body,
      });

      if (res.success) {
        setResult({ sent: res.sent!, failed: res.failed!, total: res.total! });
        if (recipientMode === "SINGLE_EMAIL") setTargetEmail("");
      } else {
        setError(res.error ?? "Error al enviar");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-black">Comunicaciones</h1>
        <p className="text-sm font-bold text-black/50">Envio de emails por segmento, cuenta activa o correo puntual</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] space-y-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/60">Destinatarios</p>

            <div className="flex flex-wrap gap-3">
              {[
                { value: "SEGMENT" as const, label: "Segmento", icon: Users },
                { value: "SINGLE_EMAIL" as const, label: "Correo puntual", icon: AtSign },
              ].map((option) => {
                const Icon = option.icon;
                const active = recipientMode === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setRecipientMode(option.value)}
                    className={`flex items-center gap-2 border-4 border-black px-4 py-2 text-sm font-black uppercase transition-all ${
                      active
                        ? "translate-x-[3px] translate-y-[3px] bg-[#B28DFF] shadow-none"
                        : "bg-white shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            {recipientMode === "SEGMENT" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {SEGMENTS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSegment(s.value)}
                      className={`border-4 border-black px-4 py-2 text-sm font-black uppercase transition-all ${
                        segment === s.value
                          ? `${s.bg} translate-x-[3px] translate-y-[3px] shadow-none`
                          : "bg-white shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className={`border-4 border-black p-3 ${selectedSegment.bg}`}>
                  <p className="text-xs font-black uppercase text-black/70">
                    Enviando a: <span className="text-black">{selectedSegment.label}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-black/60">Email destino</label>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(event) => setTargetEmail(event.target.value)}
                  placeholder="persona@dominio.com"
                  className="w-full border-4 border-black bg-white px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 focus:border-[#B28DFF] focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-black/60">Redactar</p>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-black/60">Asunto</label>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ej: Novedades de Puragenda"
                className="w-full border-4 border-black bg-white px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 focus:border-[#B28DFF] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-black/60">Mensaje</label>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                placeholder="Redacta el contenido del email..."
                className="w-full resize-y border-4 border-black bg-white px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 focus:border-[#B28DFF] focus:outline-none"
              />
              <p className="text-xs font-bold text-black/40">Acepta HTML basico y variables dinamicas.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 border-4 border-black bg-[#FFB5E8] p-3">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="text-sm font-bold text-black">{error}</p>
              </div>
            )}

            <button
              disabled={isPending || !subject.trim() || !body.trim() || (recipientMode === "SINGLE_EMAIL" && !targetEmail.trim())}
              onClick={handleSend}
              className="flex items-center gap-2 border-4 border-black bg-[#B28DFF] px-6 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:pointer-events-none disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              {isPending ? "Enviando..." : "Enviar ahora"}
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000] space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <p className="text-xs font-black uppercase tracking-widest text-black/60">Plantillas</p>
            </div>

            <div className="grid gap-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  onClick={() => applyTemplate(template.key)}
                  className={`border-4 border-black px-4 py-3 text-left text-sm font-black uppercase transition-all ${
                    templateKey === template.key
                      ? "translate-x-[3px] translate-y-[3px] bg-[#85E3FF] shadow-none"
                      : "bg-white shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]"
                  }`}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-4 border-black bg-[#FFF5BA] p-5 shadow-[6px_6px_0_#000] space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-black/60">Variables</p>
            <div className="flex flex-wrap gap-2">
              {TOKENS.map((token) => (
                <span key={token} className="border-2 border-black bg-white px-2 py-1 font-mono text-[11px] font-black text-black">
                  {token}
                </span>
              ))}
            </div>
          </div>

          <div className="border-4 border-black bg-[#BFFCC6] p-5 shadow-[6px_6px_0_#000]">
            <div className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-bold text-black/70">
                Los correos usan Resend. En local, si no hay API key, quedan registrados como mock en consola.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {result && (
        <div className="border-4 border-black bg-[#BFFCC6] p-6 shadow-[6px_6px_0_#000]">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-black uppercase">Envio completado</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
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
    </div>
  );
}
