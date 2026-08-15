
import { LocalizedText } from "@/components/i18n/localized-text";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getBusinessHours } from "@/server/services/businessHours.service";
import { prisma } from "@/server/db/prisma";
import { PRICING } from "@/core/constants";
import Link from "next/link";
import { LATEST_CHANGELOG_VERSION } from "@/config/changelog";
import { Key, Link2, Code2, Clock, Store, ImageIcon, MapPin, Crown, CheckCircle2, AlertCircle, CreditCard, Banknote, RefreshCw, Sparkles, Package, CalendarRange, Globe2 } from "lucide-react";
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
import { BusinessCountryEditor } from "./business-country-editor";
import { LocationsManager } from "./locations-manager";
import {
  getCountryConfig,
  getMercadoPagoCurrency,
  isMercadoPagoCountryCode,
  isMercadoPagoCurrencyCompatible,
} from "@/core/countries";
import { getMercadoPagoOAuthConfig } from "@/server/services/mercadopago-oauth.service";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ mp_connected?: string; mp_error?: string; billing_notice?: string }> }) {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="92MLir4qhMgu" /></div>;
  const business = await getBusinessForUser(user.id);
  if (business && !(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="dCMi1o2zp5QS" /></div>;
  }
  if (!business) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="8rEGoq2nl-vn" /></div>;

  const [hours, subscription, locations, services] = await Promise.all([
    getBusinessHours(business.id),
    prisma.subscription.findUnique({ where: { businessId: business.id } }),
    prisma.businessLocation.findMany({
      where: { businessId: business.id },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: { services: { select: { serviceId: true } }, hours: { orderBy: { dayOfWeek: "asc" } } },
    }),
    prisma.service.findMany({ where: { businessId: business.id }, orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
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
    business.countryCode === "CL" &&
    subscription?.status !== "PAST_DUE" &&
    (!subscription ||
      subscription.plan === "INDIVIDUAL" ||
      (subscription.plan === "EQUIPO" && isTrial));

  const isMpConnected = !!business.mpAccessToken;
  const region = getCountryConfig(business.countryCode);
  const mercadoPagoCurrency = getMercadoPagoCurrency(business.countryCode);
  const isMercadoPagoCurrencyValid = isMercadoPagoCurrencyCompatible(
    business.countryCode,
    business.currencyCode,
  );
  const isMercadoPagoOAuthConfigured = isMercadoPagoCountryCode(business.countryCode)
    ? !!getMercadoPagoOAuthConfig(business.countryCode)
    : false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight"><LocalizedText id="u1BxN-NjE3kV" /></h1>
        <p className="mt-1 text-muted-foreground"><LocalizedText id="M-ZrZLBNmuDs" /></p>
      </div>

      {/* ── MP Connection Success/Error banners ── */}
      {mpConnectedSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <LocalizedText id="jajPc0hanO4D" />
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
          {mpError === "country_changed" && "El país del negocio cambió durante la conexión. Inténtalo nuevamente."}
          {mpError === "account_verification" && "No pudimos verificar el país de la cuenta de Mercado Pago."}
          {mpError === "country_mismatch" && `La cuenta de Mercado Pago no pertenece a ${region.name}.`}
          {mpError === "currency_mismatch" && `La moneda del negocio debe ser ${mercadoPagoCurrency} para conectar Mercado Pago en ${region.name}.`}
          {mpError === "unexpected" && "Error inesperado al conectar Mercado Pago."}
        </div>
      )}
      {params.billing_notice === "international" && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3 text-sm text-amber-400">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span><LocalizedText id="m_X_wElxS5rL" /></span>
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
                <Sparkles className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="0fnZmBU27M9U" />
              </div>
              <p className="text-sm text-muted-foreground">
                <LocalizedText id="bYoyKusUmkuq" /> {LATEST_CHANGELOG_VERSION}<LocalizedText id="9VBN8M4YQ1ci" />
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-3 py-1 text-sm font-semibold text-brand-foreground">
              {LATEST_CHANGELOG_VERSION}
            </span>
          </div>
        </Link>

        {/* ── Plan / Suscripción ── */}
        <div id="plan" className="rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/5 via-card to-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <Crown className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="OlZo-uLCatLm" />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold"><LocalizedText id="-o7Qvavda8sc" /> {planName}</h3>
                {isActive && !isTrial && (
                  <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> <LocalizedText id="cjhYFEvVSC1K" />
                  </span>
                )}
                {isTrial && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    <AlertCircle className="h-3 w-3" /> <LocalizedText id="rD8JHKNBCcVC" />
                  </span>
                )}
                {subscription?.status === "INACTIVE" && (
                  <span className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                    <AlertCircle className="h-3 w-3" /> <LocalizedText id="BkI9GsOm7oh3" />
                  </span>
                )}
                {subscription?.status === "PAST_DUE" && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                    <AlertCircle className="h-3 w-3" /> <LocalizedText id="-q80VQzuGF7x" />
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {business.countryCode === "CL"
                  ? `$${planPrice.toLocaleString("es-CL")} CLP/mes`
                  : subscription?.plan === "EQUIPO" ? "USD 32,99/mes base" : "USD 13,99/mes base"}
                {subscription?.currentPeriodEnd && (
                  <> <LocalizedText id="U34Bfej7YVY-" /> {new Date(subscription.currentPeriodEnd).toLocaleDateString("es-CL")}</>
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
          <MercadoPagoConnect
            isConnected={isMpConnected}
            mpUserId={business.mpUserId}
            countryName={region.name}
            currencyCode={business.currencyCode}
            mercadoPagoCurrency={mercadoPagoCurrency}
            isCurrencyCompatible={isMercadoPagoCurrencyValid}
            isOAuthConfigured={isMercadoPagoOAuthConfigured}
          />
        </div>

        {/* ── Deposit / Abono Config ── */}
        <div id="abonos" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <Banknote className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="HraE--oj_ANc" />
          </div>
          <DepositConfig
            initialDepositRequired={business.depositRequired}
            isMpConnected={isMpConnected && isMercadoPagoCurrencyValid}
          />
        </div>

        <div id="encargos" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="FPmh86BAXjU5" />
          </div>
          <ProductionOrdersConfig initialEnabled={business.productionOrdersEnabled} />
        </div>

        <div id="business-name" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Store className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="FW2JHoThaqiE" />
          </div>
          <BusinessNameEditor initialName={business.name} />
        </div>

        <div id="business-country" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Globe2 className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="AzILVqHZj-3Z" />
          </div>
          <BusinessCountryEditor
            initialCountryCode={business.countryCode}
            initialTimezone={business.timezone}
            initialCurrencyCode={business.currencyCode}
          />
        </div>

        <div id="business-logo" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <ImageIcon className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="TBHo5ixeBXEe" />
          </div>
          <LogoUploader currentLogoUrl={business.logoUrl} />
        </div>

        <div id="business-location" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="BU7iT1K1Hdbc" />
          </div>
          <BusinessLocationEditor initialAddress={business.address} initialMapsUrl={business.mapsUrl} />
        </div>

        <div id="business-locations" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="n0PHfrlQk39K" />
          </div>
          <LocationsManager
            locations={locations.map((location) => ({ ...location, serviceIds: location.services.map((service) => service.serviceId) }))}
            services={services}
            defaultTimezone={business.timezone}
            countryCode={business.countryCode}
          />
        </div>

        <div id="business-hours" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="0oqN3_JG9XpQ" />
          </div>
          <BusinessHoursEditor
            initialHours={hours.map((h) => ({ dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen, breakStart: h.breakStart, breakEnd: h.breakEnd }))}
            locations={locations.filter((location) => location.isActive).map((location) => ({
              id: location.id,
              name: location.name,
              hours: location.hours.map((hour) => ({ dayOfWeek: hour.dayOfWeek, startTime: hour.startTime, endTime: hour.endTime, isOpen: hour.isOpen, breakStart: hour.breakStart, breakEnd: hour.breakEnd })),
            }))}
          />
        </div>

        <div id="schedule-overrides" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <CalendarRange className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="1cGLUQ-u54FK" />
          </div>
          <ScheduleOverridesEditor locations={locations.filter((location) => location.isActive).map((location) => ({ id: location.id, name: location.name }))} />
        </div>

        <div id="business-slug" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="eucIRMJoFPm0" />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 font-mono text-sm">{business.slug}</div>
            <CopyButton text={business.slug} />
          </div>
        </div>

        <div id="business-api" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Key className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="IxidVfaXPyzl" />
            <span className="rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs text-brand-foreground"><LocalizedText id="muJBmzNYAb4r" /></span>
          </div>
          <SecretField value={business.apiKey} label="API Key" />
        </div>

        <div id="business-embed" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Code2 className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="r6FidjgC5-92" />
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1 break-all rounded-xl border border-border bg-muted px-4 py-3 font-mono text-xs leading-relaxed">{iframeCode}</div>
            <CopyButton text={iframeCode} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <LocalizedText id="VYJmunMHtf6W" /> <code className="text-foreground/60">?color=HEX</code> <LocalizedText id="ppDW_x87C6_q" />
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="h-4 w-4 text-brand-foreground" /> <LocalizedText id="VUmrpDXFPPHt" />
          </div>
          <BusinessPoliciesEditor
            initialAllowRescheduling={business.allowRescheduling}
            initialRescheduleHoursLimit={business.rescheduleHoursLimit}
            initialIncludeAppointmentActionsInConfirmationEmail={business.includeAppointmentActionsInConfirmationEmail}
            initialRequiresClientRut={business.requiresClientRut}
            initialAllowSameDayBookings={business.allowSameDayBookings}
            initialSlotInterval={business.slotInterval}
            initialMinAdvanceBookingMinutes={business.minAdvanceBookingMinutes}
            taxIdLabel={region.taxIdLabel}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-medium"><LocalizedText id="j9W53ydqvfcK" /></h3>
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
