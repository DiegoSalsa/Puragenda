"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "@/components/icons/hover-icons";
import type { PuriAnswer, PuriCard } from "@/server/puri/types";
import { track } from "@/lib/analytics/client";

type Message = { role: "user" | "assistant"; content: string; answer?: PuriAnswer };

function PuriMark({ small = false }: { small?: boolean }) {
  return <span aria-hidden="true" className={small ? "flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#FFD84D] text-sm font-black text-black shadow-[2px_2px_0_#000]" : "flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-[#FFD84D] text-lg font-black text-black shadow-[3px_3px_0_#000]"}>P</span>;
}

function cardText(card: PuriCard, locale: string) {
  if (card.type === "metric") return card.unit === "money" && card.currencyCode ? new Intl.NumberFormat(locale, { style: "currency", currency: card.currencyCode }).format(card.value) : new Intl.NumberFormat(locale).format(card.value);
  return card.value;
}

export function PuriAssistant() {
  const t = useTranslations("dashboard.puri");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  const suggestions = useMemo(() => {
    if (pathname.includes("/clients")) return [t("suggestions.clientInactive"), t("suggestions.frequentClients"), t("suggestions.noShow")];
    if (pathname.includes("/analytics")) return [t("suggestions.week"), t("suggestions.compare"), t("suggestions.topService")];
    if (pathname.includes("/loyalty")) return [t("suggestions.loyalty"), t("suggestions.stamps")];
    return [t("suggestions.review"), t("suggestions.pending"), t("suggestions.availability"), t("suggestions.day")];
  }, [pathname, t]);

  useEffect(() => {
    function handleAsk(event: Event) {
      const message = (event as CustomEvent<string>).detail;
      setOpen(true);
      track("puri_opened", { section: pathname.split("/")[2] ?? "today" });
      if (message) void send(message);
    }
    window.addEventListener("puri:ask", handleAsk);
    return () => window.removeEventListener("puri:ask", handleAsk);
  });

  async function send(message: string) {
    const value = message.trim();
    if (!value || loading) return;
    setInput("");
    track("puri_message_sent", { section: pathname.split("/")[2] ?? "today" });
    const nextMessages = [...messages, { role: "user" as const, content: value }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/puri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: value,
          history: messages.slice(-12).map(({ role, content }) => ({ role, content })),
          context: {
            pathname,
            locale,
            locationSlug: searchParams.get("location") ?? undefined,
            agenda: searchParams.get("agenda") === "mine" ? "mine" : "all",
            period: searchParams.get("period") === "month" ? "month" : "week",
          },
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
      setMessages([...nextMessages, { role: "assistant", content: error instanceof Error ? error.message : t("error") }]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/25" onClick={() => setOpen(false)}>
          <aside role="dialog" aria-modal="true" className="absolute bottom-0 right-0 flex h-[min(760px,100dvh)] w-full flex-col border-2 border-black bg-[#FFFDF5] text-black shadow-[-6px_-6px_0_#171717] sm:bottom-4 sm:right-4 sm:h-[min(700px,calc(100dvh-2rem))] sm:w-[min(460px,calc(100vw-2rem))] sm:rounded-[1.5rem]" onClick={(event) => event.stopPropagation()} aria-label={t("panelLabel")}>
            <header className="flex items-center justify-between border-b-2 border-black bg-[#E9D8FF] px-5 py-4">
              <div className="flex items-center gap-3"><PuriMark small /><div><p className="font-black">Puri</p><p className="text-xs font-bold text-black/60">{t("subtitle")}</p></div></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border-2 border-black bg-white p-2 shadow-[2px_2px_0_#000]" aria-label={t("close")}><X className="h-4 w-4" /></button>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="space-y-4"><div className="rounded-[1.25rem] border-2 border-black bg-[#FFF5BA] p-4 shadow-[3px_3px_0_#000]"><p className="text-xs font-black uppercase tracking-[0.15em]">PURI</p><p className="mt-2 text-lg font-black">{t("emptyTitle")}</p><p className="mt-1 text-sm font-medium text-black/65">{t("emptyBody")}</p></div><div className="grid gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="rounded-xl border-2 border-black bg-white px-3 py-2.5 text-left text-sm font-bold shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5">{suggestion}</button>)}</div></div>
              ) : messages.map((message, index) => (
                <div key={index} className={message.role === "user" ? "ml-8" : "mr-4"}>
                  <div className={message.role === "user" ? "whitespace-pre-wrap rounded-xl border-2 border-black bg-[#171717] px-3.5 py-3 text-sm font-semibold text-white" : "whitespace-pre-wrap rounded-xl border-2 border-black bg-white px-3.5 py-3 text-sm font-medium"}>{message.content}</div>
                  {message.answer?.cards?.length ? <div className="mt-2 grid gap-2">{message.answer.cards.map((card, cardIndex) => <div key={cardIndex} className="rounded-lg border-2 border-black bg-[#E9D8FF] px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-[#5B21B6]">{card.label}</p><p className="font-black">{cardText(card, locale)}</p>{card.detail && <p className="text-xs font-medium text-black/60">{card.detail}</p>}</div>)}</div> : null}
                  {message.answer?.actions?.length ? <div className="mt-2 flex flex-wrap gap-2">{message.answer.actions.map((action) => <Link key={action.id} href={action.href} onClick={() => { track("puri_action_clicked", { action: action.id }); setOpen(false); }} className="rounded-lg border-2 border-black bg-[#FFD84D] px-2.5 py-1.5 text-xs font-black shadow-[2px_2px_0_#000]">{t("actions." + action.id)}</Link>)}</div> : null}
                </div>
              ))}
              {loading && <div className="mr-12 rounded-xl border-2 border-black bg-[#BFFCC6] px-3.5 py-3 text-sm font-black">{t("thinking")}</div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={submit} className="border-t-2 border-black bg-white p-3"><div className="flex items-end gap-2 rounded-xl border-2 border-black bg-[#FFFDF5] p-2"><textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("placeholder")} rows={2} maxLength={2000} className="min-h-11 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm font-medium outline-none" /><button type="submit" disabled={loading || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-[#7C3AED] text-white shadow-[2px_2px_0_#000] disabled:opacity-40" aria-label={t("send")}><ArrowUp className="h-4 w-4" /></button></div></form>
          </aside>
        </div>
      )}
      {!open && <button type="button" onClick={() => { track("puri_opened", { section: pathname.split("/")[2] ?? "today" }); setOpen(true); }} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border-2 border-black bg-[#E9D8FF] px-3 py-2.5 text-sm font-black text-black shadow-[4px_4px_0_#171717] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#171717]"><PuriMark small /> <span>Puri</span></button>}
    </>
  );
}

export function PuriTodayPrompt() {
  const t = useTranslations("dashboard.puri");
  return <section className="relative overflow-hidden rounded-[1.25rem] border-2 border-black bg-[#E9D8FF] p-4 text-black shadow-[3px_3px_0_#171717]"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><PuriMark small /><div><p className="text-[10px] font-black uppercase tracking-[0.16em]">PURI</p><p className="mt-0.5 text-sm font-black">{t("todayPrompt")}</p></div></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("puri:ask", { detail: "" }))} className="rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-black shadow-[2px_2px_0_#000]">{t("ask")}</button></div></section>;
}
