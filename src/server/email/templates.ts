import { formatInTimeZone } from "date-fns-tz";
import type { AppLocale } from "@/i18n/config";
import { getDateLocale } from "@/i18n/date-locale";

// Zona horaria por defecto para formatear fechas en emails
const BUSINESS_TZ = "America/Santiago";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface LocalizedEmailData {
  locale?: AppLocale;
}

interface BookingEmailData extends LocalizedEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  businessName: string;
  timezone?: string;
  businessAddress?: string | null;
  businessMapsUrl?: string | null;
  rescheduleUrl?: string;
  cancelUrl?: string;
}

// ═══════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════

const BRAND = "#7C3AED";
const BRAND_DARK = "#5B21B6";
const CLIENT_PORTAL_SLOT = "<!-- CLIENT_PORTAL_SLOT -->";

export interface EmailTemplate {
  subject: string;
  html: string;
}

export function withClientPortalAccess(template: EmailTemplate, portalUrl: string): EmailTemplate {
  const safeUrl = escapeHtml(portalUrl);
  const portalRow = `<tr><td style="padding:0 32px 28px;background:#ffffff;text-align:center;">
    <div style="padding:20px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;">
      <p style="margin:0 0 12px;font-size:14px;color:#4C1D95;font-weight:700;">Todo en un solo lugar</p>
      <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:12px 26px;border-radius:9px;font-size:14px;font-weight:700;text-decoration:none;">
        Ver mis citas y premios →
      </a>
      <p style="margin:10px 0 0;font-size:11px;color:#7C3AED;">Acceso privado de un solo uso · válido por 30 días</p>
    </div>
  </td></tr>`;

  return {
    ...template,
    html: template.html.replace(CLIENT_PORTAL_SLOT, portalRow),
  };
}

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
  ${CLIENT_PORTAL_SLOT}
  <!-- Footer -->
  <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Powered by <a href="https://www.puragenda.cl" style="color:#94a3b8;text-decoration:none;font-weight:600;">Puragenda</a></p>
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

// ═══════════════════════════════════════════
// ENTERPRISE STYLES (NO EMOJIS, NEUTRAL)
// ═══════════════════════════════════════════

function enterpriseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);">
  <tr><td style="padding:40px 40px 32px;">${body}</td></tr>
  ${CLIENT_PORTAL_SLOT}
  <tr><td style="padding:24px 40px;background:#F9FAFB;border-top:1px solid #E5E7EB;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;">Powered by <a href="https://www.puragenda.cl" style="color:#9CA3AF;text-decoration:none;font-weight:600;">Puragenda</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function enterpriseDetailsTable(data: BookingEmailData | ReminderEmailData): string {
  const timezone = data.timezone || BUSINESS_TZ;
  const date = formatInTimeZone(data.startTime, timezone, "PPPP", { locale: getDateLocale(data.locale ?? "es") });
  const time = `${formatInTimeZone(data.startTime, timezone, "HH:mm")} - ${formatInTimeZone(data.endTime, timezone, "HH:mm")}`;
  
  let html = `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;display:table;">`;
  
  const row = (label: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;border-bottom:${isLast ? 'none' : '1px solid #E5E7EB'};width:35%;">${label}</td>
      <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;border-bottom:${isLast ? 'none' : '1px solid #E5E7EB'};">${value}</td>
    </tr>
  `;

  html += row("Fecha", date);
  html += row("Hora", time);
  html += row("Zona horaria", escapeHtml(timezone));
  html += row("Servicio", data.serviceName);
  const customerPhone =
    "customerPhone" in data ? data.customerPhone?.trim() || null : null;
  const customerAddress = "customerAddress" in data && data.customerAddress ? escapeHtml(data.customerAddress) : null;
  html += row("Profesional", data.staffName, !customerPhone && !customerAddress);
  if (customerPhone) {
    const safePhone = escapeHtml(customerPhone);
    const phoneHref = escapeHtml(customerPhone.replace(/[^\d+]/g, ""));
    html += row(
      "Teléfono del cliente",
      phoneHref
        ? `<a href="tel:${phoneHref}" style="color:${BRAND};text-decoration:none;">${safePhone}</a>`
        : safePhone,
      !customerAddress
    );
  }
  if (customerAddress) html += row("Direccion de la visita", customerAddress, true);
  
  html += `</table>`;

  if (data.businessAddress) {
    html += `<div style="margin:0 0 24px;padding:20px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Ubicación</p>
      <p style="margin:0;font-size:14px;color:#111827;font-weight:500;line-height:1.5;">${data.businessAddress}</p>`;
    if (data.businessMapsUrl) {
      html += `<div style="margin-top:16px;">
        <a href="${data.businessMapsUrl}" style="display:inline-block;padding:8px 16px;background:#E5E7EB;color:#374151;text-decoration:none;font-size:13px;font-weight:600;border-radius:9999px;">Ver en Google Maps &rarr;</a>
      </div>`;
    }
    html += `</div>`;
  }

  return html;
}

function googleCalendarButton(data: BookingEmailData): string {
  const dates = [data.startTime, data.endTime]
    .map((date) => formatInTimeZone(date, "UTC", "yyyyMMdd'T'HHmmss'Z'"))
    .join("/");
  const details = [
    `Servicio: ${data.serviceName}`,
    `Profesional: ${data.staffName}`,
    `Cliente: ${data.customerName}`,
    data.customerPhone ? `Teléfono: ${data.customerPhone}` : null,
  ].filter(Boolean).join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${data.serviceName} — ${data.businessName}`,
    dates,
    details,
    ctz: data.timezone || BUSINESS_TZ,
  });
  if (data.businessAddress) params.set("location", data.businessAddress);
  const href = escapeHtml(`https://calendar.google.com/calendar/render?${params.toString()}`);

  return `<div style="margin:0 0 24px;text-align:center;">
    <a href="${href}" style="display:inline-block;padding:10px 18px;background:#FFFFFF;color:#374151;text-decoration:none;font-size:13px;font-weight:600;border-radius:8px;border:1px solid #D1D5DB;">Agregar a Google Calendar</a>
  </div>`;
}

// ═══════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════

/** Email to business owner when a new booking is made */
export function newBookingOwnerEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Nueva reserva de ${data.customerName} — ${data.businessName}`,
    html: enterpriseLayout("Nueva Reserva", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Nueva reserva recibida</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
        <strong style="color:#111827;">${data.customerName}</strong> (${data.customerEmail}) ha solicitado una cita.
      </p>
      ${enterpriseDetailsTable(data)}
      ${googleCalendarButton(data)}
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
        Revisa tu dashboard para confirmar o gestionar esta cita.
      </p>
    `),
  };
}

/** Email to staff member when assigned a new booking */
export function newBookingStaffEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Nuevo compromiso: ${data.serviceName} con ${data.customerName}`,
    html: enterpriseLayout("Nuevo Compromiso", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Tienes una nueva cita asignada</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
        Se ha agendado una cita con <strong style="color:#111827;">${data.customerName}</strong>.
      </p>
      ${enterpriseDetailsTable(data)}
      ${googleCalendarButton(data)}
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
        Revisa tu agenda para más detalles.
      </p>
    `),
  };
}

/** Email to client when booking is requested (PENDING status) */
export function newBookingClientEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Reserva solicitada en ${data.businessName}`,
    html: enterpriseLayout("Reserva Solicitada", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Solicitud de reserva recibida</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, hemos recibido su solicitud de reserva en <strong style="color:#111827;">${data.businessName}</strong>.
      </p>
      ${enterpriseDetailsTable(data)}
      ${googleCalendarButton(data)}
      <div style="margin:24px 0;padding:16px;background:#FEF3C7;border-radius:8px;border:1px solid #FDE68A;">
        <p style="margin:0;font-size:14px;color:#92400E;line-height:1.5;">
          <strong>Estado: Pendiente</strong> — Su cita será confirmada por el equipo de ${data.businessName}. Le avisaremos en cuanto sea aprobada.
        </p>
      </div>
    `),
  };
}

/** Email to client when booking is CONFIRMED */
export function confirmedBookingClientEmail(data: BookingEmailData): { subject: string; html: string } {
  const actionsBlock = data.cancelUrl || data.rescheduleUrl ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
        <tr>
          ${data.rescheduleUrl ? `
          <td align="center" style="padding:4px;">
            <a href="${data.rescheduleUrl}" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">Reagendar cita &rarr;</a>
          </td>` : ""}
          ${data.cancelUrl ? `
          <td align="center" style="padding:4px;">
            <a href="${data.cancelUrl}" style="display:inline-block;background:#fff;color:#DC2626;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;border:2px solid #FECACA;">Cancelar cita</a>
          </td>` : ""}
        </tr>
      </table>
      <p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">Por seguridad, cancelar requiere una confirmación adicional y nunca ocurre al abrir el enlace.</p>
  ` : "";

  return {
    subject: `Reserva confirmada en ${data.businessName}`,
    html: enterpriseLayout("Reserva Confirmada", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Su cita ha sido confirmada</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, su cita en <strong style="color:#111827;">${data.businessName}</strong> ha sido agendada exitosamente.
      </p>
      ${enterpriseDetailsTable(data)}
      ${googleCalendarButton(data)}
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
        ${actionsBlock
          ? "Puede administrar esta reserva con las opciones seguras disponibles a continuación."
          : `Si necesita cancelar o reprogramar su cita, por favor contacte directamente a ${data.businessName}.`}
      </p>
      ${actionsBlock}
    `),
  };
}

// ═══════════════════════════════════════════
// WELCOME EMAIL
// ═══════════════════════════════════════════

interface WelcomeEmailData {
  ownerName: string;
  businessName: string;
}

/** Email to owner when they register their account */
export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const dashboardUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  return {
    subject: "¡Bienvenido a Puragenda!",
    html: layout("¡Bienvenido!", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Hola ${data.ownerName}! </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Tu negocio <strong style="color:${BRAND};">${data.businessName}</strong> ha sido creado exitosamente en Puragenda.
      </p>
      <div style="margin:20px 0;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 12px;font-size:14px;color:#0f172a;font-weight:600;">Próximos pasos:</p>
        <ol style="margin:0;padding:0 0 0 20px;font-size:13px;color:#64748b;line-height:1.8;">
          <li>Configura tus <strong style="color:#0f172a;">servicios</strong> y precios</li>
          <li>Agrega a tus <strong style="color:#0f172a;">profesionales</strong></li>
          <li>Define tus <strong style="color:#0f172a;">horarios</strong> de atención</li>
          <li>Comparte tu <strong style="color:#0f172a;">widget de reservas</strong> con tus clientes</li>
        </ol>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${dashboardUrl}/dashboard" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Ir al Dashboard →
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">¿Necesitas ayuda? Responde a este email y te asistiremos.</p>
    `),
  };
}

// ═══════════════════════════════════════════
// STAFF INVITE EMAIL
// ═══════════════════════════════════════════

interface StaffInviteEmailData {
  staffName: string;
  businessName: string;
  email: string;
  tempPassword: string;
}

/** Email to staff member when they are added to a business */
export function staffInviteEmail(data: StaffInviteEmailData): { subject: string; html: string } {
  const loginUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  return {
    subject: `Te han invitado a ${data.businessName} — Puragenda`,
    html: layout("Invitación", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Hola ${data.staffName}! </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        <strong style="color:${BRAND};">${data.businessName}</strong> te ha agregado como profesional en Puragenda.
      </p>
      <div style="margin:20px 0;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 12px;font-size:14px;color:#0f172a;font-weight:600;">Tus credenciales de acceso:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#64748b;"> Email:</td>
            <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#64748b;"> Contraseña temporal:</td>
            <td style="padding:6px 0;font-size:15px;color:#0f172a;font-weight:700;font-family:monospace;letter-spacing:1px;">${data.tempPassword}</td>
          </tr>
        </table>
      </div>
      <div style="margin:16px 0;padding:14px;background:#fef3c7;border-radius:10px;border:1px solid #fde68a;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          <strong> Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.
        </p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${loginUrl}/login" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Iniciar Sesión →
        </a>
      </div>
    `),
  };
}

// ═══════════════════════════════════════════
// CANCELLATION EMAIL
// ═══════════════════════════════════════════

/** Email to client when booking is CANCELLED */
export function cancellationClientEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Cita cancelada en ${data.businessName}`,
    html: enterpriseLayout("Cita Cancelada", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Cita cancelada</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, le informamos que su cita en <strong style="color:#111827;">${data.businessName}</strong> ha sido cancelada.
      </p>
      ${enterpriseDetailsTable(data)}
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
        Lamentamos los inconvenientes. Si desea reagendar su cita, por favor contáctenos directamente.
      </p>
    `),
  };
}

// ═══════════════════════════════════════════
// FORGOT PASSWORD EMAIL
// ═══════════════════════════════════════════

interface ForgotPasswordEmailData {
  resetLink: string;
}

/** Email with reset password link */
export function forgotPasswordEmail(data: ForgotPasswordEmailData): { subject: string; html: string } {
  return {
    subject: "Restablecer tu contraseña — Puragenda",
    html: layout("Restablecer Contraseña", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Restablecer contraseña</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Puragenda.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${data.resetLink}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Restablecer Contraseña →
        </a>
      </div>
      <div style="margin:16px 0;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#64748b;">
          Este enlace expira en <strong style="color:#0f172a;">1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este email de forma segura.
        </p>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;text-align:center;">${data.resetLink}</p>
    `),
  };
}

// ═══════════════════════════════════════════
// SUPERADMIN LOGIN CODE EMAIL
// ═══════════════════════════════════════════

interface ClientPortalAccessEmailData {
  portalUrl: string;
  expiresInMinutes: number;
}

/** Passwordless, one-use access link for a client's appointments and rewards. */
export function clientPortalAccessEmail(data: ClientPortalAccessEmailData): { subject: string; html: string } {
  const safeUrl = escapeHtml(data.portalUrl);

  return {
    subject: "Entra a Mi agenda — Puragenda",
    html: layout("Acceso a Mi agenda", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Tu agenda, sin contraseña</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
        Usa este enlace para ver tus próximas citas, tu historial y tus premios en Puragenda.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Ver mi agenda →
        </a>
      </div>
      <div style="margin:16px 0;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
          El enlace vence en <strong style="color:#0f172a;">${data.expiresInMinutes} minutos</strong> y funciona una sola vez. Después, este dispositivo quedará autorizado de forma segura.
        </p>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
        Si no solicitaste este acceso, puedes ignorar el correo.
      </p>
    `),
  };
}

export function clientPortalVerificationEmail(data: { verificationUrl: string; name: string }) {
  const safeUrl = escapeHtml(data.verificationUrl);
  const safeName = escapeHtml(data.name);
  return {
    subject: "Confirma tu cuenta de cliente — Puragenda",
    html: layout("Activa Mi agenda", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Hola, ${safeName}</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
        Confirma tu correo una sola vez para guardar tus datos y reutilizarlos en futuras reservas.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">Activar mi cuenta →</a>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">El enlace vence en 60 minutos. Si no creaste esta cuenta, ignora este mensaje.</p>
    `),
  };
}

export function clientPortalPasswordResetEmail(data: { resetUrl: string }) {
  const safeUrl = escapeHtml(data.resetUrl);
  return {
    subject: "Restablece tu contraseña — Puragenda",
    html: layout("Recupera Mi agenda", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Restablece tu contraseña</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">Usa este enlace para elegir una contraseña nueva.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">Crear contraseña nueva →</a>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">El enlace vence en 60 minutos y funciona una sola vez.</p>
    `),
  };
}

interface AdminLoginCodeEmailData {
  name: string;
  code: string;
  expiresInMinutes: number;
}

export function adminLoginCodeEmail(data: AdminLoginCodeEmailData): { subject: string; html: string } {
  const safeName = escapeHtml(data.name);
  return {
    subject: "Tu código de acceso al panel — Puragenda",
    html: layout("Acceso seguro", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Hola, ${safeName}</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Usa este código para iniciar sesión en el panel de SuperAdmin:
      </p>
      <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;text-align:center;">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;line-height:1;letter-spacing:8px;font-weight:800;color:#5b21b6;">${data.code}</span>
      </div>
      <p style="margin:0;font-size:13px;color:#64748b;">
        El código vence en <strong style="color:#0f172a;">${data.expiresInMinutes} minutos</strong> y sólo puede utilizarse una vez.
      </p>
      <div style="margin:16px 0 0;padding:14px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa;">
        <p style="margin:0;font-size:12px;color:#9a3412;">
          Si no solicitaste este acceso, ignora el mensaje. Nunca compartas este código.
        </p>
      </div>
    `),
  };
}

// ═══════════════════════════════════════════
// NEW REGISTRATION ADMIN NOTIFICATION
// ═══════════════════════════════════════════

interface NewRegistrationData {
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  plan: string;
  hasTrial: boolean;
}

/** Email to platform admins when a new business registers */
export function newRegistrationAdminEmail(data: NewRegistrationData): { subject: string; html: string } {
  const trialBadge = data.hasTrial
    ? `<span style="display:inline-block;padding:4px 10px;background:#fef3c7;color:#92400e;border-radius:6px;font-size:12px;font-weight:600;"> Trial 30 días</span>`
    : `<span style="display:inline-block;padding:4px 10px;background:#dcfce7;color:#166534;border-radius:6px;font-size:12px;font-weight:600;"> Directo a pago</span>`;

  const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";

  return {
    subject: ` Nuevo registro: ${data.businessName} — Puragenda`,
    html: layout("Nuevo Registro", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Nuevo negocio registrado! </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Un nuevo negocio se ha registrado en Puragenda. Aquí los detalles:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin:16px 0;">
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;"> Negocio</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:600;">${data.businessName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;"> Dueño</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:500;">${data.ownerName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;"> Email</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:500;">${data.ownerEmail}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;"> Plan</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:500;">${data.plan}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;"> Estado</td>
          <td style="padding:10px 14px;">${trialBadge}</td>
        </tr>
      </table>
      <div style="text-align:center;margin:24px 0;">
        <a href="${appUrl}/para/x7k9m2v4q8" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Ver en Panel Admin →
        </a>
      </div>
    `),
  };
}

// ═══════════════════════════════════════════
// LOYALTY — STAMP EARNED (progress)
// ═══════════════════════════════════════════

interface LoyaltyStampEmailData {
  clientName: string;
  currentStamps: number;
  stampsRequired: number;
  rewardName: string;
  businessName: string;
  portalUrl: string;
}

/** Email to client when they earn a stamp but haven't reached the goal yet */
export function loyaltyStampEarnedEmail(data: LoyaltyStampEmailData): { subject: string; html: string } {
  const remaining = data.stampsRequired - data.currentStamps;
  const progressPct = Math.round((data.currentStamps / data.stampsRequired) * 100);

  // Build visual stamp dots
  const dots = Array.from({ length: data.stampsRequired }, (_, i) => {
    const filled = i < data.currentStamps;
    return `<span style="display:inline-block;width:24px;height:24px;margin:0 3px;border-radius:50%;${
      filled
        ? `background:${BRAND};box-shadow:0 0 8px ${BRAND}40;`
        : "background:#e2e8f0;"
    }"></span>`;
  }).join("");

  return {
    subject: `¡Ganaste un nuevo timbre en ${data.businessName}! `,
    html: layout("Nuevo Timbre", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Nuevo timbre sumado! </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Hola <strong style="color:#0f172a;">${data.clientName}</strong>, gracias por tu visita.
        Acabas de sumar un timbre en <strong style="color:${BRAND};">${data.businessName}</strong>.
      </p>

      <!-- Progress -->
      <div style="margin:20px 0;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;text-align:center;">
        <div style="margin-bottom:12px;">${dots}</div>
        <div style="background:#e2e8f0;border-radius:8px;height:8px;overflow:hidden;margin:0 auto;max-width:300px;">
          <div style="background:linear-gradient(90deg,${BRAND},${BRAND_DARK});height:100%;width:${progressPct}%;border-radius:8px;"></div>
        </div>
        <p style="margin:12px 0 0;font-size:22px;font-weight:700;color:#0f172a;">
          ${data.currentStamps} <span style="color:#94a3b8;font-size:14px;font-weight:400;">de</span> ${data.stampsRequired}
        </p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">
          Te ${remaining === 1 ? "falta <strong>1 visita</strong>" : `faltan <strong>${remaining} visitas</strong>`} para ganar tu <strong style="color:${BRAND};">${data.rewardName}</strong>
        </p>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${data.portalUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Ver mis timbres →
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">¡Sigue así, cada visita cuenta!</p>
    `),
  };
}

// ═══════════════════════════════════════════
// LOYALTY — REWARD WON
// ═══════════════════════════════════════════

interface LoyaltyRewardEmailData {
  clientName: string;
  stampsRequired: number;
  rewardName: string;
  rewardCode: string;
  discountType: string;
  discountValue: number;
  businessName: string;
  portalUrl: string;
}

/** Email to client when they complete their stamp card and win a reward */
export function loyaltyRewardWonEmail(data: LoyaltyRewardEmailData): { subject: string; html: string } {
  const discountLabel =
    data.discountType === "PERCENTAGE"
      ? `${data.discountValue}% de descuento`
      : `$${data.discountValue.toLocaleString()} de descuento`;

  return {
    subject: `¡Llegaste a la meta! Aquí tienes tu premio de ${data.businessName} `,
    html: layout("¡Premio Ganado!", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Felicidades, completaste tu tarjeta! </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        <strong style="color:#0f172a;">${data.clientName}</strong>, completaste tus <strong>${data.stampsRequired} visitas</strong> en
        <strong style="color:${BRAND};">${data.businessName}</strong>. ¡Aquí tienes tu premio!
      </p>

      <!-- Reward card -->
      <div style="margin:20px 0;padding:24px;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});border-radius:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">Tu premio</p>
        <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#fff;">${data.rewardName}</p>
        <div style="background:rgba(255,255,255,0.15);border:2px dashed rgba(255,255,255,0.4);border-radius:12px;padding:16px;margin:0 auto;max-width:280px;">
          <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">Código</p>
          <p style="margin:0;font-size:28px;font-weight:800;color:#fff;letter-spacing:3px;font-family:monospace;">${data.rewardCode}</p>
        </div>
        <p style="margin:12px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">${discountLabel}</p>
      </div>

      <div style="margin:16px 0;padding:14px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
        <p style="margin:0;font-size:13px;color:#166534;">
          <strong> ¿Cómo canjearlo?</strong> Presenta este código en tu próxima reserva en ${data.businessName}.
        </p>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${data.portalUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Ir a mi portal de premios →
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">¡Gracias por tu preferencia! Tu tarjeta se ha reiniciado para seguir acumulando.</p>
    `),
  };
}

// ═══════════════════════════════════════════
// APPOINTMENT REMINDER (day before)
// ═══════════════════════════════════════════

interface ReminderEmailData extends LocalizedEmailData {
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  businessName: string;
  timezone?: string;
  businessAddress?: string | null;
  businessMapsUrl?: string | null;
  confirmUrl: string;
  cancelUrl: string;
}

/** Email to client the day before their appointment */
export function reminderEmail(data: ReminderEmailData): { subject: string; html: string } {
  const timezone = data.timezone || BUSINESS_TZ;
  const dateStr = formatInTimeZone(data.startTime, timezone, "PPPP", { locale: getDateLocale(data.locale ?? "es") });
  const timeStr = formatInTimeZone(data.startTime, timezone, "HH:mm");
  const timeEnd = formatInTimeZone(data.endTime, timezone, "HH:mm");

  return {
    subject: `Recordatorio de tu cita en ${data.businessName}`,
    html: layout("Recordatorio de Cita", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Recordatorio de tu cita de mañana </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Hola <strong style="color:#0f172a;">${data.customerName}</strong>, te recordamos que mañana tienes una cita en <strong style="color:${BRAND};">${data.businessName}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin:16px 0;">
        ${detailRow(" Fecha", dateStr)}
        ${detailRow(" Hora", `${timeStr} - ${timeEnd}`)}
        ${detailRow(" Zona horaria", escapeHtml(timezone))}
        ${detailRow(" Servicio", data.serviceName)}
        ${detailRow(" Profesional", data.staffName)}
      </table>
      <div style="margin:20px 0;padding:16px;background:linear-gradient(135deg,${BRAND}10,${BRAND}05);border-radius:10px;border:1px solid ${BRAND}30;">
        <p style="margin:0;font-size:15px;color:${BRAND_DARK};text-align:center;font-weight:600;">
          Te esperamos mañana a las ${timeStr} 
        </p>
      </div>

      <!-- Action Buttons -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td align="center" style="padding:0 4px;">
            <a href="${data.confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;box-shadow:0 2px 8px rgba(16,185,129,0.25);">
              ✓ Confirmar Asistencia
            </a>
          </td>
          <td align="center" style="padding:0 4px;">
            <a href="${data.cancelUrl}" style="display:inline-block;background:#fff;color:#ef4444;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;border:2px solid #fecaca;">
              ✕ Cancelar Cita
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Si tienes dudas, contacta directamente a ${data.businessName}.</p>
    `),
  };
}

// ═══════════════════════════════════════════
// MARKETING CAMPAIGN EMAIL
// ═══════════════════════════════════════════

interface MarketingCampaignEmailData {
  clientName: string;
  businessName: string;
  subject: string;
  body: string;
  widgetUrl: string;
}

/**
 * Premium marketing campaign email with business branding.
 * Uses a custom layout with the business name prominently displayed.
 */
export function marketingCampaignEmail(data: MarketingCampaignEmailData): { subject: string; html: string } {
  // Convert newlines in body to <br> for HTML
  const htmlBody = data.body.replace(/\n/g, "<br>");

  return {
    subject: data.subject,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${data.subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.08);">
  <!-- Premium Header with Business Branding -->
  <tr><td style="background:linear-gradient(135deg,${BRAND},${BRAND_DARK});padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:32px 32px 24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;">Un mensaje especial de</p>
        <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${data.businessName}</h1>
      </td></tr>
      <!-- Decorative wave -->
      <tr><td style="height:24px;background:#ffffff;border-radius:24px 24px 0 0;"></td></tr>
    </table>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="padding:8px 32px 0;">
    <h2 style="margin:0 0 4px;font-size:20px;color:#0f172a;font-weight:700;">¡Hola ${data.clientName}! </h2>
    <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">Te extrañamos en ${data.businessName}</p>
    <div style="width:40px;height:3px;background:linear-gradient(90deg,${BRAND},${BRAND_DARK});border-radius:2px;margin:16px 0;"></div>
  </td></tr>

  <!-- Campaign Message -->
  <tr><td style="padding:0 32px 24px;">
    <div style="font-size:15px;line-height:1.7;color:#334155;">
      ${htmlBody}
    </div>
  </td></tr>

  <!-- CTA Button -->
  <tr><td style="padding:0 32px 32px;text-align:center;">
    <a href="${data.widgetUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(124,58,237,0.35);letter-spacing:0.3px;">
      Agendar mi cita ahora →
    </a>
    <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Reserva en pocos clics</p>
  </td></tr>

  ${CLIENT_PORTAL_SLOT}

  <!-- Divider -->
  <tr><td style="padding:0 32px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);"></div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;text-align:center;">
    <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;">
      Enviado por <strong>${data.businessName}</strong> vía Puragenda
    </p>
    <p style="margin:0;font-size:11px;color:#cbd5e1;">
      Si no deseas recibir estos correos, contacta directamente a ${data.businessName}.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
  };
}

// ═══════════════════════════════════════════
// TRIAL EXPIRING WARNING (3 days before)
// ═══════════════════════════════════════════

interface TrialExpiringEmailData {
  ownerName: string;
  businessName: string;
  plan: string;
  daysLeft: number;
}

/** Email to owner when trial is about to expire */
export function trialExpiringEmail(data: TrialExpiringEmailData): { subject: string; html: string } {
  const planLabel = data.plan === "EQUIPO" ? "Equipo" : "Individual";
  const pricingUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl/pricing" : "http://localhost:3000/pricing";

  return {
    subject: `Tu prueba gratuita expira en ${data.daysLeft} días — Puragenda`,
    html: layout("Prueba por Expirar", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Tu prueba gratuita está por terminar</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Hola <strong style="color:#0f172a;">${data.ownerName}</strong>, tu periodo de prueba del
        <strong style="color:${BRAND};">Plan ${planLabel}</strong> para
        <strong style="color:#0f172a;">${data.businessName}</strong> expira en
        <strong style="color:#ef4444;">${data.daysLeft} días</strong>.
      </p>
      <div style="margin:20px 0;padding:20px;background:#fef3c7;border-radius:12px;border:1px solid #fde68a;">
        <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
          <strong>⚠️ Importante:</strong> Al finalizar tu prueba, tu cuenta será pausada hasta que actives tu suscripción.
          No perderás tus datos, pero no podrás acceder al dashboard.
        </p>
      </div>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Para mantener tu acceso sin interrupciones, activa tu plan ahora:
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${pricingUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Activar mi Plan ${planLabel} →
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">¿Tienes dudas? Responde a este email y te ayudamos.</p>
    `),
  };
}

// ═══════════════════════════════════════════
// TRIAL EXPIRED
// ═══════════════════════════════════════════

interface TrialExpiredEmailData {
  ownerName: string;
  businessName: string;
  plan: string;
}

/** Email to owner when trial has expired */
export function trialExpiredEmail(data: TrialExpiredEmailData): { subject: string; html: string } {
  const planLabel = data.plan === "EQUIPO" ? "Equipo" : "Individual";
  const pricingUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl/pricing" : "http://localhost:3000/pricing";

  return {
    subject: `Tu prueba gratuita ha finalizado — Puragenda`,
    html: layout("Prueba Finalizada", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Tu prueba gratuita ha finalizado</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Hola <strong style="color:#0f172a;">${data.ownerName}</strong>, el periodo de prueba del
        <strong style="color:${BRAND};">Plan ${planLabel}</strong> para
        <strong style="color:#0f172a;">${data.businessName}</strong> ha finalizado.
      </p>
      <div style="margin:20px 0;padding:20px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;">
        <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.6;">
          Tu cuenta ha sido pausada. Para volver a acceder a tu dashboard y seguir recibiendo reservas,
          activa tu suscripción al <strong>Plan ${planLabel}</strong>.
        </p>
      </div>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        No te preocupes — todos tus datos, clientes y configuraciones están guardados y listos para cuando actives tu plan.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${pricingUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Activar mi Plan ${planLabel} →
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">¿Necesitas ayuda? Responde a este email.</p>
    `),
  };
}

// ═══════════════════════════════════════════
// APPOINTMENT ACTION — OWNER NOTIFICATION
// ═══════════════════════════════════════════

interface AppointmentActionEmailData extends LocalizedEmailData {
  action: "confirmed" | "cancelled";
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  businessName: string;
  timezone?: string;
}

/** Email to business owner when customer confirms or cancels via reminder link */
export function appointmentActionOwnerEmail(data: AppointmentActionEmailData): { subject: string; html: string } {
  const timezone = data.timezone || BUSINESS_TZ;
  const dateStr = formatInTimeZone(data.startTime, timezone, "PPPP", { locale: getDateLocale(data.locale ?? "es") });
  const timeStr = formatInTimeZone(data.startTime, timezone, "HH:mm");
  const timeEnd = formatInTimeZone(data.endTime, timezone, "HH:mm");

  const isConfirm = data.action === "confirmed";
  const title = isConfirm ? "Asistencia confirmada" : "Cita cancelada por el cliente";
  const subtitle = isConfirm
    ? `<strong style="color:#0f172a;">${data.customerName}</strong> ha confirmado su asistencia a la siguiente cita:`
    : `<strong style="color:#0f172a;">${data.customerName}</strong> ha cancelado la siguiente cita:`;
  const statusBadge = isConfirm
    ? `<div style="margin:16px 0;padding:14px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
        <p style="margin:0;font-size:14px;color:#166534;text-align:center;font-weight:600;">✓ Asistencia Confirmada</p>
       </div>`
    : `<div style="margin:16px 0;padding:14px;background:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
        <p style="margin:0;font-size:14px;color:#991b1b;text-align:center;font-weight:600;">✕ Cita Cancelada</p>
       </div>`;

  const dashboardUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl/dashboard" : "http://localhost:3000/dashboard";

  return {
    subject: `${isConfirm ? "✓" : "✕"} ${data.customerName} ${isConfirm ? "confirmó" : "canceló"} su cita — ${data.businessName}`,
    html: enterpriseLayout(title, `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">${title}</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
        ${subtitle}
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;display:table;">
        <tr>
          <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;width:35%;">Fecha</td>
          <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #E5E7EB;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;width:35%;">Hora</td>
          <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #E5E7EB;">${timeStr} - ${timeEnd}</td>
        </tr>
        <tr>
          <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;width:35%;">Servicio</td>
          <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #E5E7EB;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;width:35%;">Profesional</td>
          <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;">${data.staffName}</td>
        </tr>
      </table>
      ${statusBadge}
      <div style="text-align:center;margin:24px 0;">
        <a href="${dashboardUrl}" style="display:inline-block;padding:12px 32px;background:#E5E7EB;color:#374151;text-decoration:none;font-size:14px;font-weight:600;border-radius:10px;">
          Ver en Dashboard →
        </a>
      </div>
    `),
  };
}

export function appointmentActionStaffEmail(data: AppointmentActionEmailData): { subject: string; html: string } {
  const timezone = data.timezone || BUSINESS_TZ;
  const dateStr = formatInTimeZone(data.startTime, timezone, "PPPP", { locale: getDateLocale(data.locale ?? "es") });
  const timeStr = formatInTimeZone(data.startTime, timezone, "HH:mm");
  const timeEnd = formatInTimeZone(data.endTime, timezone, "HH:mm");
  const isConfirm = data.action === "confirmed";
  const title = isConfirm ? "Cita confirmada" : "Cita cancelada";
  const message = isConfirm
    ? `La cita de ${data.customerName} que tienes asignada fue confirmada.`
    : `La cita de ${data.customerName} que tienes asignada fue cancelada.`;
  const badge = isConfirm
    ? `<div style="margin:16px 0;padding:14px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
        <p style="margin:0;font-size:14px;color:#166534;text-align:center;font-weight:600;">Cita confirmada</p>
       </div>`
    : `<div style="margin:16px 0;padding:14px;background:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
        <p style="margin:0;font-size:14px;color:#991b1b;text-align:center;font-weight:600;">Cita cancelada</p>
       </div>`;

  return {
    subject: `${title}: ${data.serviceName} con ${data.customerName}`,
    html: enterpriseLayout(title, `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">${title}</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">${message}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;display:table;">
        <tr>
          <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;width:35%;">Fecha</td>
          <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #E5E7EB;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;width:35%;">Hora</td>
          <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #E5E7EB;">${timeStr} - ${timeEnd}</td>
        </tr>
        <tr>
          <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;border-bottom:1px solid #E5E7EB;width:35%;">Servicio</td>
          <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #E5E7EB;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;width:35%;">Negocio</td>
          <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;">${data.businessName}</td>
        </tr>
      </table>
      ${badge}
    `),
  };
}

// ═══════════════════════════════════════════
// RECURRING BOOKING EMAILS
// ═══════════════════════════════════════════

const DAY_NAMES: Record<number, string> = {
  0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miercoles",
  4: "Jueves", 5: "Viernes", 6: "Sabado",
};

function recurringSessionsTable(
  selectedDays: number[],
  selectedTimes: Record<string, string>,
  startDate: Date,
  endDate: Date,
  timezone: string,
  locale: AppLocale = "es",
): string {
  const rows = selectedDays.map((day) => {
    const time = selectedTimes[String(day)] ?? "";
    return `<tr>
      <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #E5E7EB;">${DAY_NAMES[day] ?? day}</td>
      <td style="padding:12px 16px;font-size:14px;color:#374151;border-bottom:1px solid #E5E7EB;">${time}</td>
    </tr>`;
  }).join("");

  // Recurring plan boundaries are date-only DB values represented at UTC midnight.
  // Formatting them in the business timezone can shift western timezones one day back.
  const dateLocale = getDateLocale(locale);
  const start = formatInTimeZone(startDate, "UTC", "PPP", { locale: dateLocale });
  const end = formatInTimeZone(endDate, "UTC", "PPP", { locale: dateLocale });

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Dia</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Hora</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:8px 0 16px;font-size:12px;color:#6B7280;">Todos los horarios corresponden a ${escapeHtml(timezone)}.</p>
    <p style="margin:0 0 16px;font-size:13px;color:#6B7280;">Periodo: <strong style="color:#111827;">${start}</strong> al <strong style="color:#111827;">${end}</strong></p>
  `;
}

interface RecurringCreatedClientData extends LocalizedEmailData {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  selectedDays: number[];
  selectedTimes: Record<string, string>;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  conflicts: Date[];
  managementToken: string;
  businessName: string;
  timezone?: string;
}

export function recurringBookingCreatedClientEmail(data: RecurringCreatedClientData): { subject: string; html: string } {
  const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const portalUrl = `${appUrl}/mi-plan/${data.managementToken}`;

  const conflictsHtml = data.conflicts.length > 0
    ? `<div style="margin:16px 0;padding:16px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;">
        <p style="margin:0 0 8px;font-size:13px;color:#92400E;font-weight:700;">Atencion: hay ${data.conflicts.length} sesion(es) con conflicto de horario</p>
        <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">
          Las siguientes fechas no pudieron ser agendadas porque ya tenian turnos ocupados: 
          ${data.conflicts.map(d => formatInTimeZone(d, data.timezone || BUSINESS_TZ, "MMM d", { locale: getDateLocale(data.locale ?? "es") })).join(", ")}.
          El negocio te contactara para coordinar esas sesiones.
        </p>
      </div>`
    : "";

  return {
    subject: `Tu plan recurrente en ${data.businessName} esta confirmado`,
    html: enterpriseLayout("Plan Recurrente Confirmado", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Tu suscripcion esta activa</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, tu plan de 
        <strong style="color:#111827;">${data.serviceName}</strong> por <strong style="color:#111827;">${data.durationMonths} mes(es)</strong>
        en <strong style="color:#111827;">${data.businessName}</strong> ha sido confirmado.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151;font-weight:600;">Tus sesiones semanales:</p>
      ${recurringSessionsTable(data.selectedDays, data.selectedTimes, data.startDate, data.endDate, data.timezone || BUSINESS_TZ, data.locale)}
      ${conflictsHtml}
      <div style="text-align:center;margin:24px 0;">
        <a href="${portalUrl}" style="display:inline-block;padding:12px 32px;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">
          Ver y gestionar mi plan
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">Desde ese link puedes cambiar horarios, pausar o cancelar tu plan.</p>
    `),
  };
}

interface RecurringPendingApprovalBusinessData extends LocalizedEmailData {
  ownerEmail: string;
  ownerName: string | null | undefined;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  serviceName: string;
  selectedDays: number[];
  selectedTimes: Record<string, string>;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  healthAnswers?: Record<string, string>;
  healthFreeText?: string;
  businessName: string;
  timezone?: string;
}

export function recurringBookingPendingApprovalBusinessEmail(data: RecurringPendingApprovalBusinessData): { subject: string; html: string } {
  const dashboardUrl = process.env.NODE_ENV === "production"
    ? "https://www.puragenda.cl/dashboard/recurring"
    : "http://localhost:3000/dashboard/recurring";

  const healthHtml = (data.healthAnswers && Object.keys(data.healthAnswers).length > 0) || data.healthFreeText
    ? `<div style="margin:16px 0;padding:16px;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;">
        <p style="margin:0 0 8px;font-size:13px;color:#0369A1;font-weight:700;">Informacion de salud del cliente</p>
        ${Object.entries(data.healthAnswers ?? {}).map(([q, a]) =>
          `<p style="margin:0 0 4px;font-size:13px;color:#374151;"><strong>${q}:</strong> ${a}</p>`
        ).join("")}
        ${data.healthFreeText ? `<p style="margin:8px 0 0;font-size:13px;color:#374151;"><strong>Comentarios:</strong> ${data.healthFreeText}</p>` : ""}
      </div>`
    : "";

  return {
    subject: `Nueva solicitud de plan recurrente de ${data.customerName} - requiere aprobacion`,
    html: enterpriseLayout("Nueva Solicitud de Plan Recurrente", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Nueva solicitud de suscripcion</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
        <strong style="color:#111827;">${data.customerName}</strong> (${data.customerEmail}) solicito un plan recurrente de
        <strong style="color:#111827;">${data.serviceName}</strong> por <strong style="color:#111827;">${data.durationMonths} mes(es)</strong>.
      </p>
      ${recurringSessionsTable(data.selectedDays, data.selectedTimes, data.startDate, data.endDate, data.timezone || BUSINESS_TZ, data.locale)}
      ${data.customerAddress ? `<div style="margin:0 0 16px;padding:16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;"><p style="margin:0 0 6px;font-size:12px;color:#6B7280;text-transform:uppercase;font-weight:600;">Direccion de las visitas</p><p style="margin:0;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(data.customerAddress)}</p></div>` : ""}
      ${healthHtml}
      <div style="margin:16px 0;padding:16px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#92400E;font-weight:600;">Esta solicitud requiere tu aprobacion antes de activarse.</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${dashboardUrl}" style="display:inline-block;padding:12px 32px;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">
          Revisar en el Dashboard
        </a>
      </div>
    `),
  };
}

interface RecurringApprovedClientData extends LocalizedEmailData {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  startDate: Date;
  endDate: Date;
  managementToken: string;
  businessName: string;
  timezone?: string;
}

export function recurringBookingApprovedClientEmail(data: RecurringApprovedClientData): { subject: string; html: string } {
  const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const portalUrl = `${appUrl}/mi-plan/${data.managementToken}`;
  const dateLocale = getDateLocale(data.locale ?? "es");
  const start = formatInTimeZone(data.startDate, "UTC", "PPP", { locale: dateLocale });
  const end = formatInTimeZone(data.endDate, "UTC", "PPP", { locale: dateLocale });

  return {
    subject: `Tu plan en ${data.businessName} fue aprobado`,
    html: enterpriseLayout("Plan Aprobado", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Tu solicitud fue aprobada</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, 
        <strong style="color:#111827;">${data.businessName}</strong> aprobo tu plan de 
        <strong style="color:#111827;">${data.serviceName}</strong>.
      </p>
      <div style="margin:16px 0;padding:16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;">
        <p style="margin:0 0 4px;font-size:14px;color:#166534;font-weight:700;">Plan activo</p>
        <p style="margin:0;font-size:13px;color:#166534;">${start} al ${end}</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${portalUrl}" style="display:inline-block;padding:12px 32px;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">
          Ver mi plan
        </a>
      </div>
    `),
  };
}

interface RecurringRejectedClientData {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  reason: string;
  businessName: string;
  timezone?: string;
}

export function recurringBookingRejectedClientEmail(data: RecurringRejectedClientData): { subject: string; html: string } {
  return {
    subject: `Solicitud de plan no aprobada - ${data.businessName}`,
    html: enterpriseLayout("Solicitud No Aprobada", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Tu solicitud no fue aprobada</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, lamentablemente tu solicitud de plan de
        <strong style="color:#111827;">${data.serviceName}</strong> en 
        <strong style="color:#111827;">${data.businessName}</strong> no fue aprobada.
      </p>
      ${data.reason ? `<div style="margin:16px 0;padding:16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;">
        <p style="margin:0 0 4px;font-size:13px;color:#991B1B;font-weight:700;">Motivo:</p>
        <p style="margin:0;font-size:13px;color:#991B1B;line-height:1.5;">${data.reason}</p>
      </div>` : ""}
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
        Si tienes dudas, por favor contacta directamente a ${data.businessName}.
      </p>
    `),
  };
}

interface RecurringCancelledClientData {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  businessName: string;
}

export function recurringBookingCancelledClientEmail(data: RecurringCancelledClientData): { subject: string; html: string } {
  return {
    subject: `Tu plan en ${data.businessName} fue cancelado`,
    html: enterpriseLayout("Plan Cancelado", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Tu plan ha sido cancelado</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, tu plan de 
        <strong style="color:#111827;">${data.serviceName}</strong> en 
        <strong style="color:#111827;">${data.businessName}</strong> ha sido cancelado.
        Todos los turnos futuros fueron eliminados de la agenda.
      </p>
      <p style="margin:0;font-size:14px;color:#6B7280;">Si necesitas mas informacion, contacta a ${data.businessName}.</p>
    `),
  };
}

interface RecurringSessionCancelledClientData extends LocalizedEmailData {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  sessionDate: Date;
  businessName: string;
  timezone?: string;
}

export function recurringSessionCancelledClientEmail(data: RecurringSessionCancelledClientData): { subject: string; html: string } {
  const dateStr = formatInTimeZone(data.sessionDate, data.timezone || BUSINESS_TZ, "PPPP", { locale: getDateLocale(data.locale ?? "es") });

  return {
    subject: `Tu sesion del ${dateStr} fue cancelada - ${data.businessName}`,
    html: enterpriseLayout("Sesion Cancelada", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Una sesion de tu plan fue cancelada</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, la sesion de 
        <strong style="color:#111827;">${data.serviceName}</strong> del dia 
        <strong style="color:#111827;">${dateStr}</strong> fue cancelada porque el profesional no esta disponible ese dia.
      </p>
      <p style="margin:0;font-size:14px;color:#6B7280;">El resto de tus sesiones del plan continuan con normalidad. Para mas informacion contacta a ${data.businessName}.</p>
    `),
  };
}

interface RecurringExpiringClientData extends LocalizedEmailData {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  endDate: Date;
  daysLeft: number;
  renewalMessage?: string | null;
  managementToken: string;
  businessName: string;
  timezone?: string;
}

export function recurringExpiringClientEmail(data: RecurringExpiringClientData): { subject: string; html: string } {
  const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const portalUrl = `${appUrl}/mi-plan/${data.managementToken}`;
  const endStr = formatInTimeZone(data.endDate, "UTC", "PPP", { locale: getDateLocale(data.locale ?? "es") });

  return {
    subject: `Tu plan en ${data.businessName} vence en ${data.daysLeft} dias`,
    html: enterpriseLayout("Plan por Vencer", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Tu plan esta por terminar</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, tu plan de 
        <strong style="color:#111827;">${data.serviceName}</strong> en 
        <strong style="color:#111827;">${data.businessName}</strong> vence el 
        <strong style="color:#111827;">${endStr}</strong> (en ${data.daysLeft} dias).
      </p>
      ${data.renewalMessage
        ? `<div style="margin:16px 0;padding:16px;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;">
            <p style="margin:0;font-size:14px;color:#0369A1;line-height:1.6;">${data.renewalMessage}</p>
          </div>`
        : ""}
      <div style="text-align:center;margin:24px 0;">
        <a href="${portalUrl}" style="display:inline-block;padding:12px 32px;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">
          Ver mi plan
        </a>
      </div>
    `),
  };
}

interface RecurringExpiringBusinessData extends LocalizedEmailData {
  ownerEmail: string;
  customerName: string;
  serviceName: string;
  endDate: Date;
  daysLeft: number;
  businessName: string;
  timezone?: string;
}

export function recurringExpiringBusinessEmail(data: RecurringExpiringBusinessData): { subject: string; html: string } {
  const dashboardUrl = process.env.NODE_ENV === "production"
    ? "https://www.puragenda.cl/dashboard/recurring"
    : "http://localhost:3000/dashboard/recurring";
  const endStr = formatInTimeZone(data.endDate, "UTC", "PPP", { locale: getDateLocale(data.locale ?? "es") });

  return {
    subject: `El plan de ${data.customerName} vence en ${data.daysLeft} dias`,
    html: enterpriseLayout("Plan de Cliente por Vencer", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Un plan esta por terminar</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
        El plan de <strong style="color:#111827;">${data.customerName}</strong> para 
        <strong style="color:#111827;">${data.serviceName}</strong> vence el 
        <strong style="color:#111827;">${endStr}</strong> (en ${data.daysLeft} dias).
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">Podes contactarlo para ofrecerle renovar su plan.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${dashboardUrl}" style="display:inline-block;padding:12px 32px;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">
          Ver Suscripciones
        </a>
      </div>
    `),
  };
}

// ═══════════════════════════════════════════
// RECURRING — CONFLICT WARNING (Email 8)
// ═══════════════════════════════════════════

interface RecurringConflictWarningClientData extends LocalizedEmailData {
  customerName: string;
  serviceName: string;
  originalDate: Date;
  businessName: string;
  timezone?: string;
}

/** Email to client warning about a conflict/override on a specific recurring session */
export function recurringConflictWarningClientEmail(data: RecurringConflictWarningClientData): { subject: string; html: string } {
  const dateStr = formatInTimeZone(data.originalDate, data.timezone || BUSINESS_TZ, "PPPP", { locale: getDateLocale(data.locale ?? "es") });

  return {
    subject: `Tu sesion del ${dateStr} tiene un cambio pendiente - ${data.businessName}`,
    html: enterpriseLayout("Cambio en tu Sesion", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Cambio en una de tus sesiones</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, te informamos que tu sesion de
        <strong style="color:#111827;">${data.serviceName}</strong> programada para el dia
        <strong style="color:#111827;">${dateStr}</strong> en
        <strong style="color:#111827;">${data.businessName}</strong> tiene un cambio pendiente.
      </p>
      <div style="margin:16px 0;padding:16px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;">
        <p style="margin:0;font-size:14px;color:#92400E;line-height:1.5;">
          <strong>Aviso:</strong> Es posible que esta sesion haya sido reprogramada o cancelada
          debido a un cambio en la disponibilidad del profesional. Revisa el detalle de tu plan para mas informacion.
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">El resto de tus sesiones continuan con normalidad. Si tienes dudas, contacta directamente a ${data.businessName}.</p>
    `),
  };
}

interface SubscriptionPaymentFailedEmailData extends LocalizedEmailData {
  ownerName?: string | null;
  businessName: string;
  gracePeriodEndsAt: Date;
  nextPaymentAttemptAt?: Date | null;
  amount?: number | null;
  finalWarning?: boolean;
}

export function subscriptionPaymentFailedEmail(
  data: SubscriptionPaymentFailedEmailData
): { subject: string; html: string } {
  const dashboardUrl =
    process.env.NODE_ENV === "production"
      ? "https://www.puragenda.cl/dashboard"
      : "http://localhost:3000/dashboard";
  const graceEnd = formatInTimeZone(
    data.gracePeriodEndsAt,
    BUSINESS_TZ,
    "PPPp",
    { locale: getDateLocale(data.locale ?? "es") }
  );
  const nextAttempt = data.nextPaymentAttemptAt
    ? formatInTimeZone(
        data.nextPaymentAttemptAt,
        BUSINESS_TZ,
        "PPPp",
        { locale: getDateLocale(data.locale ?? "es") }
      )
    : null;
  const amount =
    data.amount && data.amount > 0
      ? `$${Math.round(data.amount).toLocaleString("es-CL")}`
      : null;

  return {
    subject: data.finalWarning
      ? "Tu periodo de gracia está por terminar — Puragenda"
      : "No pudimos cobrar tu suscripción — Puragenda",
    html: layout("Pago pendiente", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">
        ${data.finalWarning ? "Tu periodo de gracia está por terminar" : "No pudimos procesar tu pago"}
      </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
        Hola <strong style="color:#0f172a;">${escapeHtml(data.ownerName || "hola")}</strong>.
        El cobro${amount ? ` de <strong style="color:#0f172a;">${amount}</strong>` : ""}
        de la suscripción de <strong style="color:#0f172a;">${escapeHtml(data.businessName)}</strong>
        no pudo completarse.
      </p>
      <div style="margin:20px 0;padding:20px;background:#fff7ed;border-radius:12px;border:1px solid #fed7aa;">
        <p style="margin:0;font-size:14px;color:#9a3412;line-height:1.6;">
          Mantendremos el acceso hasta el <strong>${graceEnd}</strong>.
          ${nextAttempt ? `Mercado Pago tiene otro intento previsto para el <strong>${nextAttempt}</strong>.` : "Puedes reautorizar tu tarjeta desde el dashboard."}
        </p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          Regularizar pago
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
        Tus datos no se eliminarán. Si necesitas ayuda, responde a este correo.
      </p>
    `),
  };
}

interface SubscriptionPaymentRecoveredEmailData extends LocalizedEmailData {
  ownerName?: string | null;
  businessName: string;
  periodEnd: Date;
}

export function subscriptionPaymentRecoveredEmail(
  data: SubscriptionPaymentRecoveredEmailData
): { subject: string; html: string } {
  const periodEnd = formatInTimeZone(
    data.periodEnd,
    BUSINESS_TZ,
    "PPP",
    { locale: getDateLocale(data.locale ?? "es") }
  );

  return {
    subject: "Pago recibido y acceso normalizado — Puragenda",
    html: layout("Pago recibido", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Tu suscripción está al día</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
        Hola <strong style="color:#0f172a;">${escapeHtml(data.ownerName || "hola")}</strong>.
        Recibimos el pago de la suscripción de
        <strong style="color:#0f172a;">${escapeHtml(data.businessName)}</strong>.
      </p>
      <div style="margin:20px 0;padding:20px;background:#ecfdf5;border-radius:12px;border:1px solid #a7f3d0;">
        <p style="margin:0;font-size:14px;color:#065f46;line-height:1.6;">
          El acceso está activo y el periodo pagado se extiende hasta el <strong>${periodEnd}</strong>.
        </p>
      </div>
    `),
  };
}
