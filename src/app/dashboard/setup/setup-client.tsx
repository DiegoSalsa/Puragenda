"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Loader2 } from "lucide-react";
import { PuriMascot } from "@/components/brand/puri-mascot";
import { BusinessHoursEditor } from "@/app/dashboard/settings/business-hours-editor";
import { SetupConversation } from "@/components/dashboard/setup-conversation";
import type { SetupProposal } from "@/core/setup-proposals";
import { ServiceIdentityFields } from "@/components/dashboard/service-identity-fields";
import { defaultSetupHours, SETUP_LABELS, setupTransition, type SetupHours, type SetupStep } from "@/core/onboarding";
import { track } from "@/lib/analytics/client";
import type { SetupCommand, SetupSnapshot } from "@/server/onboarding/service";

const inputClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]";
const buttonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 disabled:opacity-50";
const buttonClass = `${buttonBase} border-border bg-card`;
const primaryClass = `${buttonBase} border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#6D28D9]`;
const guide: Record<SetupStep, { title: string; text: string }> = {
  business: { title: "Tu negocio, a tu manera.", text: "Ya tengo los datos de tu registro. Cuéntame cómo trabajas y prepararemos solo lo que necesitas para recibir reservas." },
  hours: { title: "Hagamos espacio en tu agenda.", text: "Estos son los horarios del negocio. Revisa los días y añade tus pausas. Nada cambia hasta que guardes." },
  staff: { title: "Cada persona, su disponibilidad.", text: "Tu perfil ya está aquí. Reutilicémoslo. Puedes agregar al equipo dentro de la capacidad de tu plan y confirmar sus horarios." },
  services: { title: "¿Qué podrán reservar contigo?", text: "Ponle nombre a tu servicio y define su duración y precio. Tú decides estos valores; yo te ayudo a comprobar que se pueda reservar." },
  check: { title: "Probemos tu agenda de verdad.", text: "Voy a consultar el mismo motor de disponibilidad que usa tu enlace público. Esta prueba no crea reservas ni genera cobros." },
};
type ServiceDraft = { name: string; description: string; duration: string; price: string; staffIds: string[]; suggestedNames?: string[] };

export function SetupClient({ initial }: { initial: SetupSnapshot }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const latest = useRef(initial);
  const [step, setStep] = useState<SetupStep>((initial.currentStep in SETUP_LABELS ? initial.currentStep : initial.progress.next) as SetupStep);
  const [profile, setProfile] = useState({ mode: initial.mode ?? "", industry: initial.industry, ...(initial.draft.business as object ?? {}) });
  const [staffDraft, setStaffDraft] = useState<{ name: string; email: string; suggestedNames?: string[] }>({ name: "", email: "", ...(initial.draft.staff as object ?? {}) });
  const [service, setService] = useState<ServiceDraft>({ name: "", description: "", duration: "", price: "", staffIds: initial.staff.map(s => s.id), ...(initial.draft.services as Partial<ServiceDraft> ?? {}) });
  const [locationId, setLocationId] = useState((initial.draft.hours as { locationId?: string } | undefined)?.locationId ?? initial.catalog.locations[0]?.id ?? "");
  const [hourDraft, setHourDraft] = useState<{ locationId: string; hours: SetupHours } | null>(initial.draft.hours as { locationId: string; hours: SetupHours } ?? null);
  const [probeService, setProbeService] = useState(initial.verification?.serviceId ?? initial.catalog.services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [copied, setCopied] = useState(false);
  const [finished, setFinished] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [repair, setRepair] = useState<Extract<SetupProposal, { kind: "staff-hours" | "assign-service" }> | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const dirty = useRef(false);
  const retries = useRef(new Map<string, string>());
  const pendingDraft = useRef("");
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opened = useRef(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => { const frame = requestAnimationFrame(() => setOrigin(window.location.origin)); return () => cancelAnimationFrame(frame); }, []);
  const progress = snapshot.progress;

  const mutate = useCallback((command: SetupCommand): Promise<SetupSnapshot> => {
    const run = async () => {
      setBusy(true); setError(""); setSaveStatus("Guardando…");
      const signature = JSON.stringify(command);
      const key = retries.current.get(signature) ?? crypto.randomUUID();
      retries.current.set(signature, key);
      try {
        const response = await fetch("/api/dashboard/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, revision: latest.current.revision, command }) });
        const result = await response.json();
        if (!response.ok) { setConflict(response.status === 409); throw new Error(result.error ?? "No pudimos guardar."); }
        if (command.type === "draft" && pendingDraft.current === JSON.stringify({ step: command.step, value: command.value })) dirty.current = false;
        retries.current.delete(signature); latest.current = result; setSnapshot(result); setSaveStatus(command.type === "draft" ? "Borrador guardado · falta confirmar" : "Guardado en tu negocio");
        return result as SetupSnapshot;
      } catch (e) { setError(e instanceof Error ? e.message : "No hay conexión. Tus cambios siguen en esta página."); setSaveStatus("Cambios sin guardar"); throw e; }
      finally { setBusy(false); }
    };
    const next = queue.current.then(run, run); queue.current = next.catch(() => undefined); return next;
  }, []);
  const draftValue = step === "business" ? profile : step === "staff" ? staffDraft : step === "services" ? service : step === "hours" ? hourDraft : null;
  useEffect(() => {
    pendingDraft.current = JSON.stringify({ step, value: draftValue });
    if (!dirty.current || !draftValue) return;
    const timer = setTimeout(() => { if (dirty.current) void mutate({ type: "draft", step, value: draftValue }).catch(() => undefined); }, 800);
    draftTimer.current = timer;
    return () => clearTimeout(timer);
  }, [draftValue, step, mutate]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [initial.revision]);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track(initial.revision === 0 ? "onboarding_started" : "onboarding_resumed", { version: 2 });
    if (!initial.started || initial.paused) void mutate({ type: "resume" }).catch(() => undefined);
  }, [initial.started, initial.paused, initial.revision, mutate]);

  async function saveDraft() {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    await queue.current;
    const d = { step, value: draftValue };
    if (dirty.current && d.value) await mutate({ type: "draft", step: d.step, value: d.value });
    dirty.current = false;
  }
  async function navigate(next: SetupStep) {
    try { await saveDraft(); await mutate({ type: "navigate", step: next }); setStep(next); setError(""); } catch { /* visible error */ }
  }
  async function nextStep() { if (step === "hours" && unsavedHours) { setError("Guarda los horarios que editaste antes de continuar, o vuelve para revisarlos más tarde."); return; } await navigate(setupTransition(step, "next", { ...snapshot.facts, mode: profile.mode || null })); }
  async function exit() { try { await saveDraft(); await mutate({ type: "pause" }); track("onboarding_paused", { step, version: 2 }); router.push("/dashboard"); router.refresh(); } catch { /* visible error */ } }
  async function saveProfile(e: FormEvent) {
    e.preventDefault(); if (profile.mode !== "solo" && profile.mode !== "team") return;
    try { await saveDraft(); await mutate({ type: "profile", mode: profile.mode, industry: profile.industry }); dirty.current = false; track("onboarding_step_completed", { step, version: 2 }); setStep("hours"); } catch { /* visible error */ }
  }
  async function addStaff(e: FormEvent) {
    e.preventDefault(); try { await saveDraft(); const result = await mutate({ type: "staff", ...staffDraft, locationIds: [locationId] }); dirty.current = false; setStaffDraft({ name: "", email: "", ...(result.draft.staff as object ?? {}) }); setService(s => ({ ...s, staffIds: result.staff.map(p => p.id) })); } catch { /* visible error */ }
  }
  async function addService(e: FormEvent) {
    e.preventDefault(); try { await saveDraft(); const result = await mutate({ type: "service", ...service, duration: Number(service.duration), price: Number(service.price) }); dirty.current = false; setService(s => ({ ...s, name: "", description: "", duration: "", price: "", suggestedNames: [], ...(result.draft.services as object ?? {}) })); setProbeService(result.catalog.services.at(-1)?.id ?? ""); track("onboarding_step_completed", { step: "services", version: 2 }); } catch { /* visible error */ }
  }
  async function check() {
    try { setSelectedSlot(""); const result = await mutate({ type: "check", serviceId: probeService || snapshot.catalog.services[0]?.id || "", locationId, ...(date ? { date } : {}), optionIds }); if (result.verified) track("onboarding_agenda_ready", { version: 2 }); } catch { /* visible error */ }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}${snapshot.publicPath}`); setCopied(true); await mutate({ type: "share" }); track("onboarding_link_copied", { version: 2 }); } catch { setError("No pudimos copiar automáticamente. Puedes seleccionar y copiar el enlace."); }
  }
  async function finish() {
    try { await saveDraft(); await mutate({ type: "finish" }); setFinished(true); } catch { /* visible error */ }
  }
  async function prepareContext() {
    await saveDraft();
    return { revision: latest.current.revision, locationId };
  }
  async function applyProposal(proposal: SetupProposal, revision: number) {
    await saveDraft();
    if (latest.current.revision !== revision) throw new Error("La configuración cambió desde que preparé la propuesta. Pídeme una nueva para conservar tus últimos cambios.");
    dirty.current = true;
    if (proposal.kind === "profile") {
      const value = { mode: proposal.mode, industry: proposal.industry }; setProfile(value);
      await mutate({ type: "draft", step: "business", value });
    } else if (proposal.kind === "hours") {
      const value = { locationId, hours: proposal.hours }; setHourDraft(value); setEditorVersion(v => v + 1);
      await mutate({ type: "draft", step: "hours", value });
    } else if (proposal.kind === "services") {
      const value = { ...service, name: proposal.names[0], description: "", duration: "", price: "", suggestedNames: proposal.names }; setService(value);
      await mutate({ type: "draft", step: "services", value });
    } else if (proposal.kind === "staff") {
      const value = { name: proposal.names[0], email: "", suggestedNames: proposal.names }; setStaffDraft(value);
      await mutate({ type: "draft", step: "staff", value });
    } else { dirty.current = false; setRepair(proposal); }
    requestAnimationFrame(() => document.querySelector("[data-tour='setup-editor']")?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }
  async function confirmRepair() {
    if (!repair) return;
    try { await mutate(repair.kind === "staff-hours" ? { type: "staff-hours", staffId: repair.staffId, locationId: repair.locationId, hours: repair.hours } : { type: "assign-service", staffId: repair.staffId, serviceId: repair.serviceId }); setRepair(null); setSaveStatus("Corrección guardada. Vuelve a comprobar la disponibilidad."); } catch { /* visible error */ }
  }
  const onHoursDraft = useCallback((hours: SetupHours) => { dirty.current = true; setHourDraft({ locationId, hours }); }, [locationId]);
  const location = snapshot.locations.find(l => l.id === locationId);
  const sourceHours = location?.hours.length ? defaultSetupHours().map(h => ({ ...h, ...location.hours.find(x => x.dayOfWeek === h.dayOfWeek) })) : defaultSetupHours();
  const normalizedHours = (hours: SetupHours) => JSON.stringify(hours.map(h => [h.dayOfWeek, h.startTime, h.endTime, h.isOpen, h.breakStart || null, h.breakEnd || null]).sort((a, b) => Number(a[0]) - Number(b[0])));
  const unsavedHours = !!hourDraft && hourDraft.locationId === locationId && normalizedHours(hourDraft.hours) !== normalizedHours(sourceHours);
  const currentService = snapshot.catalog.services.find(s => s.id === (probeService || snapshot.catalog.services[0]?.id));
  const personalName = initial.userName.split(" ")[0];
  const self = snapshot.staff.find(s => s.id === snapshot.selfStaffId) ?? (snapshot.staff.length === 1 ? snapshot.staff[0] : null);

  return <div className="mx-auto max-w-6xl pb-24" data-tour="puri-setup">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-border/20 pb-5">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-foreground">Puri Setup · {snapshot.business.name}</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{finished ? "Tu agenda está lista." : `Empecemos${personalName ? `, ${personalName}` : ""}.`}</h1></div>
      <button type="button" onClick={() => void exit()} disabled={busy} className={buttonClass}>Guardar y salir</button>
    </header>
    <nav aria-label="Pasos de configuración" className="mb-7 flex gap-2 overflow-x-auto pb-2">
      {progress.steps.map((s, index) => <button key={s} type="button" aria-current={step === s ? "step" : undefined} onClick={() => void navigate(s)} disabled={busy} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${step === s ? "border-[#7C3AED] bg-[#7C3AED] text-white" : "border-border/25 bg-card"}`}><span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10">{progress.completed.includes(s) ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>{SETUP_LABELS[s]}</button>)}
    </nav>
    <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] xl:gap-10">
      <aside className="flex gap-3 lg:sticky lg:top-6 lg:block">
        <PuriMascot variant={finished ? "greeting" : "default"} compact className="h-16 w-16 shrink-0 lg:h-36 lg:w-36" />
        <div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-foreground">Puri</p><h2 className="text-lg font-black leading-tight">{finished ? "¡Ya puedes recibir reservas!" : guide[step].title}</h2><p className="mt-2 hidden text-sm leading-relaxed text-muted-foreground lg:block">{finished ? "Comparte tu enlace cuando quieras. Si necesitas ayuda después, estaré en tu dashboard." : guide[step].text}</p><details className="mt-2 text-sm lg:hidden"><summary className="min-h-11 cursor-pointer py-2 font-bold text-brand-foreground">Consejo de Puri</summary><p className="leading-relaxed text-muted-foreground">{finished ? "Comparte tu enlace cuando quieras. Seguiré acompañándote desde el dashboard." : guide[step].text}</p></details><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("puri:ask", { detail: "" }))} className="mt-1 min-h-11 text-sm font-bold text-brand-foreground underline underline-offset-4 lg:mt-3">Pedir ayuda a Puri</button><SetupConversation key={step} step={step} snapshot={snapshot} prepareContext={prepareContext} onApply={applyProposal} onNavigate={navigate} /></div>
      </aside>
      <section data-tour="setup-editor" aria-label={SETUP_LABELS[step]} className="min-w-0 rounded-2xl border border-border/30 bg-card p-4 shadow-[3px_3px_0_rgba(0,0,0,0.08)] sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-2"><h2 className="text-xl font-black">{finished ? "Todo preparado" : SETUP_LABELS[step]}</h2><span role="status" aria-live="polite" className="text-right text-xs text-muted-foreground">{saveStatus}</span></div>
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-500 bg-red-50 p-3 text-sm text-red-900">{error}{conflict && <button type="button" onClick={() => window.location.reload()} className="ml-2 min-h-11 font-bold underline">Recargar datos</button>}</div>}
        {finished ? <div className="space-y-5"><div className="rounded-xl bg-[#E9D8FF] p-5 text-black"><Check className="mb-2 h-7 w-7" /><p className="font-bold">Comprobamos horarios disponibles para tu agenda.</p><p className="mt-1 text-sm">La prueba no creó ninguna reserva. Tu catálogo y horarios quedaron guardados.</p></div><Link href="/dashboard" className={primaryClass}>Ir a Hoy <ChevronRight className="h-4 w-4" /></Link><p className="text-sm text-muted-foreground">Más adelante puedes configurar {snapshot.optional.website ? "tu sitio web, " : ""}pagos, personalización y otras herramientas desde sus módulos.</p></div> : <>
        {step === "business" && <form onSubmit={saveProfile} className="space-y-5"><p className="text-sm text-muted-foreground">Usaremos <strong className="text-foreground">{snapshot.business.name}</strong>, {snapshot.business.currency} y la zona horaria {snapshot.business.timezone} de tu registro.</p><fieldset><legend className="mb-3 text-sm font-bold">¿Cómo trabajas?</legend><div className="grid gap-3 sm:grid-cols-2">{[["solo", "Trabajo de forma independiente", "Usaremos tu perfil profesional."], ["team", "Tengo un equipo", "Revisaremos personas y horarios."]].map(([value, title, body]) => <label key={value} className={`cursor-pointer rounded-xl border p-4 ${profile.mode === value ? "border-[#7C3AED] bg-[#7C3AED]/5 ring-1 ring-[#7C3AED]" : "border-border/30"}`}><input type="radio" name="mode" value={value} checked={profile.mode === value} onChange={() => { dirty.current = true; setProfile(p => ({ ...p, mode: value })); }} className="mr-2 accent-[#7C3AED]" /><span className="text-sm font-bold">{title}</span><span className="mt-2 block text-xs text-muted-foreground">{body}</span></label>)}</div></fieldset><label className="grid gap-2 text-sm font-bold">Rubro de tu negocio <span className="text-xs font-normal text-muted-foreground">Puedes ajustar el dato de tu registro. No cambia la publicación en el directorio.</span><input value={profile.industry} maxLength={120} onChange={e => { dirty.current = true; setProfile(p => ({ ...p, industry: e.target.value })); }} className={inputClass} placeholder="Por ejemplo, peluquería o consulta" /></label><button disabled={busy || !profile.mode} className={primaryClass}>Continuar <ChevronRight className="h-4 w-4" /></button></form>}
        {step === "hours" && <div className="space-y-5">{snapshot.locations.length > 0 && <label className="grid gap-2 text-sm font-bold">Sucursal<select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputClass}>{snapshot.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}
          {!snapshot.locations.length && <p role="alert">Necesitas una sucursal activa. <Link className="underline" href="/dashboard/settings">Revisar configuración</Link></p>}
          <BusinessHoursEditor key={`${locationId}:${editorVersion}`} initialHours={hourDraft?.locationId === locationId ? hourDraft.hours : sourceHours} onDraft={onHoursDraft} onSave={async hours => { try { await saveDraft(); await mutate({ type: "hours", hours, locationId }); dirty.current = false; track("onboarding_step_completed", { step: "hours", version: 2 }); return { success: true }; } catch { return { error: "Revisa el mensaje de guardado antes de continuar." }; } }} />
          {!snapshot.facts.businessOnly && profile.mode === "solo" && self && <div className="rounded-xl border border-border/20 p-4"><p className="text-sm">Tu perfil profesional tiene su propio horario. Puedes confirmar que usarás el mismo de esta sucursal.</p><button type="button" disabled={busy} className={`${buttonClass} mt-3`} onClick={() => { const s = self; void mutate({ type: "staff-hours", staffId: s.id, locationId, hours: hourDraft?.locationId === locationId ? hourDraft.hours : sourceHours }).catch(() => undefined); }}>Usar este horario en {self.name}</button></div>}
        </div>}
        {step === "staff" && <div className="space-y-5">{snapshot.locations.length > 1 && <label className="grid gap-2 text-sm font-bold">Sucursal para agregar y configurar al equipo<select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputClass}>{snapshot.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}<p className="text-sm text-muted-foreground">{snapshot.capacity.current} de {snapshot.capacity.total} profesionales habilitados en tu plan. Agregar una ficha no envía invitaciones ni modifica tu suscripción.</p><ul className="divide-y divide-border/20 rounded-xl border border-border/20">{snapshot.staff.map(s => <li key={s.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold">{s.name}</p><p className="text-xs text-muted-foreground">{s.hasHours ? "Tiene horario configurado" : "Falta configurar su horario"}</p></div><Link href="/dashboard/staff" className="text-xs font-bold text-brand-foreground underline">Revisar ficha</Link></div>{s.locationIds.includes(locationId) && <button type="button" disabled={busy} onClick={() => void mutate({ type: "staff-hours", staffId: s.id, locationId, hours: sourceHours }).catch(() => undefined)} className={`${buttonClass} mt-3 text-xs`}>Confirmar horario del negocio para {s.name}</button>}</li>)}</ul><form onSubmit={addStaff} className="space-y-3"><h3 className="font-bold">Agregar una persona</h3>{!!staffDraft.suggestedNames?.length && <p className="rounded-lg bg-muted/30 p-3 text-xs">Fichas por revisar: {staffDraft.suggestedNames.join(", ")}. Se guardan una a una dentro de la capacidad disponible.</p>}<label className="grid gap-1.5 text-sm">Nombre<input required maxLength={100} value={staffDraft.name} onChange={e => { dirty.current = true; setStaffDraft(s => ({ ...s, name: e.target.value })); }} className={inputClass} /></label><label className="grid gap-1.5 text-sm">Correo (opcional, sin crear acceso)<input type="email" value={staffDraft.email} onChange={e => { dirty.current = true; setStaffDraft(s => ({ ...s, email: e.target.value })); }} className={inputClass} /></label><button disabled={busy || !snapshot.capacity.canAdd} className={buttonClass}>Agregar profesional</button>{!snapshot.capacity.canAdd && <p className="text-xs text-muted-foreground">Alcanzaste la capacidad disponible. Puedes continuar con el equipo actual.</p>}</form></div>}
        {step === "services" && <div className="space-y-6">{snapshot.catalog.services.length > 0 && <div className="rounded-xl border border-border/20 p-4"><p className="mb-2 text-sm font-bold">Ya tienes estos servicios</p><ul className="space-y-2">{snapshot.catalog.services.map(s => <li key={s.id} className="flex flex-wrap justify-between gap-2 text-sm"><span>{s.name}</span><span className="text-muted-foreground">{s.duration} min · {new Intl.NumberFormat("es-CL", { style: "currency", currency: snapshot.business.currency }).format(s.price)}</span></li>)}</ul><Link href="/dashboard/services" className="mt-3 inline-block min-h-11 text-xs font-bold text-brand-foreground underline">Revisar o editar servicios</Link></div>}<form onSubmit={addService} className="space-y-4">{!!service.suggestedNames?.length && <div className="rounded-xl border border-[#7C3AED]/25 bg-[#7C3AED]/5 p-3 text-sm"><p className="font-bold">Servicios por revisar</p><p className="mt-1 text-xs">{service.suggestedNames.join(" · ")}</p><p className="mt-1 text-xs text-muted-foreground">Define duración y precio de cada uno. Guardaremos solo el servicio visible.</p></div>}<ServiceIdentityFields {...service} onChange={value => { dirty.current = true; setService(s => ({ ...s, ...value })); }} /><ServiceIdentityFields {...service} field="description" onChange={value => { dirty.current = true; setService(s => ({ ...s, ...value })); }} /><div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm font-bold">Duración (minutos)<input type="number" min={5} max={480} step={1} required value={service.duration} onChange={e => { dirty.current = true; setService(s => ({ ...s, duration: e.target.value })); }} className={inputClass} /></label><label className="grid gap-2 text-sm font-bold">Precio ({snapshot.business.currency})<input type="number" min={0} max={1e9} step="any" required value={service.price} onChange={e => { dirty.current = true; setService(s => ({ ...s, price: e.target.value })); }} className={inputClass} /></label></div><fieldset><legend className="mb-2 text-sm font-bold">Asociar a profesionales</legend>{snapshot.staff.map(s => <label key={s.id} className="mr-4 inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={service.staffIds.includes(s.id)} onChange={e => { dirty.current = true; setService(v => ({ ...v, staffIds: e.target.checked ? [...v.staffIds, s.id] : v.staffIds.filter(id => id !== s.id) })); }} />{s.name}</label>)}<p className="mt-2 text-xs text-muted-foreground">Quienes no tienen servicios específicos asignados atienden todos los servicios del catálogo. Puedes revisar esa selección desde Profesionales.</p></fieldset><button disabled={busy || !service.staffIds.length} className={primaryClass}>Guardar servicio</button></form></div>}
        {step === "check" && <div className="space-y-5">{snapshot.issues.length > 0 && <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-amber-950" data-tour="setup-diagnostics">{snapshot.issues.map(issue => <div key={issue.code}><p className="text-sm">{issue.message}</p><button type="button" onClick={() => void navigate(issue.step)} className="min-h-11 text-xs font-bold underline">Revisar {SETUP_LABELS[issue.step].toLowerCase()}</button></div>)}</div>}{repair && <div className="space-y-3 rounded-xl border border-[#7C3AED]/40 bg-[#7C3AED]/5 p-4" data-tour="setup-repair"><h3 className="font-bold">Confirma la corrección</h3><p className="text-sm">{repair.kind === "staff-hours" ? `Usar el horario del negocio para ${snapshot.staff.find(s => s.id === repair.staffId)?.name} en esta sucursal.` : `Asociar ${snapshot.catalog.services.find(s => s.id === repair.serviceId)?.name} a ${snapshot.staff.find(s => s.id === repair.staffId)?.name}.`}</p>{repair.kind === "staff-hours" && <ul className="text-xs">{repair.hours.map(h => <li key={h.dayOfWeek}>Día {h.dayOfWeek}: {h.isOpen ? `${h.startTime}–${h.endTime}${h.breakStart ? ` · pausa ${h.breakStart}–${h.breakEnd}` : ""}` : "cerrado"}</li>)}</ul>}<button type="button" disabled={busy} onClick={() => void confirmRepair()} className={primaryClass}>Confirmar corrección</button><button type="button" onClick={() => setRepair(null)} className="ml-3 min-h-11 text-xs underline">Descartar</button></div>}<ul className="grid gap-2 text-sm">{[["Horarios del negocio", snapshot.facts.hours, "hours"], ["Profesional con disponibilidad", snapshot.facts.staff, "staff"], ["Servicio activo y reservable", snapshot.facts.services, "services"]].map(([label, ok, target]) => <li key={String(label)} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 p-3"><span>{ok ? "✓" : "○"} {label}</span>{!ok && <button type="button" onClick={() => void navigate(target as SetupStep)} className="min-h-11 text-xs font-bold underline">Solucionar</button>}</li>)}</ul><label className="grid gap-2 text-sm font-bold">Servicio para la prueba<select className={inputClass} value={probeService || snapshot.catalog.services[0]?.id || ""} onChange={e => { setProbeService(e.target.value); setOptionIds([]); }}>{snapshot.catalog.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Sucursal<select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputClass}>{snapshot.catalog.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>{currentService?.optionCategories.map(c => <fieldset key={c.id}><legend className="text-sm font-bold">{c.name}{c.isRequired ? " (obligatorio)" : " (opcional)"}</legend>{c.alternatives.map(a => <label key={a.id} className="mr-3 inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={optionIds.includes(a.id)} onChange={e => setOptionIds(ids => e.target.checked ? [...ids, a.id] : ids.filter(id => id !== a.id))} />{a.name}</label>)}</fieldset>)}<label className="grid gap-2 text-sm font-bold">Fecha específica (opcional)<input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} /><span className="text-xs font-normal text-muted-foreground">Sin fecha, revisaré los próximos 14 días.</span></label><button type="button" disabled={busy || !currentService || !locationId} onClick={() => void check()} className={primaryClass}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Comprobar disponibilidad</button>{snapshot.verification?.error && <p role="status" className="rounded-xl bg-muted p-4 text-sm">{snapshot.verification.error}</p>}{snapshot.verified && <div className="space-y-4 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-4"><h3 className="font-bold">Encontramos horas disponibles</h3><p className="text-xs text-muted-foreground">{snapshot.verification?.date} · {snapshot.verification?.timezone}. Selecciona una hora para ensayar la elección.</p><div className="flex flex-wrap gap-2">{snapshot.verification?.slots.map(slot => <button type="button" key={slot.startTime} aria-pressed={selectedSlot === slot.startTime} onClick={() => setSelectedSlot(slot.startTime)} className={`${buttonClass} ${selectedSlot === slot.startTime ? "border-[#7C3AED] bg-[#7C3AED] text-white" : ""}`}>{new Intl.DateTimeFormat("es-CL", { timeZone: snapshot.verification?.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(slot.startTime))}</button>)}</div>{selectedSlot && <p role="status" className="text-sm">Elegiste un horario real. La prueba termina aquí: no se creó una cita ni se solicitó un pago.</p>}<label className="grid gap-2 text-sm font-bold">Tu enlace de reservas<input readOnly aria-label="Enlace de reservas" value={`${origin}${snapshot.publicPath}`} className={inputClass} onFocus={e => e.currentTarget.select()} /></label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyLink()} className={buttonClass}><Copy className="h-4 w-4" />{copied ? "Enlace copiado" : "Copiar enlace"}</button><a href={snapshot.publicPath} target="_blank" rel="noopener noreferrer" className={buttonClass}><ExternalLink className="h-4 w-4" />Vista previa pública</a></div><button type="button" disabled={busy} onClick={() => void finish()} className={primaryClass}>Finalizar configuración <Check className="h-4 w-4" /></button></div>}</div>}
        {step !== "business" && <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border/20 pt-5"><button type="button" disabled={busy} onClick={() => void navigate(setupTransition(step, "back", { ...snapshot.facts, mode: profile.mode || null }))} className={buttonClass}><ChevronLeft className="h-4 w-4" />Atrás</button>{step !== "check" && <button type="button" disabled={busy} onClick={() => void nextStep()} className={primaryClass}>Continuar <ChevronRight className="h-4 w-4" /></button>}</footer>}
        </>}
      </section>
    </div>
  </div>;
}
