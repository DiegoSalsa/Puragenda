import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

// Zona horaria por defecto para formatear fechas en emails
const BUSINESS_TZ = "America/Santiago";

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
  const date = formatInTimeZone(data.startTime, BUSINESS_TZ, "EEEE, d 'de' MMMM yyyy", { locale: es });
  const time = `${formatInTimeZone(data.startTime, BUSINESS_TZ, "HH:mm")} - ${formatInTimeZone(data.endTime, BUSINESS_TZ, "HH:mm")}`;
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
  const dateStr = formatInTimeZone(data.startTime, BUSINESS_TZ, "EEEE, d 'de' MMMM", { locale: es });
  const timeStr = formatInTimeZone(data.startTime, BUSINESS_TZ, "HH:mm");
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

// ═══════════════════════════════════════════
// WELCOME EMAIL
// ═══════════════════════════════════════════

interface WelcomeEmailData {
  ownerName: string;
  businessName: string;
}

/** Email to owner when they register their account */
export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    subject: "¡Bienvenido a Puragenda!",
    html: layout("¡Bienvenido!", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Hola ${data.ownerName}! 🎉</h2>
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
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    subject: `Te han invitado a ${data.businessName} — Puragenda`,
    html: layout("Invitación", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Hola ${data.staffName}! 👋</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        <strong style="color:${BRAND};">${data.businessName}</strong> te ha agregado como profesional en Puragenda.
      </p>
      <div style="margin:20px 0;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 12px;font-size:14px;color:#0f172a;font-weight:600;">Tus credenciales de acceso:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#64748b;">📧 Email:</td>
            <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#64748b;">🔑 Contraseña temporal:</td>
            <td style="padding:6px 0;font-size:15px;color:#0f172a;font-weight:700;font-family:monospace;letter-spacing:1px;">${data.tempPassword}</td>
          </tr>
        </table>
      </div>
      <div style="margin:16px 0;padding:14px;background:#fef3c7;border-radius:10px;border:1px solid #fde68a;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          <strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.
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
    subject: `Tu cita ha sido cancelada — ${data.businessName}`,
    html: layout("Cita Cancelada", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Cita cancelada</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Hola <strong style="color:#0f172a;">${data.customerName}</strong>, lamentamos informarte que tu cita en <strong style="color:${BRAND};">${data.businessName}</strong> ha sido cancelada.
      </p>
      ${detailsTable(data)}
      <div style="margin:20px 0;padding:16px;background:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
          <strong>Estado: Cancelada</strong> — Si deseas reagendar, visita nuestro sitio web o contacta directamente a ${data.businessName}.
        </p>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">Disculpa las molestias. Esperamos verte pronto.</p>
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
    ? `<span style="display:inline-block;padding:4px 10px;background:#fef3c7;color:#92400e;border-radius:6px;font-size:12px;font-weight:600;">🆓 Trial 30 días</span>`
    : `<span style="display:inline-block;padding:4px 10px;background:#dcfce7;color:#166534;border-radius:6px;font-size:12px;font-weight:600;">💰 Directo a pago</span>`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    subject: `🚀 Nuevo registro: ${data.businessName} — Puragenda`,
    html: layout("Nuevo Registro", `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">¡Nuevo negocio registrado! 🎉</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Un nuevo negocio se ha registrado en Puragenda. Aquí los detalles:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin:16px 0;">
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;">🏢 Negocio</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:600;">${data.businessName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;">👤 Dueño</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:500;">${data.ownerName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;">📧 Email</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:500;">${data.ownerEmail}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;">📦 Plan</td>
          <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:500;">${data.plan}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;white-space:nowrap;">🎫 Estado</td>
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

