"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useTranslations } from "next-intl";
import { Banknote, CalendarDays, Check, Clock, FileText, Link2, Loader2, Mail, Pencil, Phone, RefreshCw, Trash2, User, UserCheck, UserX, X } from "@/components/icons/hover-icons";
import { formatPrice } from "@/lib/utils";
import { AppointmentEditor, type AppointmentEditorClient, type AppointmentEditorService, type AppointmentEditorStaff, type EditableAppointment } from "./appointment-editor";
import { AppointmentSettlementDialog } from "./appointment-settlement-dialog";
import { PosPaymentDialog } from "./pos-payment-dialog";

export type DashboardAppointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  clientId: string | null;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  depositAmount: number | null;
  depositPaymentUrl: string | null;
  totalPrice: number;
  posPaidAmount: number;
  depositReceiptStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  depositReceiptOriginalName: string | null;
  depositReceiptUploadedAt: string | null;
  serviceId: string;
  serviceName: string;
  staffId: string | null;
  staffName: string;
  selectedOptions?: { alternativeId?: string; categoryName: string; alternativeName: string; priceDelta: number; durationDelta: number }[];
  recurringBookingId?: string | null;
  clientNotes?: string | null;
  internalNotes?: string | null;
  sessionBaseAmount: number | null;
  tipAmount: number;
  postSessionItems: { description: string; amount: number }[];
  paymentMethod: string | null;
  settledAt: string | null;
};

export const APPOINTMENT_STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  PENDING: { bg: "bg-muted/50", border: "border-border", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  AWAITING_PAYMENT: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-300", dot: "bg-orange-400" },
  CONFIRMED: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-400" },
  CANCELLED: { bg: "bg-red-500/8", border: "border-red-500/20", text: "text-red-500 dark:text-red-300", dot: "bg-red-400" },
  CHECKED_IN: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-300", dot: "bg-blue-400" },
  COMPLETED: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-400" },
  NO_SHOW: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-300", dot: "bg-amber-400" },
};

function wallClock(iso: string, timeZone?: string) {
  const date = parseISO(iso);
  return format(timeZone ? toZonedTime(date, timeZone) : date, "HH:mm");
}

export function AppointmentDetailDialog({
  appointment,
  onClose,
  canManageAppointments,
  posEnabled,
  services,
  staff,
  clients,
  currencyCode,
  timeZone,
}: {
  appointment: DashboardAppointment;
  onClose: () => void;
  canManageAppointments: boolean;
  posEnabled: boolean;
  services: AppointmentEditorService[];
  staff: AppointmentEditorStaff[];
  clients: AppointmentEditorClient[];
  currencyCode: string;
  timeZone?: string;
}) {
  const t = useTranslations("dashboard.calendar");
  const todayT = useTranslations("dashboard.today");
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [cancellingSession, setCancellingSession] = useState(false);
  const [editor, setEditor] = useState<EditableAppointment | null>(null);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const statusStyle = APPOINTMENT_STATUS_COLORS[appointment.status] || APPOINTMENT_STATUS_COLORS.PENDING;
  const statusLabel: Record<string, string> = {
    PENDING: t("status.pending"),
    AWAITING_PAYMENT: t("status.awaitingPayment"),
    CONFIRMED: t("status.confirmed"),
    CANCELLED: t("status.cancelled"),
    CHECKED_IN: t("status.checkedIn"),
    COMPLETED: todayT("statusCompleted"),
    NO_SHOW: t("status.noShow"),
  };

  async function patch(body: unknown, key: string) {
    setLoading(key);
    try {
      const response = await fetch(`/api/dashboard/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo actualizar la cita.");
      onClose();
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo actualizar la cita.");
    } finally {
      setLoading(null);
    }
  }

  async function handleDeleteAwaitingPayment() {
    if (appointment.status !== "AWAITING_PAYMENT" || appointment.paymentStatus !== "PENDING") return;
    if (!window.confirm("¿Cancelar esta reserva que está esperando pago? La hora quedará libre y la reserva permanecerá registrada para poder auditarla o recuperarla.")) return;
    setLoading("DELETE");
    try {
      const response = await fetch(`/api/dashboard/appointments/${appointment.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo eliminar la reserva.");
      onClose();
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo eliminar la reserva.");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancelRecurringSession(mode: "single" | "future") {
    setCancellingSession(true);
    try {
      await fetch(`/api/dashboard/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (mode === "future" && appointment.recurringBookingId) {
        await fetch(`/api/dashboard/recurring/${appointment.recurringBookingId}/cancel-future`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromDate: appointment.startTime }),
        });
      }
      onClose();
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setCancellingSession(false);
    }
  }

  if (editor) {
    return (
      <AppointmentEditor
        appointment={editor}
        timeZone={timeZone}
        services={services}
        staff={staff}
        clients={clients}
        currencyCode={currencyCode}
        onClose={() => setEditor(null)}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex overflow-y-auto bg-black/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:justify-center" onClick={onClose}>
        <div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md animate-scale-in overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h3 className="min-w-0 text-lg font-semibold">{t("appointmentDetails")}</h3>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-4 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
              <span className="text-sm font-medium">{statusLabel[appointment.status] || appointment.status}</span>
              {appointment.recurringBookingId && (
                <span className="ml-auto flex items-center gap-1 rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-medium text-[#A78BFA]">
                  <RefreshCw className="h-2.5 w-2.5" /> {t("recurring")}
                </span>
              )}
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-muted/50 p-4 text-sm">
              <div className="flex min-w-0 items-start gap-2"><User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="shrink-0 text-muted-foreground">{t("customer")}</span><span className="min-w-0 break-words font-medium">{appointment.customerName}</span></div>
              <div className="flex min-w-0 items-start gap-2"><Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="shrink-0 text-muted-foreground">{t("email")}</span><span className="min-w-0 break-all">{appointment.customerEmail}</span></div>
              {appointment.customerPhone && (
                <div className="flex min-w-0 items-start gap-2">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="shrink-0 text-muted-foreground">{t("phone")}</span>
                  <a href={`tel:${appointment.customerPhone.replace(/[^\d+]/g, "")}`} className="min-w-0 break-all font-medium text-[#A78BFA] hover:underline">{appointment.customerPhone}</a>
                </div>
              )}
              <div className="flex min-w-0 items-start gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="shrink-0 text-muted-foreground">{t("time")}</span><span className="min-w-0 break-words">{wallClock(appointment.startTime, timeZone)} - {wallClock(appointment.endTime, timeZone)}</span></div>
              <div className="flex min-w-0 items-start gap-2"><CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="shrink-0 text-muted-foreground">{t("service")}</span><span className="min-w-0 break-words">{appointment.serviceName}</span></div>
              <div className="flex min-w-0 items-start gap-2"><User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="shrink-0 text-muted-foreground">{t("professional")}</span><span className="min-w-0 break-words">{appointment.staffName}</span></div>
              {(appointment.selectedOptions?.length ?? 0) > 0 && (
                <div className="space-y-1 border-t border-border pt-3">
                  {appointment.selectedOptions!.map((option) => (
                    <div key={`${option.categoryName}-${option.alternativeName}`} className="flex min-w-0 items-start justify-between gap-3">
                      <span className="min-w-0 break-words text-muted-foreground">{option.categoryName}:</span>
                      <span className="min-w-0 break-words text-right font-medium">{option.alternativeName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {appointment.status === "AWAITING_PAYMENT" && appointment.depositAmount && appointment.depositAmount > 0 && (
              <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><Banknote className="h-4 w-4 text-amber-400" /> Abono pendiente</span>
                  <span className="font-bold text-amber-400">{formatPrice(appointment.depositAmount, currencyCode)}</span>
                </div>
                {appointment.depositPaymentUrl && (
                  <a href={appointment.depositPaymentUrl} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center rounded-lg border border-border bg-background py-2 text-xs font-medium">Abrir link enviado a la clienta</a>
                )}
                {appointment.depositReceiptStatus === "PENDING" && (
                  <div className="space-y-2 rounded-lg border border-sky-500/20 bg-sky-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-sky-300">Comprobante por revisar</p>
                        <p className="truncate text-[11px] text-muted-foreground">{appointment.depositReceiptOriginalName || "Archivo adjunto"}</p>
                      </div>
                    </div>
                    <a href={`/api/dashboard/appointments/${appointment.id}/deposit-receipt`} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center rounded-lg border border-sky-500/20 bg-background py-2 text-xs font-semibold text-sky-300">Ver comprobante</a>
                  </div>
                )}
                {appointment.depositReceiptStatus === "REJECTED" && (
                  <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">Comprobante rechazado. La clienta puede subir uno nuevo desde su reserva.</p>
                )}
                {appointment.depositReceiptStatus === "PENDING" && (
                  <button type="button" onClick={() => { if (window.confirm("¿Rechazar este comprobante? La clienta podrá subir uno nuevo desde su reserva.")) void patch({ rejectDepositReceipt: true }, "RECEIPT_REJECTED"); }} disabled={loading !== null} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 disabled:opacity-50">
                    {loading === "RECEIPT_REJECTED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Rechazar comprobante
                  </button>
                )}
                <button type="button" onClick={() => { if (window.confirm("Confirma solo después de verificar que el abono fue recibido en la cuenta del negocio.")) void patch({ markDepositPaid: true }, "DEPOSIT_PAID"); }} disabled={loading !== null} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  {loading === "DEPOSIT_PAID" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {appointment.depositReceiptStatus === "PENDING" ? "Confirmar comprobante y abono" : "Marcar abono recibido"}
                </button>
                <p className="text-[11px] text-muted-foreground">Esta acción confirma la cita y envía el correo de confirmación.</p>
                {canManageAppointments && appointment.paymentStatus === "PENDING" && (
                  <button type="button" onClick={handleDeleteAwaitingPayment} disabled={loading !== null} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 disabled:opacity-50">
                    {loading === "DELETE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Cancelar reserva y liberar hora
                  </button>
                )}
              </div>
            )}

            {canManageAppointments && appointment.status === "AWAITING_PAYMENT" && appointment.paymentStatus === "PENDING" && (!appointment.depositAmount || appointment.depositAmount <= 0) && (
              <button type="button" onClick={handleDeleteAwaitingPayment} disabled={loading !== null} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-300 disabled:opacity-50">
                {loading === "DELETE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Cancelar reserva y liberar hora
              </button>
            )}

            {posEnabled && canManageAppointments && appointment.paymentStatus === "APPROVED" && ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(appointment.status) && appointment.totalPrice - (appointment.depositAmount ?? 0) - appointment.posPaidAmount > 0 && (
              <PosPaymentDialog appointmentId={appointment.id} balance={appointment.totalPrice - (appointment.depositAmount ?? 0) - appointment.posPaidAmount} currencyCode={currencyCode} onPaid={() => router.refresh()} />
            )}

            {appointment.clientNotes && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="mb-1 flex items-center gap-1.5"><FileText className="h-3 w-3 text-amber-400" /><span className="text-[11px] font-medium text-amber-400">{t("customerNote")}</span></div>
                <p className="text-xs leading-relaxed text-muted-foreground">{appointment.clientNotes}</p>
              </div>
            )}
            {appointment.internalNotes && (
              <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-3">
                <div className="mb-1 flex items-center gap-1.5"><FileText className="h-3 w-3 text-[#A78BFA]" /><span className="text-[11px] font-medium text-[#A78BFA]">{t("appointmentNote")}</span></div>
                <p className="text-xs leading-relaxed text-muted-foreground">{appointment.internalNotes}</p>
              </div>
            )}

            {appointment.recurringBookingId && (
              <div className="space-y-2">
                <a href="/dashboard/recurring" className="flex items-center gap-1.5 text-xs font-medium text-[#A78BFA] transition-colors hover:text-[#C4B5FD]"><Link2 className="h-3 w-3" /> {t("viewPlanSessions")}</a>
                {!["CANCELLED", "NO_SHOW"].includes(appointment.status) && (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => handleCancelRecurringSession("single")} disabled={cancellingSession} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 py-2 text-xs font-medium text-red-400 disabled:opacity-50">{cancellingSession ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} {t("cancelSession")}</button>
                    <button type="button" onClick={() => handleCancelRecurringSession("future")} disabled={cancellingSession} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 py-2 text-xs font-medium text-red-400 disabled:opacity-50">{cancellingSession ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} {t("cancelFollowing")}</button>
                  </div>
                )}
              </div>
            )}

            {!["CANCELLED", "CHECKED_IN", "NO_SHOW"].includes(appointment.status) && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("changeStatus")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {appointment.status === "PENDING" && (<>
                    <button type="button" onClick={() => void patch({ status: "CONFIRMED" }, "CONFIRMED")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-400 disabled:opacity-50">{loading === "CONFIRMED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {t("confirm")}</button>
                    <button type="button" onClick={() => void patch({ status: "CANCELLED" }, "CANCELLED")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 disabled:opacity-50">{loading === "CANCELLED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} {t("cancel")}</button>
                  </>)}
                  {appointment.status === "CONFIRMED" && (<>
                    <button type="button" onClick={() => void patch({ status: "CHECKED_IN" }, "CHECKED_IN")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 py-2.5 text-sm font-medium text-blue-400 disabled:opacity-50">{loading === "CHECKED_IN" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />} {t("attended")}</button>
                    <button type="button" onClick={() => void patch({ status: "NO_SHOW" }, "NO_SHOW")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 py-2.5 text-sm font-medium text-amber-400 disabled:opacity-50">{loading === "NO_SHOW" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />} {t("noShow")}</button>
                    <button type="button" onClick={() => void patch({ status: "CANCELLED" }, "CANCELLED")} disabled={loading !== null} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 disabled:opacity-50">{loading === "CANCELLED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} {t("cancelAppointment")}</button>
                  </>)}
                </div>
              </div>
            )}

            {canManageAppointments && !appointment.recurringBookingId && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status) && (
              <button type="button" onClick={() => setEditor({
                id: appointment.id,
                customerName: appointment.customerName,
                customerEmail: appointment.customerEmail,
                customerPhone: appointment.customerPhone,
                clientId: appointment.clientId,
                serviceId: appointment.serviceId,
                staffId: appointment.staffId,
                startTime: appointment.startTime,
                internalNotes: appointment.internalNotes ?? null,
                selectedOptions: appointment.selectedOptions ?? [],
              })} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 py-2.5 text-sm font-medium text-[#A78BFA]">
                <Pencil className="h-4 w-4" /> {t("editOrReschedule")}
              </button>
            )}
            {canManageAppointments && ["CHECKED_IN", "COMPLETED"].includes(appointment.status) && (
              <button type="button" onClick={() => setSettlementOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-400">
                <Banknote className="h-4 w-4" /> {appointment.settledAt ? "Editar cierre de sesión" : "Cerrar sesión y registrar cobro"}
              </button>
            )}
          </div>
        </div>
      </div>
      {settlementOpen && (
        <AppointmentSettlementDialog
          appointment={appointment}
          currencyCode={currencyCode}
          onClose={() => setSettlementOpen(false)}
          onSaved={() => { setSettlementOpen(false); onClose(); router.refresh(); }}
        />
      )}
    </>
  );
}
