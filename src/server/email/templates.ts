import { format } from "date-fns";
import { es } from "date-fns/locale";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  businessName: string;
}

// ═══════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════

const BRAND = "#7C3AED";
const BRAND_DARK = "#5B21B6";

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,${BRAND},${BRAND_DARK});padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Pura<span style="opacity:0.9;">genda</span></h1>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;">${body}</td></tr>
  <!-- Footer -->
  <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Puragenda by PuroCode · contacto@purocode.com</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#64748b;white-space:nowrap;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:#0f172a;font-weight:500;">${value}</td>
  </tr>`;
}

function detailsTable(data: BookingEmailData): string {
  const date = format(data.startTime, "EEEE, d 'de' MMMM yyyy", { locale: es });
  const time = `${format(data.startTime, "HH:mm")} - ${format(data.endTime, "HH:mm")}`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin:16px 0;">
    ${detailRow("📅 Fecha", date)}
    ${detailRow("🕐 Hora", time)}
    ${detailRow("💇 Servicio", data.serviceName)}
    ${detailRow("👤 Profesional", data.staffName)}
    ${detailRow("📞 Teléfono", data.customerPhone || "No proporcionado")}
  </table>`;
}

// ═══════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════

/** Email to business owner when a new booking is made */
export function newBookingOwnerEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Nueva reserva de ${data.customerName} — ${data.businessName}`,
    html: layout("Nueva Reserva", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Nueva reserva recibida</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        <strong style="color:#0f172a;">${data.customerName}</strong> (${data.customerEmail}) ha solicitado una cita.
      </p>
      ${detailsTable(data)}
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">Revisa tu dashboard para confirmar o gestionar esta cita.</p>
    `),
  };
}

/** Email to staff member when assigned a new booking */
export function newBookingStaffEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Nuevo compromiso: ${data.serviceName} con ${data.customerName}`,
    html: layout("Nuevo Compromiso", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Tienes una nueva cita asignada</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Se ha agendado una cita con <strong style="color:#0f172a;">${data.customerName}</strong>.
      </p>
      ${detailsTable(data)}
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">Revisa tu agenda para más detalles.</p>
    `),
  };
}

/** Email to client when booking is requested (PENDING status) */
export function newBookingClientEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Tu reserva ha sido solicitada — ${data.businessName}`,
    html: layout("Reserva Solicitada", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Reserva recibida!</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Hola <strong style="color:#0f172a;">${data.customerName}</strong>, hemos recibido tu solicitud de reserva en <strong style="color:${BRAND};">${data.businessName}</strong>.
      </p>
      ${detailsTable(data)}
      <div style="margin:20px 0;padding:16px;background:#fef3c7;border-radius:10px;border:1px solid #fde68a;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          <strong>Estado: Pendiente</strong> — Tu cita será confirmada por el equipo de ${data.businessName}. Te avisaremos cuando esté confirmada.
        </p>
      </div>
    `),
  };
}

/** Email to client when booking is CONFIRMED */
export function confirmedBookingClientEmail(data: BookingEmailData): { subject: string; html: string } {
  const dateStr = format(data.startTime, "EEEE, d 'de' MMMM", { locale: es });
  const timeStr = format(data.startTime, "HH:mm");
  return {
    subject: `¡Reserva Confirmada! Te esperamos — ${data.businessName}`,
    html: layout("Reserva Confirmada", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Tu cita está confirmada! ✅</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Hola <strong style="color:#0f172a;">${data.customerName}</strong>, te confirmamos tu cita en <strong style="color:${BRAND};">${data.businessName}</strong>.
      </p>
      ${detailsTable(data)}
      <div style="margin:20px 0;padding:16px;background:linear-gradient(135deg,${BRAND}10,${BRAND}05);border-radius:10px;border:1px solid ${BRAND}30;">
        <p style="margin:0;font-size:15px;color:${BRAND_DARK};text-align:center;font-weight:600;">
          Te esperamos el ${dateStr} a las ${timeStr} 🎉
        </p>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">Si necesitas cancelar o reprogramar, contacta directamente a ${data.businessName}.</p>
    `),
  };
}
