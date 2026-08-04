import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getBusinessHours } from "@/server/services/businessHours.service";
import { prisma } from "@/server/db/prisma";
import { PRICING } from "@/core/constants";
import Link from "next/link";
import { LATEST_CHANGELOG_VERSION } from "@/config/changelog";
import { Key, Link2, Code2, Clock, Store, ImageIcon, MapPin, Crown, CheckCircle2, AlertCircle, CreditCard, Banknote, RefreshCw, Sparkles, Package, CalendarRange } from "lucide-react";
import { CopyButton } from "./copy-button";
import { BusinessHoursEditor } from "./business-hours-editor";
import { BusinessNameEditor } from "./business-name-editor";
import { BusinessLocationEditor } from "./business-location-editor";
import { LogoUploader } from "./logo-uploader";
import { UpgradeButton } from "@/components/dashboard/upgrade-button";
import { MercadoPagoConnect } from "./mercadopago-connect";
import { DepositConfig } from "./deposit-config";
import { BusinessPoliciesEditor } from "./business-policies-editor";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { ProductionOrdersConfig } from "./production-orders-config";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { SecretField } from "@/components/dashboard/secret-field";
import { ScheduleOverridesEditor } from "./schedule-overrides";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ mp_connected?: string; mp_error?: string }> }) {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;
  const business = await getBusinessForUser(user.id);
  if (business && !(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">No tienes permisos para administrar la configuración</div>;
  }
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio configurado aún</div>;

  const [hours, subscription] = await Promise.all([
    getBusinessHours(business.id),
    prisma.subscription.findUnique({ where: { businessId: business.id } }),
  ]);

  const params = await searchParams;
  const mpConnectedSuccess = params.mp_connected === "true";
  const mpError = params.mp_error;

  const isProduction = process.env.NODE_ENV === "production";
  const widgetUrl = isProduction
    ? `https://www.puragenda.cl/widget/${business.slug}`
    : `http://localhost:3000/widget/${business.slug}`;
  const iframeCode = `<iframe src="${widgetUrl}" width="100%" height="700" frameborder="0" style="border-radius: 16px; border: 1px solid #222;"></iframe>`;

  const planName = subscription?.plan === "EQUIPO" ? "Equipo" : "Individual";
  const planPrice = subscription?.plan === "EQUIPO" ? PRICING.EQUIPO.monthly : PRICING.INDIVIDUAL.monthly;
  const isActive = subscription?.status === "ACTIVE";
  const isTrial = subscription?.isTrial ?? false;
  const showUpgrade =
    subscription?.status !== "PAST_DUE" &&
    (!subscription ||
      subscription.plan === "INDIVIDUAL" ||
      (subscription.plan === "EQUIPO" && isTrial));

  const isMpConnected = !!business.mpAccessToken;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">Datos de integración, horarios y pagos del negocio.</p>
      </div>

      {/* ── MP Connection Success/Error banners ── */}
      {mpConnectedSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          ¡Mercado Pago conectado exitosamente!
        </div>
      )}
      {mpError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-400">
          <AlertCircle className="h-5 w-5" />
          {mpError === "denied" && "No se otorgaron los permisos de Mercado Pago."}
          {mpError === "token_exchange" && "Error al intercambiar el código de autorización."}
          {mpError === "invalid_params" && "Parámetros de respuesta inválidos."}
          {mpError === "invalid_state" && "Estado de seguridad inválido."}
          {mpError === "server_config" && "Error de configuración del servidor."}
          {mpError === "no_token" && "No se recibió un token de acceso."}
          {mpError === "unexpected" && "Error inesperado al conectar Mercado Pago."}
        </div>
      )}

      <div className="grid gap-6">
        <Link
          href="/dashboard/changelog"
          className="rounded-2xl border border-[#7C3AED]/20 bg-card p-6 transition-colors hover:bg-muted/40"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-[#7C3AED]" /> Version de la app
              </div>
              <p className="text-sm text-muted-foreground">
                Estas usando Puragenda {LATEST_CHANGELOG_VERSION}. Revisa las novedades de esta version.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-3 py-1 text-sm font-semibold text-[#7C3AED]">
              {LATEST_CHANGELOG_VERSION}
            </span>
          </div>
        </Link>

        {/* ── Plan / Suscripción ── */}
        <div id="plan" className="rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/5 via-card to-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <Crown className="h-4 w-4 text-[#7C3AED]" /> Tu Plan
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Plan {planName}</h3>
                {isActive && !isTrial && (
                  <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Activo
                  </span>
                )}
                {isTrial && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    <AlertCircle className="h-3 w-3" /> Prueba
                  </span>
                )}
                {subscription?.status === "INACTIVE" && (
                  <span className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                    <AlertCircle className="h-3 w-3" /> Inactivo
                  </span>
                )}
                {subscription?.status === "PAST_DUE" && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                    <AlertCircle className="h-3 w-3" /> Pago pendiente
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                ${planPrice.toLocaleString("es-CL")}/mes
                {subscription?.currentPeriodEnd && (
                  <> · Próxima renovación: {new Date(subscription.currentPeriodEnd).toLocaleDateString("es-CL")}</>
                )}
              </p>
            </div>
            {showUpgrade && (
              <div className="w-full sm:w-auto sm:min-w-[220px]">
                <UpgradeButton />
              </div>
            )}
          </div>
        </div>

        {/* ── Mercado Pago Connection ── */}
        <div id="mercadopago" className="rounded-2xl border border-[#009EE3]/20 bg-gradient-to-br from-[#009EE3]/5 via-card to-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <CreditCard className="h-4 w-4 text-[#009EE3]" /> Mercado Pago
          </div>
          <MercadoPagoConnect isConnected={isMpConnected} mpUserId={business.mpUserId} />
        </div>

        {/* ── Deposit / Abono Config ── */}
        <div id="abonos" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <Banknote className="h-4 w-4 text-[#7C3AED]" /> Abonos / Depósitos
          </div>
          <DepositConfig
            initialDepositRequired={business.depositRequired}
            isMpConnected={isMpConnected}
          />
        </div>

        <div id="encargos" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4 text-[#7C3AED]" /> Encargos
          </div>
          <ProductionOrdersConfig initialEnabled={business.productionOrdersEnabled} />
        </div>

        <div id="business-name" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Store className="h-4 w-4 text-[#7C3AED]" /> Nombre del Negocio
          </div>
          <BusinessNameEditor initialName={business.name} />
        </div>

        <div id="business-logo" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <ImageIcon className="h-4 w-4 text-[#7C3AED]" /> Logo del Negocio
          </div>
          <LogoUploader currentLogoUrl={business.logoUrl} />
        </div>

        <div id="business-location" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-[#7C3AED]" /> Ubicación del Negocio
          </div>
          <BusinessLocationEditor initialAddress={business.address} initialMapsUrl={business.mapsUrl} />
        </div>

        <div id="business-hours" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-[#7C3AED]" /> Horario de Atención
          </div>
          <BusinessHoursEditor initialHours={hours.map((h) => ({
            dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen,
            breakStart: h.breakStart, breakEnd: h.breakEnd,
          }))} />
        </div>

        <div id="schedule-overrides" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <CalendarRange className="h-4 w-4 text-[#7C3AED]" /> Horarios por Fecha (Excepciones)
          </div>
          <ScheduleOverridesEditor />
        </div>

        <div id="business-slug" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-[#7C3AED]" /> Slug del Negocio
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 font-mono text-sm">{business.slug}</div>
            <CopyButton text={business.slug} />
          </div>
        </div>

        <div id="business-api" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Key className="h-4 w-4 text-[#7C3AED]" /> API Key
            <span className="rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs text-[#7C3AED]">Secreta</span>
          </div>
          <SecretField value={business.apiKey} label="API Key" />
        </div>

        <div id="business-embed" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Code2 className="h-4 w-4 text-[#7C3AED]" /> Código de Embebido
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1 break-all rounded-xl border border-border bg-muted px-4 py-3 font-mono text-xs leading-relaxed">{iframeCode}</div>
            <CopyButton text={iframeCode} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Agrega <code className="text-foreground/60">?color=HEX</code> para personalizar colores.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="h-4 w-4 text-[#7C3AED]" /> Politicas de Suscripciones
          </div>
          <BusinessPoliciesEditor
            initialAllowRescheduling={business.allowRescheduling}
            initialRescheduleHoursLimit={business.rescheduleHoursLimit}
            initialIncludeAppointmentActionsInConfirmationEmail={business.includeAppointmentActionsInConfirmationEmail}
            initialRequiresClientRut={business.requiresClientRut}
            initialAllowSameDayBookings={business.allowSameDayBookings}
            initialSlotInterval={business.slotInterval}
            initialMinAdvanceBookingMinutes={business.minAdvanceBookingMinutes}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-medium">Previsualización del Widget</h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe src={widgetUrl} width="100%" style={{ border: "none", height: "min(90vh, 700px)" }} />
          </div>
        </div>
      </div>

      <PageTutorial
        tutorialKey="configuracion_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "CONFIGURACIÓN GENERAL",
              description: "Aquí puedes ajustar todos los detalles esenciales de tu negocio y la información de tu cuenta.",
            }
          },
          {
            element: "#plan",
            popover: {
              title: "TU SUSCRIPCIÓN",
              description: "Revisa tu plan actual, la fecha de renovación y cambia de plan si tu negocio necesita crecer.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "#mercadopago",
            popover: {
              title: "PAGOS ONLINE",
              description: "Conecta tu cuenta de Mercado Pago para poder cobrar abonos o el total del servicio cuando un cliente reserve.",
              side: "top",
              align: "start"
            }
          },
          {
            element: "#abonos",
            popover: {
              title: "REGLA DE ABONOS",
              description: "Activa la protección contra inasistencias exigiendo un pago por adelantado obligatorio.",
              side: "top",
              align: "start"
            }
          },
          {
            element: "#business-logo",
            popover: {
              title: "LOGOTIPO",
              description: "Sube el logo de tu marca para que se muestre en tu widget de reservas.",
              side: "top",
              align: "start"
            }
          },
          {
            element: "#business-hours",
            popover: {
              title: "HORARIOS DE APERTURA",
              description: "Define el horario general en el que tu negocio atiende al público.",
              side: "top",
              align: "start"
            }
          },
          {
            element: "#business-slug",
            popover: {
              title: "ENLACE AL WIDGET",
              description: "Este es el link que debes enviar a tus clientes o colocar en tu Instagram para que reserven.",
              side: "top",
              align: "start"
            }
          },
          {
            element: "#business-embed",
            popover: {
              title: "CÓDIGO WEB",
              description: "Si tienes tu propia página web, copia este código HTML para incrustar el calendario directamente allí.",
              side: "top",
              align: "start"
            }
          }
        ]}
      />
    </div>
  );
}
