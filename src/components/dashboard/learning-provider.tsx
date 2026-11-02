"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { driver } from "driver.js";
import { PuriMascot } from "@/components/brand/puri-mascot";
import { track } from "@/lib/analytics/client";
import { contextualTutorials, learningGroup, LEARNING_GROUPS, tutorialHref, tutorialMatchesSearch, type LearningTutorial } from "@/core/tutorials";
import { useDashboardOverlay } from "./dashboard-overlay-context";
import "driver.js/dist/driver.css";

type Progress = { tutorialId: string; version: number; step: number; revision: number; status: string };
function waitForTarget(selector?: string): Promise<void> {
  if (!selector || document.querySelector(selector)) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => { observer.disconnect(); clearTimeout(timer); resolve(); };
    const observer = new MutationObserver(() => { if (document.querySelector(selector)) finish(); });
    const timer = setTimeout(finish, 5000);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
export function LearningProvider() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { activeHelp, openHelp, closeHelp } = useDashboardOverlay();
  const menu = activeHelp === "learning";
  const setMenu = useCallback((value: boolean) => { if (value) openHelp("learning"); else closeHelp("learning"); }, [openHelp, closeHelp]);
  const [category, setCategory] = useState("context");
  const [search, setSearch] = useState("");
  const [canSetup, setCanSetup] = useState(false);
  const [tutorials, setTutorials] = useState<LearningTutorial[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [error, setError] = useState("");
  const active = useRef<ReturnType<typeof driver> | null>(null);
  const current = useRef<{ tutorial: LearningTutorial; index: number; revision: number; completed: boolean } | null>(null);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const cleanupAction = useRef<(() => void) | null>(null);
  const started = useRef("");
  const startRequest = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusReturn = useRef<HTMLElement | null>(null);

  const reload = useCallback(async () => {
    const response = await fetch("/api/dashboard/learning");
    if (!response.ok) throw new Error("No pudimos cargar tus guías.");
    const data = await response.json(); setTutorials(data.tutorials); setProgress(data.progress); setCanSetup(data.canSetup); return data as { tutorials: LearningTutorial[]; progress: Progress[] };
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void reload().catch(() => undefined); }, 0); return () => clearTimeout(timer); }, [reload]);
  const save = useCallback((status: "active" | "paused" | "completed", reset = false) => {
    const state = current.current;
    if (!state) return Promise.resolve();
    const index = state.index;
    const task = async () => {
      const response = await fetch("/api/dashboard/learning", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ tutorialId: state.tutorial.id, version: state.tutorial.version, step: index, revision: state.revision, status, reset }) });
      const data = await response.json(); if (!response.ok) { setError(data.error); throw new Error(data.error); }
      state.revision = data.revision;
      setProgress(p => [...p.filter(x => x.tutorialId !== data.tutorialId || x.version !== data.version), data]);
    };
    const queued = writes.current.then(task); writes.current = queued.catch(() => undefined); return queued;
  }, []);
  const start = useCallback(async (id: string, restart = false) => {
    const request = ++startRequest.current;
    setError("");
    try {
      active.current?.destroy(); await writes.current;
      const data = await reload();
      const tutorial = data.tutorials.find(t => t.id === id);
      if (!tutorial) { setError("Esta guía no está disponible con tus permisos y plan."); return; }
      if (pathname !== tutorial.route) { router.push(tutorialHref(id)); setMenu(false); return; }
      const prior = data.progress.find(p => p.tutorialId === id && p.version === tutorial.version);
      current.current = { tutorial, index: restart || prior?.status === "completed" ? 0 : Math.min(prior?.step ?? 0, tutorial.steps.length - 1), revision: prior?.revision ?? 0, completed: false };
      await waitForTarget(tutorial.steps[current.current.index]?.target);
      if (request !== startRequest.current || window.location.pathname !== tutorial.route) return;
      await save("active", restart || prior?.status === "completed");
      openHelp("tour"); track("tutorial_started", { tutorial: id, version: tutorial.version });
      const instance = driver({
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches, allowClose: true, showProgress: true, smoothScroll: false,
        stagePadding: 8, stageRadius: 12, overlayOpacity: 0.45, popoverClass: "neo-brutalism-driver", nextBtnText: "Siguiente", prevBtnText: "Atrás", doneBtnText: "Terminar guía", progressText: "{{current}} de {{total}}",
        steps: tutorial.steps.map(s => ({ element: s.target, popover: { title: s.title, description: s.body, side: "bottom", align: "start" } })),
        onHighlighted: (_element, _step, { state }) => {
          cleanupAction.current?.();
          if (!current.current) return;
          const index = state.activeIndex ?? 0; current.current.index = index;
          void save("active").catch(() => instance.destroy());
          const event = tutorial.steps[index]?.event;
          if (event) {
            const handler = (e: Event) => { if ((e as CustomEvent<string>).detail === event && instance.hasNextStep()) requestAnimationFrame(() => { instance.moveNext(); instance.refresh(); }); };
            window.addEventListener("learning:action", handler); cleanupAction.current = () => window.removeEventListener("learning:action", handler);
          }
        },
        onNextClick: async () => {
          if (instance.hasNextStep()) {
            const index = current.current?.index ?? 0;
            await waitForTarget(tutorial.steps[index + 1]?.target);
            if (active.current === instance && current.current?.index === index) instance.moveNext();
            return;
          }
          if (current.current) { current.current.completed = true; void save("completed").then(() => { track("tutorial_completed", { tutorial: id, version: tutorial.version }); instance.destroy(); }).catch(() => { if (current.current) current.current.completed = false; }); }
        },
        onDestroyed: () => {
          cleanupAction.current?.(); cleanupAction.current = null;
          if (current.current && !current.current.completed) void save("paused").catch(() => undefined);
          active.current = null; closeHelp("tour");
        },
      });
      active.current = instance; instance.drive(current.current.index);
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos iniciar la guía."); }
  }, [pathname, reload, router, save, openHelp, closeHelp, setMenu]);
  useEffect(() => {
    const open = () => { setCategory("context"); setSearch(""); focusReturn.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setMenu(true); void reload().catch(e => setError(e.message)); };
    window.addEventListener("learning:open", open); return () => window.removeEventListener("learning:open", open);
  }, [reload, setMenu]);
  useEffect(() => {
    const id = params.get("learn");
    const key = `${pathname}:${id}`;
    if (!id) { started.current = ""; return; }
    if (started.current === key) return;
    // Wait for actual server-rendered controls. Never auto-click a business action.
    // Mark it started only when the timer actually runs: StrictMode and an
    // interrupted navigation can clean up the first timer before it fires.
    const timer = setTimeout(() => { started.current = key; void start(id); }, 400); return () => clearTimeout(timer);
  }, [params, pathname, start]);
  useEffect(() => () => { startRequest.current++; active.current?.destroy(); cleanupAction.current?.(); }, [pathname]);
  useEffect(() => {
    // The dashboard scrolls inside <main>; Driver listens only to window scroll.
    const refresh = () => active.current?.refresh();
    document.addEventListener("scroll", refresh, true);
    return () => document.removeEventListener("scroll", refresh, true);
  }, []);
  useEffect(() => { if (activeHelp !== "tour") active.current?.destroy(); }, [activeHelp]);
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenu(false); focusReturn.current?.focus(); }
      if (e.key !== "Tab") return;
      const items = menuRef.current?.querySelectorAll<HTMLElement>("button, a[href], input, select"); if (!items?.length) return;
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [menu, setMenu]);
  return <>
    {error && <div role="alert" className="fixed bottom-5 left-4 right-4 z-[10050] rounded-xl border border-red-500 bg-card p-3 text-sm text-foreground sm:left-auto sm:max-w-sm">{error}<button onClick={() => setError("")} className="ml-2 min-h-11 font-bold underline">Cerrar</button></div>}
    {menu && <div className="fixed inset-0 z-[10040] flex items-center justify-center bg-black/35 p-4" onMouseDown={e => { if (e.target === e.currentTarget) { setMenu(false); focusReturn.current?.focus(); } }}><div ref={menuRef} role="dialog" aria-modal="true" aria-labelledby="learning-title" className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-black bg-card p-5 text-foreground shadow-[4px_4px_0_#111]">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><PuriMascot compact className="h-12 w-12" /><h2 id="learning-title" className="text-xl font-black">Aprende con Puri</h2></div><button type="button" onClick={() => { setMenu(false); focusReturn.current?.focus(); }} className="min-h-11 px-2 text-sm font-bold">Cerrar</button></div>
      <p className="my-3 text-sm text-muted-foreground">Tareas breves para esta pantalla. Tu avance queda guardado en tu cuenta.</p>
      <label className="grid gap-1.5 text-xs font-bold">Buscar una guía<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Por ejemplo, horarios o clientes" className="min-h-11 w-full rounded-xl border border-border/30 bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]" /></label>
      <label className="my-3 grid gap-1.5 text-xs font-bold">Módulo<select value={category} onChange={e => setCategory(e.target.value)} className="min-h-11 rounded-xl border border-border/30 bg-background px-3 text-sm font-normal"><option value="context">En esta pantalla</option><option value="all">Todas las guías</option>{LEARNING_GROUPS.filter(group => tutorials.some(t => learningGroup(t) === group)).map(group => <option key={group} value={group}>{group}</option>)}</select></label>
      <div className="space-y-2" data-tour="learning-results">{(() => {
        const filtered = (search.trim() ? tutorials : category === "context" ? contextualTutorials(tutorials, pathname) : tutorials.filter(t => category === "all" || learningGroup(t) === category)).filter(t => tutorialMatchesSearch(t, search));
        return filtered.length ? filtered.map(t => { const p = progress.find(x => x.tutorialId === t.id && x.version === t.version); return <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/25 p-3"><button type="button" onClick={() => void start(t.id)} className="min-h-11 flex-1 text-left"><span className="text-sm font-bold">{t.title}</span><span className="mt-1 block text-xs text-muted-foreground">{learningGroup(t)} · {p?.status === "completed" ? "Completada · Repetir" : p ? `Continuar · paso ${p.step + 1}` : `${t.steps.length} pasos`}</span></button>{p && <button type="button" aria-label={`Reiniciar ${t.title}`} onClick={() => void start(t.id, true)} className="min-h-11 text-xs font-bold text-brand-foreground underline">Reiniciar</button>}</div>; }) : <p role="status" className="rounded-lg bg-muted/30 p-3 text-sm">No encontramos una guía para esa búsqueda. Puri puede ayudarte con una pregunta.</p>;
      })()}</div>
      <button type="button" onClick={() => { setMenu(false); window.dispatchEvent(new CustomEvent("puri:ask", { detail: "" })); }} className="mt-3 min-h-11 text-sm font-bold text-brand-foreground underline">Preguntar a Puri</button>
      {canSetup && <Link href="/dashboard/setup" onClick={() => setMenu(false)} className="mt-2 block min-h-11 py-2 text-sm font-bold text-brand-foreground underline">Revisar Puri Setup</Link>}
    </div></div>}

  </>;
}
