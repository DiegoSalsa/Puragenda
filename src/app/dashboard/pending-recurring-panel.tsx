"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useTransition } from "react";
import { RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp, User, Calendar, Clock } from "lucide-react";
import { approveRecurringBookingAction, rejectRecurringBookingAction } from "@/server/actions/recurring.actions";
import { useRouter } from "next/navigation";

const WEEK_NAMES: Record<number, string> = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mie", 4: "Jue", 5: "Vie", 6: "Sab" };

interface PendingBooking {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  staffName: string | null;
  selectedDays: number[];
  selectedTimes: Record<string, string>;
  startDate: string;
  endDate: string;
  durationMonths: number;
  healthAnswers: Record<string, string> | null;
  healthFreeText: string | null;
  createdAt: string;
}

export function PendingRecurringPanel({ bookings, locale }: { bookings: PendingBooking[]; locale: string }) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(bookings.length === 1 ? bookings[0].id : null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function handleApprove(id: string) {
    setLoadingId(id);
    startTransition(async () => {
      await approveRecurringBookingAction(id);
      router.refresh();
      setLoadingId(null);
    });
  }

  function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    setLoadingId(id);
    startTransition(async () => {
      await rejectRecurringBookingAction(id, rejectReason.trim());
      router.refresh();
      setLoadingId(null);
      setRejectingId(null);
      setRejectReason("");
    });
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15">
          <RefreshCw className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">
            {bookings.length === 1
              ? legacy("cp3Hn9RNvw2d")
              : `${bookings.length} suscripciones pendientes de aprobacion`}
          </h2>
          <p className="text-xs text-muted-foreground"><LocalizedText id="gOVKrBFs2WaI" /></p>
        </div>
      </div>

      <div className="space-y-3">
        {bookings.map((b) => {
          const isExpanded = expandedId === b.id;
          const isLoading = loadingId === b.id && pending;
          const isRejecting = rejectingId === b.id;

          return (
            <div key={b.id} className="rounded-xl border border-amber-500/20 bg-card overflow-hidden">
              {/* Header row */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-brand-foreground text-xs font-bold">
                    {b.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{b.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.serviceName}{b.staffName ? ` · ${b.staffName}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {b.selectedDays.map((d) => WEEK_NAMES[d]).join(", ")} · {b.durationMonths} {b.durationMonths === 1 ? "mes" : "meses"}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-4">
                  {/* Info grid */}
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{b.customerEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {new Date(b.startDate).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" })} <LocalizedText id="Y1GCUDAVWDZm" />{" "}
                          {new Date(b.endDate).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {b.selectedDays.map((d) => (
                        <div key={d} className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium text-foreground">{WEEK_NAMES[d]}</span>
                          <span>{b.selectedTimes[String(d)]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Health answers */}
                  {(b.healthAnswers && Object.keys(b.healthAnswers).length > 0) && (
                    <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><LocalizedText id="LyTjbgn_C_Eu" /></p>
                      {Object.entries(b.healthAnswers).map(([k, v]) => (
                        <div key={k} className="text-sm">
                          <span className="text-muted-foreground"><LocalizedText id="r-dbcEev9j_A" /> {parseInt(k) + 1}: </span>
                          <span>{v}</span>
                        </div>
                      ))}
                      {b.healthFreeText && (
                        <div className="text-sm">
                          <span className="text-muted-foreground"><LocalizedText id="IHQedcFUmsMN" /> </span>
                          <span>{b.healthFreeText}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reject reason input */}
                  {isRejecting && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground"><LocalizedText id="Ebc_QOiNRllP" /></label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        placeholder={legacy("8lihZqC3NHpc")}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-red-500/50 transition-colors"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    {!isRejecting ? (
                      <>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleApprove(b.id)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {isLoading ? "Aprobando..." : "Aprobar suscripcion"}
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setRejectingId(b.id)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm font-bold text-red-500 transition-all hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          <LocalizedText id="KgUVYC0xWHYb" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isLoading || !rejectReason.trim()}
                          onClick={() => handleReject(b.id)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-600 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          {isLoading ? "Rechazando..." : "Confirmar rechazo"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectingId(null); setRejectReason(""); }}
                          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
                        >
                          <LocalizedText id="u527QG3L1SSL" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
