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
  businessAddress?: string | null;
  businessMapsUrl?: string | null;
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
    ${detailRow(" Fecha", date)}
    ${detailRow(" Hora", time)}
    ${detailRow(" Servicio", data.serviceName)}
    ${detailRow(" Profesional", data.staffName)}
    ${detailRow(" Teléfono", data.customerPhone || "No proporcionado")}
  </table>`;
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
  <tr><td style="padding:24px 40px;background:#F9FAFB;border-top:1px solid #E5E7EB;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;">Desarrollado por Puragenda</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function enterpriseDetailsTable(data: BookingEmailData | ReminderEmailData): string {
  const date = formatInTimeZone(data.startTime, BUSINESS_TZ, "EEEE, d 'de' MMMM yyyy", { locale: es });
  const time = `${formatInTimeZone(data.startTime, BUSINESS_TZ, "HH:mm")} - ${formatInTimeZone(data.endTime, BUSINESS_TZ, "HH:mm")}`;
  
  let html = `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;display:table;">`;
  
  const row = (label: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:16px;background:#F9FAFB;font-size:13px;color:#6B7280;font-weight:500;border-bottom:${isLast ? 'none' : '1px solid #E5E7EB'};width:35%;">${label}</td>
      <td style="padding:16px;font-size:14px;color:#111827;font-weight:600;border-bottom:${isLast ? 'none' : '1px solid #E5E7EB'};">${value}</td>
    </tr>
  `;

  html += row("Fecha", date);
  html += row("Hora", time);
  html += row("Servicio", data.serviceName);
  html += row("Profesional", data.staffName, true);
  
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
  return {
    subject: `Reserva confirmada en ${data.businessName}`,
    html: enterpriseLayout("Reserva Confirmada", `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">Su cita ha sido confirmada</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">
        Hola <strong style="color:#111827;">${data.customerName}</strong>, su cita en <strong style="color:#111827;">${data.businessName}</strong> ha sido agendada exitosamente.
      </p>
      ${enterpriseDetailsTable(data)}
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
        Si necesita cancelar o reprogramar su cita, por favor contacte directamente a ${data.businessName}.
      </p>
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

interface ReminderEmailData {
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  businessName: string;
  businessAddress?: string | null;
  businessMapsUrl?: string | null;
  confirmUrl: string;
  cancelUrl: string;
}

/** Email to client the day before their appointment */
export function reminderEmail(data: ReminderEmailData): { subject: string; html: string } {
  const dateStr = formatInTimeZone(data.startTime, BUSINESS_TZ, "EEEE, d 'de' MMMM yyyy", { locale: es });
  const timeStr = formatInTimeZone(data.startTime, BUSINESS_TZ, "HH:mm");
  const timeEnd = formatInTimeZone(data.endTime, BUSINESS_TZ, "HH:mm");

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

interface AppointmentActionEmailData {
  action: "confirmed" | "cancelled";
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  businessName: string;
}

/** Email to business owner when customer confirms or cancels via reminder link */
export function appointmentActionOwnerEmail(data: AppointmentActionEmailData): { subject: string; html: string } {
  const dateStr = formatInTimeZone(data.startTime, BUSINESS_TZ, "EEEE, d 'de' MMMM yyyy", { locale: es });
  const timeStr = formatInTimeZone(data.startTime, BUSINESS_TZ, "HH:mm");
  const timeEnd = formatInTimeZone(data.endTime, BUSINESS_TZ, "HH:mm");

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

