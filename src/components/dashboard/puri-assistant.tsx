"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, ChevronRight, X } from "@/components/icons/hover-icons";
import { PuriMascot } from "@/components/brand/puri-mascot";
import { PuriMessageText } from "@/components/dashboard/puri-message-text";
import { track } from "@/lib/analytics/client";
import type { PuriAnswer, PuriCard } from "@/server/puri/types";

type Message = { role: "user" | "assistant"; content: string; answer?: PuriAnswer; failed?: boolean };

function cardText(card: PuriCard, locale: string) {
  if (card.type === "metric") return card.unit === "money" && card.currencyCode
    ? new Intl.NumberFormat(locale, { style: "currency", currency: card.currencyCode }).format(card.value)
    : new Intl.NumberFormat(locale).format(card.value);
  return card.value;
}

function cardLabel(card: PuriCard, locale: string) {
  if (card.type !== "availability" || !/^\d{4}-\d{2}-\d{2}$/.test(card.label)) return card.label;
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${card.label}T12:00:00.000Z`));
}

export function PuriAssistant() {
  const t = useTranslations("dashboard.puri");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const suggestions = useMemo(() => {
    if (pathname.includes("/clients")) return [t("suggestions.clientInactive"), t("suggestions.frequentClients"), t("suggestions.noShow")];
    if (pathname.includes("/analytics")) return [t("suggestions.week"), t("suggestions.compare"), t("suggestions.topService")];
    if (pathname.includes("/loyalty")) return [t("suggestions.loyalty"), t("suggestions.stamps")];
    return [t("suggestions.review"), t("suggestions.pending"), t("suggestions.availability"), t("suggestions.day")];
  }, [pathname, t]);

  useEffect(() => {
    if (!open) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea:not([disabled])'));
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }
    window.addEventListener("keydown", onKeyDown);
    const returnFocus = returnFocusRef.current;
    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => {
        if (returnFocus?.isConnected) returnFocus.focus();
        else document.querySelector<HTMLButtonElement>(".puri-launcher")?.focus();
      });
    };
  }, [open]);

  useEffect(() => {
    if (open && stickToBottomRef.current && scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    function handleAsk(event: Event) {
      const message = (event as CustomEvent<string>).detail;
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
      track("puri_opened", { section: pathname.split("/")[2] ?? "today" });
      if (message) void send(message);
    }
    window.addEventListener("puri:ask", handleAsk);
    return () => window.removeEventListener("puri:ask", handleAsk);
  });

  async function send(message: string, retry = false) {
    const value = message.trim();
    if (!value || loading) return;
    setInput("");
    setPendingQuestion(value);
    stickToBottomRef.current = true;
    track("puri_message_sent", { section: pathname.split("/")[2] ?? "today" });
    const history = retry && messages.at(-1)?.failed ? messages.slice(0, -2) : messages;
    const nextMessages: Message[] = [...history, { role: "user", content: value }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/puri", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: value,
          history: history.filter((item) => !item.failed).slice(-12).map(({ role, content }) => ({ role, content })),
          context: { pathname, locale, locationSlug: searchParams.get("location") ?? undefined, agenda: searchParams.get("agenda") === "mine" ? "mine" : "all", period: searchParams.get("period") === "month" ? "month" : "week" },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const errorKey: Record<string, string> = { UNAUTHENTICATED: "authRequired", INVALID_REQUEST: "invalidRequest", RATE_LIMIT: "rateLimit", FORBIDDEN: "forbidden", NOT_CONFIGURED: "notConfigured" };
        throw new Error(t(errorKey[payload?.code] ?? "error"));
      }
      for (const tool of payload.answer.toolsUsed ?? []) track("puri_tool_called", { tool });
      setMessages([...nextMessages, { role: "assistant", content: payload.answer.message, answer: payload.answer }]);
    } catch (error) {
      track("puri_error", { stage: "request" });
      setMessages([...nextMessages, { role: "assistant", content: error instanceof Error ? error.message : t("error"), failed: true }]);
    } finally { setLoading(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send(input); }

  const question = pendingQuestion.toLocaleLowerCase(locale);
  const thinkingLabel = /cobr|pagar|pago|payment|paid|receiv|fatur|encaisse|paiement|zahlung|bezahlt|收款|付款/.test(question) ? t("thinkingPayments")
    : /horas?|horari|libre|dispon|slot|avail|freie|verfüg|horár|orari|créneau|空闲|可用/.test(question) ? t("thinkingAvailability")
    : pathname.includes("/clients") ? t("thinkingClients")
    : pathname.includes("/analytics") ? t("thinkingAnalytics")
    : pathname === "/dashboard" || pathname.includes("/agenda") ? t("thinkingAgenda")
    : t("thinking");

  return <>
    {open && createPortal(<div className="fixed inset-0 z-[10000] bg-black/45" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-0 flex min-h-0 flex-col overflow-hidden border-black bg-[#FFFCF5] text-[#171717] shadow-[-7px_7px_0_#171717] sm:inset-auto sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-[max(1rem,env(safe-area-inset-right))] sm:h-[min(780px,calc(100dvh-2rem))] sm:w-[min(470px,calc(100vw-2rem))] sm:rounded-[1.75rem] sm:border-[3px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-black bg-[#E9D8FF] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-white shadow-[2px_2px_0_#171717]"><PuriMascot variant="default" compact className="h-11 w-11" /></div><div><h2 id={titleId} className="text-lg font-black leading-none">Puri</h2><p className="mt-1 text-xs font-semibold text-[#5B486C]">{t("subtitle")}</p></div></div>
          <button type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-white shadow-[2px_2px_0_#171717] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]" aria-label={t("close")}><X className="h-5 w-5" /></button>
        </header>
        <div ref={scrollerRef} onScroll={(event) => { const node = event.currentTarget; stickToBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 96; }} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          {messages.length === 0 ? <div className="space-y-5"><div className="rounded-[1.5rem] border-[3px] border-black bg-[#FFF5BA] px-5 pb-5 pt-3 shadow-[4px_4px_0_#171717]"><PuriMascot variant="greeting" className="mx-auto h-36 w-36" /><p className="text-center text-xl font-black leading-tight">{t("emptyTitle")}</p><p className="mx-auto mt-1 max-w-64 text-center text-sm font-medium leading-snug text-[#534B40]">{t("emptyBody")}</p></div><div className="grid gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="min-h-11 rounded-xl border-2 border-black bg-white px-3.5 py-2.5 text-left text-sm font-bold shadow-[2px_2px_0_#171717] transition hover:-translate-y-0.5 hover:bg-[#F4EBFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]">{suggestion}</button>)}</div></div>
          : messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-8" : "mr-2"}>
            {message.role === "assistant" && <div className="mb-1.5 flex items-center gap-1.5"><PuriMascot variant={message.failed ? "attention" : "default"} compact className="h-7 w-7" /><span className="text-[11px] font-black uppercase tracking-[0.12em]">Puri</span></div>}
            <div role={message.failed ? "alert" : undefined} className={message.role === "user" ? "rounded-[1.15rem] rounded-br-sm border-2 border-black bg-[#7C3AED] px-4 py-3 text-sm font-medium leading-relaxed text-white shadow-[2px_2px_0_#171717]" : `rounded-[1.15rem] rounded-tl-sm border-2 border-black px-4 py-3 text-sm font-medium leading-relaxed shadow-[2px_2px_0_#171717] ${message.failed ? "bg-[#FFF5BA]" : "bg-white"}`}><PuriMessageText content={message.content} /></div>
            {message.failed && <button type="button" onClick={() => void send(messages[index - 1]?.content ?? "", true)} className="mt-2 min-h-11 rounded-lg border-2 border-black bg-white px-3 text-xs font-black shadow-[2px_2px_0_#171717] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]">{t("retry")}</button>}
            {!!message.answer?.cards?.length && <div className="mt-2 grid grid-cols-2 gap-2">{message.answer.cards.map((card, cardIndex) => <div key={cardIndex} className={`min-w-0 rounded-xl border-2 border-black p-3 shadow-[2px_2px_0_#171717] ${cardIndex % 3 === 0 ? "bg-[#FFF5BA]" : cardIndex % 3 === 1 ? "bg-[#E9D8FF]" : "bg-white"}`}><p className="break-words text-lg font-black leading-tight">{cardText(card, locale)}</p><p className="mt-1 text-[10px] font-black uppercase leading-snug tracking-[0.08em] text-[#4A355E]">{cardLabel(card, locale)}</p>{card.detail && <p className="mt-1 text-xs font-medium leading-snug text-[#534B40]">{card.detail}</p>}</div>)}</div>}
            {!!message.answer?.actions?.length && <div className="mt-3 flex flex-wrap gap-2">{message.answer.actions.map((action, actionIndex) => <Link key={action.id} href={action.href} onClick={() => { track("puri_action_clicked", { action: action.id }); setOpen(false); }} className={`inline-flex min-h-11 items-center rounded-lg border-2 border-black px-3 py-2 text-xs font-black shadow-[2px_2px_0_#171717] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${actionIndex === 0 ? "bg-[#7C3AED] text-white" : "bg-white"}`}>{t("actions." + action.id)} <ChevronRight aria-hidden="true" className="ml-1 h-3 w-3" /></Link>)}</div>}
          </div>)}
          {loading && <div className="mr-6 flex items-center gap-3 rounded-xl border-2 border-black bg-white p-3 shadow-[2px_2px_0_#171717]" role="status" aria-live="polite"><PuriMascot variant="thinking" compact className="h-12 w-12 animate-[puri-bob_1.7s_ease-in-out_infinite] motion-reduce:animate-none" /><span className="text-sm font-bold">{thinkingLabel}</span></div>}
        </div>
        <form onSubmit={submit} className="shrink-0 border-t-[3px] border-black bg-[#FFFDF8] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4"><div className="flex items-end gap-2 rounded-xl border-2 border-black bg-white p-2 shadow-[2px_2px_0_#171717]"><textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input); } }} placeholder={t("placeholder")} rows={2} maxLength={2000} aria-label={t("placeholder")} className="min-h-11 max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm font-medium outline-none placeholder:text-[#6E6576]" /><button type="submit" disabled={loading || !input.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-[#7C3AED] text-white shadow-[2px_2px_0_#171717] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-40" aria-label={t("send")}><ArrowUp className="h-5 w-5" /></button></div></form>
      </aside>
    </div>, document.body)}
    {!open && <button ref={launcherRef} type="button" onClick={(event) => { returnFocusRef.current = event.currentTarget; track("puri_opened", { section: pathname.split("/")[2] ?? "today" }); setOpen(true); }} aria-label={t("open")} title={t("ask")} className={`puri-launcher fixed z-[9999] flex h-14 items-center gap-1.5 rounded-full border-[3px] border-black bg-[#E9D8FF] pl-1 pr-4 text-sm font-black text-black shadow-[4px_4px_0_#171717] transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7C3AED] ${pathname.includes("/stories") ? "puri-launcher--above-rail" : ""} ${pathname === "/dashboard" ? "puri-launcher--hide-on-mobile-today" : ""}`}><PuriMascot variant="default" compact className="h-12 w-12" /><span>Puri</span></button>}
  </>;
}

export function PuriTodayPrompt({ name }: { name: string }) {
  const t = useTranslations("dashboard.puri");
  return <section className="relative overflow-hidden rounded-[1.25rem] border-2 border-black bg-[#E9D8FF] p-3 text-black shadow-[3px_3px_0_#171717]"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2"><PuriMascot variant="greeting" compact className="h-12 w-12 shrink-0" /><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em]">PURI</p><p className="mt-0.5 break-words text-sm font-black">{name ? t("todayPromptPersonal", { name }) : t("todayPrompt")}</p></div></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("puri:ask", { detail: "" }))} className="min-h-11 rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-black shadow-[2px_2px_0_#171717] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]">{t("ask")}</button></div></section>;
}
