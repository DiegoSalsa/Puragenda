import { prisma } from "@/server/db/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, XCircle, Clock, Calendar, User, Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CitaPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { appointmentId } = await params;
  const { payment } = await searchParams;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: { select: { name: true, slug: true, primaryColor: true } },
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });

  if (!appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white">
        <div className="text-center space-y-4">
          <XCircle className="mx-auto h-16 w-16 text-red-400" />
          <h1 className="text-2xl font-bold">Cita no encontrada</h1>
          <p className="text-muted-foreground">La cita que buscas no existe o fue eliminada.</p>
        </div>
      </div>
    );
  }

  const pc = appointment.business.primaryColor || "#7C3AED";
  const selectedOptions = (appointment.selectedOptions as { categoryName: string; alternativeName: string }[] | null) ?? [];

  const statusConfig = {
    success: {
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      title: "¡Pago confirmado!",
      subtitle: "Tu abono ha sido procesado exitosamente. Tu cita está confirmada.",
    },
    failed: {
      icon: XCircle,
      iconColor: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      title: "Pago rechazado",
      subtitle: "No se pudo procesar el pago. Tu cita no ha sido confirmada. Intenta nuevamente.",
    },
    pending: {
      icon: Clock,
      iconColor: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      title: "Pago pendiente",
      subtitle: "Tu pago está siendo procesado. Recibirás una confirmación por correo cuando se apruebe.",
    },
  };

  const config = payment ? statusConfig[payment as keyof typeof statusConfig] : null;
  const Icon = config?.icon || CheckCircle2;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4 text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Status banner */}
        {config && (
          <div className={`flex items-center gap-3 rounded-2xl border ${config.borderColor} ${config.bgColor} p-5`}>
            <Icon className={`h-8 w-8 shrink-0 ${config.iconColor}`} />
            <div>
              <h2 className="text-lg font-bold">{config.title}</h2>
              <p className="text-sm text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>
        )}

        {/* Appointment details */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h1 className="text-xl font-bold" style={{ color: pc }}>
            {appointment.business.name}
          </h1>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Servicio:</span>
              <span className="font-medium">{appointment.service.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fecha:</span>
              <span className="font-medium capitalize">
                {format(new Date(appointment.startTime), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Hora:</span>
              <span className="font-medium">
                {format(new Date(appointment.startTime), "HH:mm")} - {format(new Date(appointment.endTime), "HH:mm")}
              </span>
            </div>
            {appointment.staff && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Profesional:</span>
                <span className="font-medium">{appointment.staff.name}</span>
              </div>
            )}
            {selectedOptions.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                {selectedOptions.map((option) => (
                  <div key={`${option.categoryName}-${option.alternativeName}`} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{option.categoryName}:</span>
                    <span className="font-medium text-right">{option.alternativeName}</span>
                  </div>
                ))}
              </div>
            )}
            {appointment.depositAmount && appointment.depositAmount > 0 && (
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <span className="text-muted-foreground">Abono pagado:</span>
                <span className="font-bold" style={{ color: pc }}>
                  ${appointment.depositAmount.toLocaleString("es-CL")}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm">
            <div className={`h-2 w-2 rounded-full ${
              appointment.status === "CONFIRMED" ? "bg-emerald-400" :
              appointment.status === "AWAITING_PAYMENT" ? "bg-amber-400" :
              appointment.status === "CANCELLED" ? "bg-red-400" :
              "bg-muted-foreground"
            }`} />
            <span className="text-muted-foreground">Estado:</span>
            <span className="font-medium">
              {appointment.status === "CONFIRMED" ? "Confirmada" :
               appointment.status === "AWAITING_PAYMENT" ? "Esperando pago" :
               appointment.status === "PENDING" ? "Pendiente" :
               appointment.status === "CANCELLED" ? "Cancelada" :
               appointment.status}
            </span>
          </div>
        </div>

        <div className="text-center">
          <a
            href={`/widget/${appointment.business.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
          >
            Agendar otra cita
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground/50">
          Powered by <span className="font-semibold" style={{ color: pc }}>Puragenda</span>
        </p>
      </div>
    </div>
  );
}
