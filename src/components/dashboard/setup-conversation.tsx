"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { SETUP_LABELS, type SetupStep } from "@/core/onboarding";
import { setupProposalSchema, type SetupProposal } from "@/core/setup-proposals";
import type { PuriAnswer } from "@/server/puri/types";
import type { SetupSnapshot } from "@/server/onboarding/service";
import { track } from "@/lib/analytics/client";
import { puriSessionId } from "./puri-session";

const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
type Reply = { question: string; answer: PuriAnswer; revision: number };
export function SetupConversation({ step, snapshot, prepareContext, onApply, onNavigate }: {
  step: SetupStep; snapshot: SetupSnapshot;
  prepareContext: () => Promise<{ revision: number; locationId: string }>;
  onApply: (proposal: SetupProposal, revision: number) => Promise<void>;
  onNavigate: (step: SetupStep) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [pending, setPending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [consumed, setConsumed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const latest = replies.at(-1);
  const proposal = !consumed ? latest?.answer.setup?.proposal : undefined;
  useEffect(() => {
    const focus = (event: Event) => { setExpanded(true); const text = (event as CustomEvent<string>).detail; if (text) setInput(text); requestAnimationFrame(() => inputRef.current?.focus()); };
    window.addEventListener("puri:setup-ask", focus);
    return () => { controller.current?.abort(); window.removeEventListener("puri:setup-ask", focus); };
  }, []);
  async function send(event: FormEvent) {
    event.preventDefault(); if (!input.trim() || sending.current) return;
    sending.current = true; setPending(true); setError(""); setConsumed(false);
    const message = input.trim();
    track("puri_message_sent", { section: "setup" });
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 25000);
    try {
      const state = await prepareContext();
      const response = await fetch("/api/dashboard/puri", { method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.signal,
        body: JSON.stringify({ message, sessionId: puriSessionId(), history: replies.slice(-3).flatMap(r => [{ role: "user", content: r.question }, { role: "assistant", content: r.answer.message }]), context: { pathname: "/dashboard/setup", locale: "es", locationSlug: snapshot.catalog.locations.find(location => location.id === state.locationId)?.slug, setup: { step, ...state } } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? (result.code === "RATE_LIMIT" ? "Puri recibió varias consultas. Puedes seguir con el formulario mientras esperas." : "Puri no está disponible. El editor manual sigue funcionando."));
      if (result.answer?.setup?.proposal) setupProposalSchema.parse(result.answer.setup.proposal);
      setReplies(r => [...r.slice(-3), { question: message, answer: result.answer, revision: state.revision }]); setInput("");
    } catch (e) { setError(e instanceof Error && e.name !== "AbortError" ? e.message : "Puri tardó demasiado o se interrumpió la conexión. Puedes configurar y guardar manualmente."); }
    finally { clearTimeout(timeout); sending.current = false; setPending(false); }
  }
  async function apply() {
    if (!proposal || !latest || applying) return;
    setApplying(true); setError("");
    try { await onApply(proposal, latest.revision); setConsumed(true); track("puri_action_clicked", { action: "setup_proposal" }); }
    catch (e) { setError(e instanceof Error ? e.message : "No pudimos preparar el editor."); }
    finally { setApplying(false); }
  }
  const staffName = (id: string) => snapshot.staff.find(s => s.id === id)?.name ?? "Profesional";
  return <details open={expanded} onToggle={e => setExpanded(e.currentTarget.open)} className="mt-3 min-w-0 rounded-xl border border-[#7C3AED]/25 bg-card text-foreground" data-tour="setup-conversation">
    <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-bold text-brand-foreground">Configurar con Puri</summary>
    <div className="space-y-3 border-t border-border/15 p-3">
      <p className="text-xs leading-relaxed text-muted-foreground">Dime qué necesitas en {SETUP_LABELS[step].toLowerCase()}. Prepararé una propuesta para que la revises.</p>
      {latest && <div className="max-h-52 space-y-2 overflow-y-auto overscroll-contain text-sm" aria-live="polite"><p className="break-words rounded-lg bg-muted/40 p-2 text-xs">{latest.question}</p><p className="break-words leading-relaxed">{latest.answer.message}</p><p className="text-[11px] font-bold text-brand-foreground" data-tour="setup-puri-mode">{latest.answer.setup?.mode === "ai" ? "Preparado con la IA de Puri" : "Modo determinista · sin IA"}</p></div>}
      {proposal && <div className="space-y-2 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-3" data-tour="setup-proposal"><h3 className="text-xs font-black">Propuesta sin guardar</h3><div className="max-h-48 overflow-y-auto text-xs leading-relaxed">
        {proposal.kind === "hours" && <><ul>{proposal.hours.map(h => <li key={h.dayOfWeek}>{days[h.dayOfWeek]}: {h.isOpen ? `${h.startTime}–${h.endTime}${h.breakStart ? ` · pausa ${h.breakStart}–${h.breakEnd}` : ""}` : "cerrado"}</li>)}</ul>{proposal.notes.map(n => <p key={n} className="mt-2 text-muted-foreground">{n}</p>)}</>}
        {proposal.kind === "profile" && <p>{proposal.mode === "team" ? "Equipo" : "Independiente"} · {proposal.industry}{proposal.professionalCount ? ` · ${proposal.professionalCount} profesionales mencionados` : ""}</p>}
        {(proposal.kind === "services" || proposal.kind === "staff") && <ul>{proposal.names.map(n => <li key={n}>{n}</li>)}</ul>}
        {proposal.kind === "staff-hours" && <p>Horario del negocio para {staffName(proposal.staffId)}, en la sucursal seleccionada. Tendrás que confirmar el guardado.</p>}
        {proposal.kind === "assign-service" && <p>Asociar {snapshot.catalog.services.find(s => s.id === proposal.serviceId)?.name} a {staffName(proposal.staffId)}. Tendrás que confirmar la asociación.</p>}
      </div><div className="flex flex-wrap gap-2"><button type="button" disabled={applying || pending} onClick={() => void apply()} className="min-h-11 rounded-lg bg-[#7C3AED] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{applying ? "Preparando…" : "Revisar en el editor"}</button><button type="button" onClick={() => setConsumed(true)} className="min-h-11 px-2 text-xs underline">Descartar</button></div></div>}
      {consumed && <p role="status" className="text-xs text-brand-foreground">Propuesta llevada al editor. Revisa los campos y confirma con el botón de guardar.</p>}
      {latest?.answer.setup?.nextStep && <button type="button" onClick={() => void onNavigate(latest.answer.setup!.nextStep!)} className="min-h-11 text-xs font-bold text-brand-foreground underline">Ir a {SETUP_LABELS[latest.answer.setup.nextStep]}</button>}
      {latest?.answer.guides?.map(g => <Link key={g.id} href={g.href} className="block min-h-11 py-2 text-xs font-bold text-brand-foreground underline">{g.title}</Link>)}
      {error && <p role="alert" className="break-words text-xs leading-relaxed text-red-700 dark:text-red-300">{error}</p>}
      <form onSubmit={send} className="space-y-2"><textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} aria-label="Escribir a Puri sobre este paso" placeholder={step === "hours" ? "Lunes a viernes de 9 a 19, pausa de 13 a 14…" : step === "services" ? "Ofrezco esmaltado permanente, kapping…" : "Cuéntame qué quieres configurar…"} rows={2} maxLength={2000} className="min-h-20 w-full resize-y rounded-lg border border-border/40 bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]" /><button disabled={pending || !input.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border/30 bg-card px-3 py-2 text-xs font-bold disabled:opacity-50">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{pending ? "Puri está preparando…" : "Enviar a Puri"}</button></form>
    </div>
  </details>;
}
